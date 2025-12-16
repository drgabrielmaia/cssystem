'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Instagram,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Users,
  TrendingUp,
  Calendar,
  Image as ImageIcon,
  Video,
  BarChart3,
  Settings,
  Plus,
  Eye,
  ThumbsUp
} from 'lucide-react'

interface InstagramPost {
  id: string
  caption: string
  imageUrl?: string
  scheduledDate?: Date
  status: 'draft' | 'scheduled' | 'published'
  likes: number
  comments: number
  reach: number
}

interface InstagramMetrics {
  followers: number
  following: number
  posts: number
  engagement: number
  reach: number
  impressions: number
}

export default function InstagramPage() {
  const [posts, setPosts] = useState<InstagramPost[]>([
    {
      id: '1',
      caption: 'Transforme seus leads em vendas com nossa estratégia comprovada! 🚀\n\n#marketing #vendas #leads',
      status: 'published',
      likes: 124,
      comments: 18,
      reach: 2856,
      scheduledDate: new Date('2024-01-15')
    },
    {
      id: '2',
      caption: 'Dica do dia: A persistência é a chave do sucesso em vendas! 💪\n\n#motivacao #vendas #sucesso',
      status: 'scheduled',
      likes: 0,
      comments: 0,
      reach: 0,
      scheduledDate: new Date('2024-01-20')
    }
  ])

  const [metrics] = useState<InstagramMetrics>({
    followers: 5420,
    following: 1203,
    posts: 156,
    engagement: 3.8,
    reach: 12450,
    impressions: 18720
  })

  const [newPost, setNewPost] = useState({
    caption: '',
    scheduledDate: ''
  })

  const handleCreatePost = () => {
    if (!newPost.caption) return

    const post: InstagramPost = {
      id: Date.now().toString(),
      caption: newPost.caption,
      status: newPost.scheduledDate ? 'scheduled' : 'draft',
      likes: 0,
      comments: 0,
      reach: 0,
      scheduledDate: newPost.scheduledDate ? new Date(newPost.scheduledDate) : undefined
    }

    setPosts(prev => [post, ...prev])
    setNewPost({ caption: '', scheduledDate: '' })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#FFD700] shadow-lg">
            <Instagram className="h-6 w-6 text-gray-900" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Instagram Marketing</h1>
            <p className="text-gray-400">Gerencie sua presença no Instagram</p>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700 hover:border-[#D4AF37]/30 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Seguidores</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">{metrics.followers.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500">+2.5%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-[#D4AF37]/30 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Engajamento</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">{metrics.engagement}%</p>
                </div>
                <Heart className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500">+0.3%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-[#D4AF37]/30 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Alcance</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">{metrics.reach.toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500">+8.2%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-[#D4AF37]/30 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Posts</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">{metrics.posts}</p>
                </div>
                <ImageIcon className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <div className="flex items-center mt-2">
                <Plus className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-500">3 este mês</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create New Post */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-[#D4AF37]" />
                  Criar Post
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Crie e agende novos posts para o Instagram
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="caption" className="text-gray-300">Legenda</Label>
                  <Textarea
                    id="caption"
                    placeholder="Escreva a legenda do seu post..."
                    value={newPost.caption}
                    onChange={(e) => setNewPost(prev => ({ ...prev, caption: e.target.value }))}
                    className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="scheduledDate" className="text-gray-300">Agendar para (opcional)</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={newPost.scheduledDate}
                    onChange={(e) => setNewPost(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="mt-1 bg-gray-700 border-gray-600 text-white focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                </div>

                <Button
                  onClick={handleCreatePost}
                  className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-gray-900 font-semibold hover:from-[#B8860B] hover:to-[#D4AF37] transition-all duration-200"
                >
                  {newPost.scheduledDate ? 'Agendar Post' : 'Salvar Rascunho'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Posts List */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Instagram className="h-5 w-5 mr-2 text-[#D4AF37]" />
                  Posts Recentes
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Gerencie seus posts publicados e agendados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-[#D4AF37]/30 transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-white text-sm whitespace-pre-line">{post.caption}</p>
                        </div>
                        <Badge
                          className={`ml-3 ${
                            post.status === 'published' ? 'bg-green-900 text-green-300' :
                            post.status === 'scheduled' ? 'bg-blue-900 text-blue-300' :
                            'bg-gray-600 text-gray-300'
                          }`}
                        >
                          {post.status === 'published' ? 'Publicado' :
                           post.status === 'scheduled' ? 'Agendado' : 'Rascunho'}
                        </Badge>
                      </div>

                      {post.scheduledDate && (
                        <div className="flex items-center text-xs text-gray-400 mb-3">
                          <Calendar className="h-3 w-3 mr-1" />
                          {post.status === 'scheduled' ? 'Agendado para: ' : 'Publicado em: '}
                          {post.scheduledDate.toLocaleDateString('pt-BR')}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4 text-gray-400">
                          <div className="flex items-center">
                            <Heart className="h-4 w-4 mr-1 text-red-500" />
                            {post.likes}
                          </div>
                          <div className="flex items-center">
                            <MessageCircle className="h-4 w-4 mr-1 text-blue-500" />
                            {post.comments}
                          </div>
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1 text-[#D4AF37]" />
                            {post.reach}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-600">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analytics Section */}
        <Card className="mt-8 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-[#D4AF37]" />
              Analytics do Instagram
            </CardTitle>
            <CardDescription className="text-gray-400">
              Acompanhe o desempenho das suas publicações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-[#D4AF37]" />
              <p>Gráficos de analytics em desenvolvimento</p>
              <p className="text-sm">Em breve você poderá ver métricas detalhadas aqui</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}