'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck, Mail, Eye, EyeOff, LogIn, Play, BookOpen, DollarSign, TrendingUp, Target, Trophy, Brain, Star } from 'lucide-react'
import { MentoradoAuthProvider, useMentoradoAuth } from '@/contexts/mentorado-auth'
import Link from 'next/link'

function MentoradoPageContent() {
  const { mentorado, loading: authLoading, error, signIn, signOut } = useMentoradoAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const success = await signIn(email, password)

    if (!success && error) {
      alert(error)
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut()
    setEmail('')
    setPassword('')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!mentorado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Portal do Mentorado</CardTitle>
            <CardDescription>
              Acesse suas aulas e módulos de aprendizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Sua senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
                <LogIn className="h-4 w-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-semibold text-[#1A1A1A] mb-2">
            Olá, {mentorado?.nome_completo?.split(' ')[0]}!
          </h1>
          <p className="text-[15px] text-[#6B7280]">
            Continue seu aprendizado de onde parou
          </p>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
        >
          Sair
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progresso */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-2">Seu Progresso</p>
              <div className="flex items-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#E879F9] flex items-center justify-center bg-white">
                  <span className="text-[18px] font-bold text-[#1A1A1A]">0%</span>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 bg-[#E879F9] rounded-[12px] flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Módulos */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-2">Módulos</p>
              <p className="text-[28px] font-bold text-[#1A1A1A]">3</p>
            </div>
            <div className="w-12 h-12 bg-[#1A1A1A] rounded-[12px] flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Comissões */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-2">Comissões</p>
              <p className="text-[18px] font-bold text-[#1A1A1A]">R$ 0,00</p>
            </div>
            <div className="w-12 h-12 bg-[#22C55E] rounded-[12px] flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Seção Principal - Vídeo Aula */}
      <div className="bg-[#F3F3F5] rounded-[24px] p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-[#1A1A1A]">
            Continue assistindo
          </h2>
          <Link
            href="/mentorado/videos"
            className="text-[14px] text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
          >
            Ver todos
          </Link>
        </div>

        {/* Placeholder para Vídeo */}
        <div className="bg-[#1A1A1A] rounded-[20px] aspect-video mb-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
            <p className="text-white text-[15px]">
              Próxima aula disponível
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-medium text-[#1A1A1A] mb-1">
              Assistir próxima aula
            </h3>
            <p className="text-[14px] text-[#6B7280]">
              Continue seu progresso de aprendizado
            </p>
          </div>
          <Link
            href="/mentorado/videos"
            className="bg-[#1A1A1A] text-white px-6 py-3 rounded-full text-[14px] font-medium hover:bg-opacity-90 transition-all"
          >
            Assistir agora
          </Link>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <h3 className="text-[16px] font-medium text-[#1A1A1A] mb-4">
            Acesso Rápido
          </h3>
          <div className="space-y-3">
            <Link
              href="/mentorado/videos"
              className="flex items-center justify-between p-3 bg-white rounded-[12px] hover:bg-opacity-80 transition-colors group"
            >
              <div className="flex items-center">
                <Play className="w-5 h-5 text-[#6B7280] mr-3" />
                <span className="text-[14px] text-[#1A1A1A]">Minhas Aulas</span>
              </div>
              <span className="text-[12px] text-[#6B7280] group-hover:text-[#1A1A1A] transition-colors">
                →
              </span>
            </Link>

            <Link
              href="/mentorado/comissoes"
              className="flex items-center justify-between p-3 bg-white rounded-[12px] hover:bg-opacity-80 transition-colors group"
            >
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-[#6B7280] mr-3" />
                <span className="text-[14px] text-[#1A1A1A]">Ver Comissões</span>
              </div>
              <span className="text-[12px] text-[#6B7280] group-hover:text-[#1A1A1A] transition-colors">
                →
              </span>
            </Link>

            <Link
              href="/mentorado/metas"
              className="flex items-center justify-between p-3 bg-white rounded-[12px] hover:bg-opacity-80 transition-colors group"
            >
              <div className="flex items-center">
                <Target className="w-5 h-5 text-[#6B7280] mr-3" />
                <span className="text-[14px] text-[#1A1A1A]">Minhas Metas</span>
              </div>
              <span className="text-[12px] text-[#6B7280] group-hover:text-[#1A1A1A] transition-colors">
                →
              </span>
            </Link>

            <Link
              href="/mentorado/conquistas"
              className="flex items-center justify-between p-3 bg-white rounded-[12px] hover:bg-opacity-80 transition-colors group"
            >
              <div className="flex items-center">
                <Trophy className="w-5 h-5 text-[#6B7280] mr-3" />
                <span className="text-[14px] text-[#1A1A1A]">Conquistas</span>
              </div>
              <span className="text-[12px] text-[#6B7280] group-hover:text-[#1A1A1A] transition-colors">
                →
              </span>
            </Link>

            <Link
              href="/mentorado/onboarding"
              className="flex items-center justify-between p-3 bg-white rounded-[12px] hover:bg-opacity-80 transition-colors group"
            >
              <div className="flex items-center">
                <Brain className="w-5 h-5 text-[#6B7280] mr-3" />
                <span className="text-[14px] text-[#1A1A1A]">Meu Onboarding</span>
              </div>
              <span className="text-[12px] text-[#6B7280] group-hover:text-[#1A1A1A] transition-colors">
                →
              </span>
            </Link>
          </div>
        </div>

        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <h3 className="text-[16px] font-medium text-[#1A1A1A] mb-4">
            Informações da Conta
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-[#22C55E] rounded-full mr-3"></div>
              <span className="text-[14px] text-[#6B7280]">
                Status: Ativo
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-[#E879F9] rounded-full mr-3"></div>
              <span className="text-[14px] text-[#6B7280]">
                Estado: {mentorado?.estado_atual || 'Em progresso'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MentoradoLoginPage() {
  return (
    <MentoradoAuthProvider>
      <MentoradoPageContent />
    </MentoradoAuthProvider>
  )
}