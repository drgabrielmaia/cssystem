'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { UserCheck, Mail, Eye, EyeOff, LogIn, Play, BookOpen, DollarSign, TrendingUp, Target, Trophy, Brain, Star, Medal, Award } from 'lucide-react'
import { MentoradoAuthProvider, useMentoradoAuth } from '@/contexts/mentorado-auth'
import { supabase } from '@/lib/supabase'
import { GeneroEspecialidadeModal } from '@/components/GeneroEspecialidadeModal'
import { CacheRefreshHelper } from '@/components/cache-refresh-helper'
import { RankingPorGenero } from '@/components/ranking/RankingPorGenero'
import MentoradoInfoWrapper from '@/components/MentoradoInfoWrapper'
import Link from 'next/link'

interface VideoModule {
  id: string
  title: string
  description: string
  cover_image_url?: string
  is_active: boolean
  order_index: number
}



function MentoradoPageContent() {
  const { mentorado, loading: authLoading, error, signIn, signOut } = useMentoradoAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [modules, setModules] = useState<VideoModule[]>([])
  const [showGeneroEspecialidadeModal, setShowGeneroEspecialidadeModal] = useState(false)
  const [needsProfileUpdate, setNeedsProfileUpdate] = useState(false)

  useEffect(() => {
    if (mentorado) {
      checkProfileComplete()
      loadModules()
    }
  }, [mentorado])

  const checkProfileComplete = () => {
    if (mentorado && (!mentorado.genero || mentorado.genero === 'nao_informado' || !mentorado.especialidade)) {
      setNeedsProfileUpdate(true)
      setShowGeneroEspecialidadeModal(true)
    }
  }

  const loadModules = async () => {
    try {
      console.log('📚 Carregando módulos para dashboard inicial')

      const { data: modulesData, error } = await supabase
        .from('video_modules')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .limit(6) // Limitar para não sobrecarregar a tela inicial

      if (error) {
        console.error('❌ Erro ao carregar módulos:', error)
        setModules([])
      } else {
        console.log('✅ Módulos carregados:', modulesData?.length || 0)
        setModules(modulesData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar módulos:', error)
      setModules([])
    }
  }


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

  const handleProfileUpdate = () => {
    setNeedsProfileUpdate(false)
    setShowGeneroEspecialidadeModal(false)
    // Recarregar dados do mentorado para obter as informações atualizadas
    window.location.reload()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://medicosderesultado.com/wp-content/uploads/2024/10/capa-dashboard.png"
            alt="Background Médicos de Resultado"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="relative z-10 animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!mentorado) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://medicosderesultado.com/wp-content/uploads/2024/10/capa-dashboard.png"
            alt="Background Médicos de Resultado"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <Card className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-sm border-white/20">
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
    <div className="bg-[#141414] min-h-screen text-white">
      {/* Netflix-style Hero Section */}
      <div className="relative h-[80vh] mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[#141414] z-10" />

        {/* Hero Background */}
        <div className="absolute inset-0">
          <img
            src="https://medicosderesultado.com/wp-content/uploads/2024/10/capa-dashboard.png"
            alt="Dashboard Médicos de Resultado"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-8 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[36px] font-bold text-white mb-2">
                Olá, {mentorado?.nome_completo?.split(' ')[0]}!
              </h1>
              <p className="text-[16px] text-gray-300">
                Continue seu aprendizado de onde parou
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-gray-600 text-white hover:bg-white hover:text-black transition-all"
            >
              Sair
            </Button>
          </div>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
          <div className="max-w-2xl">
            <h2 className="text-[48px] font-bold text-white mb-4 leading-tight">
              Sua jornada de aprendizado continua
            </h2>
            <p className="text-[18px] text-gray-300 mb-6 leading-relaxed">
              Acesse seus módulos, acompanhe seu progresso e descubra novas oportunidades de crescimento.
            </p>
            <div className="flex space-x-4">
              <Link
                href="/mentorado/videos/netflix"
                className="bg-white text-black px-8 py-3 rounded-[4px] font-semibold hover:bg-opacity-80 transition-all flex items-center text-[16px]"
              >
                <Play className="w-5 h-5 mr-2" />
                Assistir Aulas
              </Link>
              <Link
                href="/mentorado/comissoes"
                className="bg-[#6B7280] bg-opacity-50 text-white px-6 py-3 rounded-[4px] font-medium hover:bg-opacity-70 transition-all flex items-center text-[16px]"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Ver Comissões
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Netflix-style Content Sections */}
      <div className="px-8 pb-8 space-y-12">
        {/* Stats Row */}
        <section>
          <h2 className="text-[24px] font-semibold text-white mb-6">
            Suas estatísticas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Progresso */}
            <div className="bg-[#1A1A1A] rounded-[8px] p-6 hover:bg-[#2A2A2A] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Seu Progresso</p>
                  <div className="flex items-center">
                    <div className="w-16 h-16 rounded-full border-4 border-[#E879F9] flex items-center justify-center bg-[#141414]">
                      <span className="text-[18px] font-bold text-white">0%</span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#E879F9] rounded-[8px] flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Módulos */}
            <div className="bg-[#1A1A1A] rounded-[8px] p-6 hover:bg-[#2A2A2A] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Módulos</p>
                  <p className="text-[28px] font-bold text-white">3</p>
                </div>
                <div className="w-12 h-12 bg-[#6B7280] rounded-[8px] flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Comissões */}
            <div className="bg-[#1A1A1A] rounded-[8px] p-6 hover:bg-[#2A2A2A] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Comissões</p>
                  <p className="text-[18px] font-bold text-white">R$ 0,00</p>
                </div>
                <div className="w-12 h-12 bg-[#22C55E] rounded-[8px] flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ranking de Pontuação por Gênero - Componente Otimizado */}
        <RankingPorGenero
          showOnlyTop3={true}
          enableAutoRefresh={true}
          mentoradoId={mentorado?.id}
        />

        {/* Continue Watching Section - Modules Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[24px] font-semibold text-white">
              Continue assistindo
            </h2>
            <Link
              href="/mentorado/videos/netflix"
              className="text-[14px] text-gray-400 hover:text-white transition-colors"
            >
              Ver todos
            </Link>
          </div>

          {/* Modules Grid */}
          {modules.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-[20px] font-medium text-white mb-2">Nenhum módulo disponível</h3>
              <p className="text-gray-400">Entre em contato com seu mentor para acessar os módulos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {modules.map((module) => (
                <Link
                  key={module.id}
                  href="/mentorado/videos/netflix"
                  className="group cursor-pointer"
                >
                  <div className="relative bg-[#1A1A1A] rounded-[8px] overflow-hidden aspect-[3/4] mb-3 group-hover:scale-105 transition-transform duration-300">
                    {module.cover_image_url ? (
                      <img
                        src={module.cover_image_url}
                        alt={module.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#E879F9]/20 to-[#1A1A1A] flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-1">
                    <h3 className="text-white text-[14px] font-medium mb-1 group-hover:text-gray-300 transition-colors line-clamp-2">
                      {module.title}
                    </h3>
                    <p className="text-gray-400 text-[12px] line-clamp-2">
                      {module.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions Grid */}
        <section>
          <h2 className="text-[24px] font-semibold text-white mb-6">
            Acesso rápido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Link
              href="/mentorado/videos/netflix"
              className="bg-[#1A1A1A] rounded-[8px] p-4 hover:bg-[#2A2A2A] transition-colors group text-center"
            >
              <div className="w-12 h-12 bg-[#E879F9] rounded-[8px] flex items-center justify-center mx-auto mb-3">
                <Play className="w-6 h-6 text-white" />
              </div>
              <span className="text-[14px] text-white block font-medium">Minhas Aulas</span>
            </Link>

            <Link
              href="/mentorado/comissoes"
              className="bg-[#1A1A1A] rounded-[8px] p-4 hover:bg-[#2A2A2A] transition-colors group text-center"
            >
              <div className="w-12 h-12 bg-[#22C55E] rounded-[8px] flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-[14px] text-white block font-medium">Comissões</span>
            </Link>

            <Link
              href="/mentorado/metas"
              className="bg-[#1A1A1A] rounded-[8px] p-4 hover:bg-[#2A2A2A] transition-colors group text-center"
            >
              <div className="w-12 h-12 bg-[#F59E0B] rounded-[8px] flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-[14px] text-white block font-medium">Metas</span>
            </Link>

            <Link
              href="/mentorado/conquistas"
              className="bg-[#1A1A1A] rounded-[8px] p-4 hover:bg-[#2A2A2A] transition-colors group text-center"
            >
              <div className="w-12 h-12 bg-[#EF4444] rounded-[8px] flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-[14px] text-white block font-medium">Conquistas</span>
            </Link>

            <Link
              href="/mentorado/onboarding"
              className="bg-[#1A1A1A] rounded-[8px] p-4 hover:bg-[#2A2A2A] transition-colors group text-center"
            >
              <div className="w-12 h-12 bg-[#8B5CF6] rounded-[8px] flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-[14px] text-white block font-medium">Onboarding</span>
            </Link>

            <Link
              href="/mentorado/progress"
              className="bg-[#1A1A1A] rounded-[8px] p-4 hover:bg-[#2A2A2A] transition-colors group text-center"
            >
              <div className="w-12 h-12 bg-[#06B6D4] rounded-[8px] flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-white" />
              </div>
              <span className="text-[14px] text-white block font-medium">Progresso</span>
            </Link>
          </div>
        </section>

        {/* Account Info */}
        <section>
          <h2 className="text-[24px] font-semibold text-white mb-6">
            Informações da conta
          </h2>
          <div className="bg-[#1A1A1A] rounded-[8px] p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-[#22C55E] rounded-full mr-3"></div>
                  <span className="text-[16px] text-white font-medium">Status: Ativo</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[#E879F9] rounded-full mr-3"></div>
                  <span className="text-[16px] text-white font-medium">
                    Estado: {mentorado?.estado_atual || 'Em progresso'}
                  </span>
                </div>
              </div>
              <div className="text-gray-400">
                <p className="text-[14px] mb-2">
                  <strong className="text-white">Email:</strong> {mentorado?.email}
                </p>
                {mentorado?.telefone && (
                  <p className="text-[14px]">
                    <strong className="text-white">Telefone:</strong> {mentorado?.telefone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>


      {/* Modal de Gênero e Especialidade */}
      {mentorado && (
        <GeneroEspecialidadeModal
          isOpen={showGeneroEspecialidadeModal}
          onClose={() => {
            if (!needsProfileUpdate) {
              setShowGeneroEspecialidadeModal(false)
            }
          }}
          mentoradoId={mentorado.id}
          mentoradoNome={mentorado.nome_completo}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  )
}

export default function MentoradoLoginPage() {
  return (
    <MentoradoAuthProvider>
      <CacheRefreshHelper />
      <MentoradoInfoWrapper>
        <MentoradoPageContent />
      </MentoradoInfoWrapper>
    </MentoradoAuthProvider>
  )
}