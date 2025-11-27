'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { Header } from '@/components/header'
import { supabase, type Mentorado } from '@/lib/supabase'
import { ModernMindMap } from '@/components/modern-mind-map'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Share2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SharedMindMapPage() {
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const mentoradoId = params.id as string
  const [mentorado, setMentorado] = useState<Mentorado | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (mentoradoId) {
      fetchMentorado()
    }
  }, [mentoradoId])

  const fetchMentorado = async () => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .eq('id', mentoradoId)
        .single()

      if (error) throw error
      setMentorado(data)
    } catch (error) {
      console.error('Erro ao buscar mentorado:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Mapa Mental - ${mentorado?.nome_completo}`,
          text: 'Confira o mapa mental de desenvolvimento pessoal',
          url: url,
        })
      } catch (error) {
        // Fallback to copy to clipboard
        navigator.clipboard.writeText(url)
        alert('Link copiado para a área de transferência!')
      }
    } else {
      // Fallback to copy to clipboard
      navigator.clipboard.writeText(url)
      alert('Link copiado para a área de transferência!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Carregando mapa mental...</div>
      </div>
    )
  }

  if (!mentorado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Mapa Mental não encontrado</h2>
            <p className="text-white/70 mb-6">O mentorado solicitado não foi encontrado.</p>
            <Link href="/onboarding">
              <Button variant="outline" className="text-white border-white/30 hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Onboarding
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white overflow-hidden">
      {/* Mind Map - Tela Cheia */}
      <ModernMindMap
        mentorado={mentorado}
        isSharedView={!user}
        onShare={handleShare}
      />
    </div>
  )
}