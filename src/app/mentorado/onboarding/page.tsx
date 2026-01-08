'use client'

import { useEffect, useState } from 'react'
import { MentoradoAuthProvider, useMentoradoAuth } from '@/contexts/mentorado-auth'
import { ModernMindMap } from '@/components/modern-mind-map'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Brain, User, Loader2 } from 'lucide-react'
import Link from 'next/link'

function MentoradoOnboardingContent() {
  const { mentorado, loading: authLoading, error } = useMentoradoAuth()
  const [loading, setLoading] = useState(false)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-white" />
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
            <h2 className="text-2xl font-bold mb-4">
              {!mentorado ? 'Faça login para acessar' : 'Dados não encontrados'}
            </h2>
            <p className="text-white/70 mb-6">
              {!mentorado
                ? 'Você precisa estar logado como mentorado para acessar o onboarding.'
                : (error || 'Não foi possível encontrar seus dados de mentorado.')
              }
            </p>
            <Link href="/mentorado">
              <Button variant="outline" className="text-white border-white/30 hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {!mentorado ? 'Ir para Login' : 'Voltar ao Portal'}
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

export default function MentoradoOnboardingPage() {
  return (
    <MentoradoAuthProvider>
      <MentoradoOnboardingContent />
    </MentoradoAuthProvider>
  )
}