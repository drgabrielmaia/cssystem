'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Plus, Heart, Flame, Zap, MessageCircle, Send, Image,
  X, Loader2, Camera, ArrowLeft, Shield, User, Clock, MoreHorizontal
} from 'lucide-react'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'
import { supabase } from '@/lib/supabase'
import { isBetaUser } from '@/lib/beta-access'
import Link from 'next/link'
import { toast } from 'sonner'

const ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b'

interface Post {
  id: string
  mentorado_id: string
  tipo: 'post' | 'story'
  conteudo?: string
  imagem_url?: string
  created_at: string
  expires_at?: string
  author_nome?: string
  author_avatar?: string
  reactions: { like: number; love: number; fire: number }
  myReaction?: string
  comment_count: number
}

interface Comment {
  id: string
  post_id: string
  mentorado_id: string
  conteudo: string
  created_at: string
  author_nome?: string
  author_avatar?: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export default function ComunidadePage() {
  const { mentorado } = useMentoradoAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [storyProgress, setStoryProgress] = useState(0)

  // Create form
  const [newContent, setNewContent] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Comments
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({})
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({})

  // Mentorado names cache
  const [namesCache, setNamesCache] = useState<Record<string, { nome: string; avatar?: string }>>({})

  useEffect(() => {
    if (mentorado && isBetaUser(mentorado.email)) {
      loadData()
    }
  }, [mentorado])

  // Story auto-advance
  useEffect(() => {
    if (!showStoryViewer || stories.length === 0) return
    setStoryProgress(0)

    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(i => i + 1)
            return 0
          } else {
            setShowStoryViewer(false)
            return 0
          }
        }
        return prev + 2 // 50 steps * 100ms = 5 seconds
      })
    }, 100)

    return () => clearInterval(interval)
  }, [showStoryViewer, currentStoryIndex, stories.length])

  const getMentoradoInfo = async (id: string) => {
    if (namesCache[id]) return namesCache[id]
    const { data } = await supabase
      .from('mentorados')
      .select('nome_completo, avatar_url')
      .eq('id', id)
      .single()
    const info = { nome: data?.nome_completo || 'Anonimo', avatar: data?.avatar_url }
    setNamesCache(prev => ({ ...prev, [id]: info }))
    return info
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Load posts
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('*')
        .eq('tipo', 'post')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
        .limit(50)

      // Load stories (not expired)
      const { data: storiesData } = await supabase
        .from('community_posts')
        .select('*')
        .eq('tipo', 'story')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })

      // Filter stories client-side (expires_at > now)
      const now = new Date()
      const activeStories = (storiesData || []).filter(s =>
        s.expires_at && new Date(s.expires_at) > now
      )

      // Load reactions for all posts
      const allPostIds = [...(postsData || []), ...activeStories].map(p => p.id)

      let reactionsMap: Record<string, { like: number; love: number; fire: number }> = {}
      let myReactionsMap: Record<string, string> = {}

      if (allPostIds.length > 0) {
        const { data: reactions } = await supabase
          .from('community_reactions')
          .select('*')
          .in('post_id', allPostIds)

        if (reactions) {
          for (const r of reactions) {
            if (!reactionsMap[r.post_id]) reactionsMap[r.post_id] = { like: 0, love: 0, fire: 0 }
            if (r.tipo === 'like') reactionsMap[r.post_id].like++
            else if (r.tipo === 'love') reactionsMap[r.post_id].love++
            else if (r.tipo === 'fire') reactionsMap[r.post_id].fire++

            if (r.mentorado_id === mentorado?.id) {
              myReactionsMap[r.post_id] = r.tipo
            }
          }
        }

        // Comment counts
        const { data: comments } = await supabase
          .from('community_comments')
          .select('post_id')
          .in('post_id', allPostIds)

        var commentCounts: Record<string, number> = {}
        if (comments) {
          for (const c of comments) {
            commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1
          }
        }
      }

      // Load author names
      const authorIds = [...new Set([...(postsData || []), ...activeStories].map(p => p.mentorado_id))]
      for (const aid of authorIds) {
        await getMentoradoInfo(aid)
      }

      const mapPost = (p: any): Post => ({
        ...p,
        author_nome: namesCache[p.mentorado_id]?.nome,
        author_avatar: namesCache[p.mentorado_id]?.avatar,
        reactions: reactionsMap[p.id] || { like: 0, love: 0, fire: 0 },
        myReaction: myReactionsMap[p.id],
        comment_count: commentCounts?.[p.id] || 0,
      })

      setPosts((postsData || []).map(mapPost))
      setStories(activeStories.map(mapPost))
    } catch (err) {
      console.error('Erro ao carregar comunidade:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'
      const resp = await fetch(`${apiUrl}/api/upload`, { method: 'POST', body: formData })
      const result = await resp.json()
      if (result.success) return result.url
      return null
    } catch {
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!mentorado || (!newContent.trim() && !newImageUrl)) return
    setSubmitting(true)
    try {
      await supabase.from('community_posts').insert({
        mentorado_id: mentorado.id,
        organization_id: ORG_ID,
        tipo: 'post',
        conteudo: newContent.trim(),
        imagem_url: newImageUrl || null,
      })
      setShowCreatePost(false)
      setNewContent('')
      setNewImageUrl('')
      toast.success('Post publicado!')
      loadData()
    } catch (err) {
      toast.error('Erro ao publicar post')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateStory = async () => {
    if (!mentorado || !newImageUrl) return
    setSubmitting(true)
    try {
      await supabase.from('community_posts').insert({
        mentorado_id: mentorado.id,
        organization_id: ORG_ID,
        tipo: 'story',
        conteudo: newContent.trim() || null,
        imagem_url: newImageUrl,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      setShowCreateStory(false)
      setNewContent('')
      setNewImageUrl('')
      toast.success('Story publicado!')
      loadData()
    } catch {
      toast.error('Erro ao publicar story')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReaction = async (postId: string, tipo: string) => {
    if (!mentorado) return
    try {
      // Check if already reacted
      const { data: existing } = await supabase
        .from('community_reactions')
        .select('id, tipo')
        .eq('post_id', postId)
        .eq('mentorado_id', mentorado.id)

      if (existing && existing.length > 0) {
        if (existing[0].tipo === tipo) {
          // Remove reaction
          await supabase.from('community_reactions').delete().eq('id', existing[0].id)
        } else {
          // Update reaction type
          await supabase.from('community_reactions').update({ tipo }).eq('id', existing[0].id)
        }
      } else {
        // New reaction
        await supabase.from('community_reactions').insert({
          post_id: postId,
          mentorado_id: mentorado.id,
          tipo,
        })
      }
      loadData()
    } catch (err) {
      console.error('Erro na reacao:', err)
    }
  }

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (data) {
      for (const c of data) {
        await getMentoradoInfo(c.mentorado_id)
      }
      setCommentsMap(prev => ({
        ...prev,
        [postId]: data.map(c => ({
          ...c,
          author_nome: namesCache[c.mentorado_id]?.nome,
          author_avatar: namesCache[c.mentorado_id]?.avatar,
        }))
      }))
    }
  }

  const toggleComments = async (postId: string) => {
    const next = new Set(expandedComments)
    if (next.has(postId)) {
      next.delete(postId)
    } else {
      next.add(postId)
      if (!commentsMap[postId]) await loadComments(postId)
    }
    setExpandedComments(next)
  }

  const handleAddComment = async (postId: string) => {
    const text = newCommentText[postId]?.trim()
    if (!text || !mentorado) return

    try {
      await supabase.from('community_comments').insert({
        post_id: postId,
        mentorado_id: mentorado.id,
        conteudo: text,
      })
      setNewCommentText(prev => ({ ...prev, [postId]: '' }))
      await loadComments(postId)
      // Update comment count
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
      toast.success('Comentario adicionado')
    } catch {
      toast.error('Erro ao comentar')
    }
  }

  const Avatar = ({ url, nome, size = 'md' }: { url?: string; nome?: string; size?: 'sm' | 'md' | 'lg' }) => {
    const s = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-lg' : 'w-10 h-10 text-sm'
    if (url) return <img src={url} alt="" className={`${s} rounded-full object-cover`} />
    const initials = (nome || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    return (
      <div className={`${s} rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold`}>
        {initials}
      </div>
    )
  }

  // Beta check
  if (mentorado && !isBetaUser(mentorado.email)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 max-w-md w-full text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-amber-400/50" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-white/50 mb-6">A comunidade esta em fase beta.</p>
          <Link href="/mentorado">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Portal
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/mentorado" className="text-white/40 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-white">Comunidade</h1>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Beta</Badge>
          </div>
          <Button
            onClick={() => setShowCreatePost(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Post
          </Button>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Stories Bar */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* Create Story */}
            <button
              onClick={() => setShowCreateStory(true)}
              className="flex-shrink-0 flex flex-col items-center gap-1"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-500/40 flex items-center justify-center bg-emerald-500/5">
                <Plus className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-[10px] text-white/40">Seu Story</span>
            </button>

            {/* Active Stories */}
            {stories.map((story, idx) => (
              <button
                key={story.id}
                onClick={() => { setCurrentStoryIndex(idx); setShowStoryViewer(true) }}
                className="flex-shrink-0 flex flex-col items-center gap-1"
              >
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-emerald-400 to-teal-500">
                  {story.imagem_url ? (
                    <img src={story.imagem_url} alt="" className="w-full h-full rounded-full object-cover border-2 border-[#0a0a0a]" />
                  ) : (
                    <Avatar url={story.author_avatar || namesCache[story.mentorado_id]?.avatar} nome={story.author_nome || namesCache[story.mentorado_id]?.nome} size="lg" />
                  )}
                </div>
                <span className="text-[10px] text-white/50 max-w-[64px] truncate">
                  {(story.author_nome || namesCache[story.mentorado_id]?.nome || '').split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="divide-y divide-white/5">
          {posts.length === 0 && (
            <div className="py-20 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-white/10" />
              <p className="text-white/30">Nenhum post ainda. Seja o primeiro!</p>
            </div>
          )}

          {posts.map((post) => (
            <div key={post.id} className="px-4 py-4">
              {/* Author */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar
                  url={post.author_avatar || namesCache[post.mentorado_id]?.avatar}
                  nome={post.author_nome || namesCache[post.mentorado_id]?.nome}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {(post.author_nome || namesCache[post.mentorado_id]?.nome || 'Anonimo').split(' ').slice(0, 2).join(' ')}
                  </p>
                  <p className="text-xs text-white/30">{timeAgo(post.created_at)}</p>
                </div>
              </div>

              {/* Content */}
              {post.conteudo && (
                <p className="text-sm text-white/80 mb-3 whitespace-pre-wrap">{post.conteudo}</p>
              )}

              {/* Image */}
              {post.imagem_url && (
                <div className="rounded-xl overflow-hidden mb-3">
                  <img src={post.imagem_url} alt="" className="w-full max-h-[500px] object-cover" />
                </div>
              )}

              {/* Reactions */}
              <div className="flex items-center gap-1 mb-2">
                <button
                  onClick={() => handleReaction(post.id, 'like')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                    post.myReaction === 'like'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${post.myReaction === 'like' ? 'fill-rose-400' : ''}`} />
                  {post.reactions.like > 0 && post.reactions.like}
                </button>
                <button
                  onClick={() => handleReaction(post.id, 'fire')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                    post.myReaction === 'fire'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  {post.reactions.fire > 0 && post.reactions.fire}
                </button>
                <button
                  onClick={() => handleReaction(post.id, 'love')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                    post.myReaction === 'love'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {post.reactions.love > 0 && post.reactions.love}
                </button>

                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-white/5 text-white/40 hover:bg-white/10 ml-auto"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {post.comment_count > 0 && post.comment_count}
                </button>
              </div>

              {/* Comments */}
              {expandedComments.has(post.id) && (
                <div className="mt-3 pl-4 border-l-2 border-white/5 space-y-3">
                  {(commentsMap[post.id] || []).map(c => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar
                        url={c.author_avatar || namesCache[c.mentorado_id]?.avatar}
                        nome={c.author_nome || namesCache[c.mentorado_id]?.nome}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs">
                          <span className="font-semibold text-white/70">
                            {(c.author_nome || namesCache[c.mentorado_id]?.nome || '').split(' ')[0]}
                          </span>
                          <span className="text-white/30 ml-2">{timeAgo(c.created_at)}</span>
                        </p>
                        <p className="text-sm text-white/60">{c.conteudo}</p>
                      </div>
                    </div>
                  ))}

                  {/* Add comment */}
                  <div className="flex gap-2">
                    <Input
                      value={newCommentText[post.id] || ''}
                      onChange={(e) => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Escreva um comentario..."
                      className="bg-white/5 border-white/10 text-white text-sm h-9 placeholder:text-white/20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id)
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddComment(post.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Story Viewer */}
      {showStoryViewer && stories[currentStoryIndex] && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setShowStoryViewer(false)}>
          {/* Progress bar */}
          <div className="absolute top-2 left-4 right-4 flex gap-1">
            {stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-100"
                  style={{
                    width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? `${storyProgress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author */}
          <div className="absolute top-6 left-4 flex items-center gap-2">
            <Avatar
              url={stories[currentStoryIndex].author_avatar || namesCache[stories[currentStoryIndex].mentorado_id]?.avatar}
              nome={stories[currentStoryIndex].author_nome || namesCache[stories[currentStoryIndex].mentorado_id]?.nome}
              size="sm"
            />
            <span className="text-white text-sm font-medium">
              {(stories[currentStoryIndex].author_nome || namesCache[stories[currentStoryIndex].mentorado_id]?.nome || '').split(' ')[0]}
            </span>
            <span className="text-white/40 text-xs">{timeAgo(stories[currentStoryIndex].created_at)}</span>
          </div>

          <button onClick={() => setShowStoryViewer(false)} className="absolute top-6 right-4 text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>

          {/* Story Image */}
          {stories[currentStoryIndex].imagem_url && (
            <img
              src={stories[currentStoryIndex].imagem_url}
              alt=""
              className="max-h-[80vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Story Text */}
          {stories[currentStoryIndex].conteudo && (
            <div className="absolute bottom-12 left-4 right-4">
              <p className="text-white text-center text-lg font-medium drop-shadow-lg">
                {stories[currentStoryIndex].conteudo}
              </p>
            </div>
          )}

          {/* Nav arrows */}
          {currentStoryIndex > 0 && (
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-full"
              onClick={(e) => { e.stopPropagation(); setCurrentStoryIndex(i => i - 1) }}
            />
          )}
          {currentStoryIndex < stories.length - 1 && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-full"
              onClick={(e) => { e.stopPropagation(); setCurrentStoryIndex(i => i + 1) }}
            />
          )}
        </div>
      )}

      {/* Create Post Dialog */}
      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="O que voce esta pensando?"
              className="bg-white/5 border-white/10 text-white min-h-[120px] placeholder:text-white/20"
            />

            {newImageUrl && (
              <div className="relative">
                <img src={newImageUrl} alt="" className="w-full max-h-48 object-cover rounded-lg" />
                <button onClick={() => setNewImageUrl('')} className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 text-sm text-white/50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = await handleUpload(file)
                      if (url) setNewImageUrl(url)
                    }
                  }}
                />
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                Foto
              </label>
            </div>

            <Button
              onClick={handleCreatePost}
              disabled={(!newContent.trim() && !newImageUrl) || submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Publicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Story Dialog */}
      <Dialog open={showCreateStory} onOpenChange={setShowCreateStory}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-white/30">Stories desaparecem automaticamente em 24 horas</p>

            {newImageUrl ? (
              <div className="relative">
                <img src={newImageUrl} alt="" className="w-full max-h-64 object-cover rounded-xl" />
                <button onClick={() => setNewImageUrl('')} className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-emerald-500/30 hover:bg-white/[0.02] transition-all">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = await handleUpload(file)
                      if (url) setNewImageUrl(url)
                    }
                  }}
                />
                {uploading ? (
                  <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-10 h-10 text-white/20 mb-2" />
                    <span className="text-sm text-white/30">Escolha uma foto</span>
                  </>
                )}
              </label>
            )}

            <Input
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Legenda (opcional)"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />

            <Button
              onClick={handleCreateStory}
              disabled={!newImageUrl || submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
              Publicar Story
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
