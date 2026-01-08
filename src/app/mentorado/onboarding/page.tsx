'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { supabase, type Mentorado } from '@/lib/supabase'
import { ModernMindMap } from '@/components/modern-mind-map'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Brain, User } from 'lucide-react'
import Link from 'next/link'

export default function MentoradoOnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const [mentorado, setMentorado] = useState<Mentorado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      fetchMentoradoData()
    } else if (!authLoading && !user) {
      setError('Usuário não autenticado')
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchMentoradoData = async () => {
    if (!user?.email) return

    try {
      setLoading(true)

      // Buscar dados do mentorado pelo email do usuário
      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .eq('email', user.email)
        .single()

      if (error) {
        console.error('Erro ao buscar mentorado:', error)
        setError('Dados do mentorado não encontrados')
        return
      }

      setMentorado(data)
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      setError('Erro ao carregar dados do mentorado')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg">Carregando seu mapa mental...</div>
        </div>
      </div>
    )
  }

  if (error || !mentorado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 max-w-md mx-4">
          <div className="text-center text-white">
            <User className="h-16 w-16 mx-auto mb-4 text-white/60" />
            <h2 className="text-2xl font-bold mb-4">Dados não encontrados</h2>
            <p className="text-white/70 mb-6">
              {error || 'Não foi possível encontrar seus dados de mentorado.'}
            </p>
            <p className="text-white/60 text-sm mb-6">
              Entre em contato com seu mentor para verificar seu cadastro.
            </p>
            <Link href="/mentorado">
              <Button variant="outline" className="text-white border-white/30 hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Portal
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header com informações do mentorado */}
      <div className="bg-gradient-to-r from-slate-800 to-purple-800 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/mentorado">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Portal
                </Button>
              </Link>

              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold">Mapa Mental</h1>
                <p className="text-white/70">
                  Visualize e organize suas metas e objetivos
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-semibold">
                {mentorado.nome_completo}
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {mentorado.estado_atual || 'Em progresso'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Mapa Mental em tela cheia */}
      <div className="relative">
        <div className="bg-gradient-to-br from-slate-50 to-white min-h-[calc(100vh-120px)]">
          <ModernMindMap
            mentorado={mentorado}
            isSharedView={false}
          />
        </div>

        {/* Instruções de uso (mobile-friendly) */}
        <div className="absolute top-4 right-4 z-10">
          <Card className="p-4 bg-white/95 backdrop-blur-sm border-gray-200 max-w-xs">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Como usar:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <span className="font-medium">Duplo clique:</span> editar texto</li>
              <li>• <span className="font-medium">Arrastar:</span> mover nós</li>
              <li>• <span className="font-medium">Auto-salvo:</span> mudanças são salvas</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}