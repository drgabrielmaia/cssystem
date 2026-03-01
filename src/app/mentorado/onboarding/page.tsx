'use client'

import { useEffect, useState } from 'react'
import { MentoradoAuthProvider, useMentoradoAuth } from '@/contexts/mentorado-auth'
import { ModernMindMap } from '@/components/modern-mind-map'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Brain, User, Loader2 } from 'lucide-react'
import Link from 'next/link'

function MentoradoOnboardingContent() {
  const { mentorado, loading: authLoading, error } = useMentoradoAuth()

  if (authLoading) {
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
    <ModernMindMap
      mentorado={mentorado}
      mode="mentorado"
      isSharedView={false}
    />
  )
}

export default function MentoradoOnboardingPage() {
  return (
    <MentoradoAuthProvider>
      <MentoradoOnboardingContent />
    </MentoradoAuthProvider>
  )
}
