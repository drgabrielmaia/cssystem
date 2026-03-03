'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { UserCheck, Mail, Eye, EyeOff, LogIn, Play, BookOpen, DollarSign, TrendingUp, Target, Trophy, Brain, Star, Medal, Award, FileText, Heart } from 'lucide-react'
import { MentoradoAuthProvider, useMentoradoAuth } from '@/contexts/mentorado-auth'
import { supabase } from '@/lib/supabase'
import { GeneroEspecialidadeModal } from '@/components/GeneroEspecialidadeModal'
import { CacheRefreshHelper } from '@/components/cache-refresh-helper'
import { RankingPorGenero } from '@/components/ranking/RankingPorGenero'
import MentoradoInfoWrapper from '@/components/MentoradoInfoWrapper'
import Link from 'next/link'
import { MOCK_MODE, MOCK_MODULES } from '@/lib/mock-data'

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

  // ICP auto-redirect DESATIVADO por enquanto (perguntas erradas)
  // TODO: Reativar quando o admin corrigir o template de perguntas

  useEffect(() => {
    if (mentorado) {
      if (!MOCK_MODE) {
        checkProfileComplete()
      }
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

      // MOCK MODE: usar dados locais
      if (MOCK_MODE) {
        setModules(MOCK_MODULES.slice(0, 6).map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          cover_image_url: m.cover_image_url,
          is_active: m.is_active,
          order_index: m.order_index,
        })))
        return
      }

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
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#0a0a0a]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://medicosderesultado.com/wp-content/uploads/2024/10/capa-dashboard.png"
            alt="Background Médicos de Resultado"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-emerald-900/30"></div>
        </div>
        {/* Pulsing loader */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#34D399]/30 border-t-[#34D399] animate-spin" />
            <div className="absolute inset-2 w-12 h-12 rounded-full border-2 border-white/10 border-b-white/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          </div>
          <p className="text-white/60 text-sm font-medium tracking-wider uppercase animate-pulse">Carregando...</p>
        </div>
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
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-emerald-900/40"></div>
        </div>

        {/* Animated gradient border login card */}
        <div className="relative z-10 w-full max-w-md">
          {/* Outer glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-[#34D399] via-blue-500 to-[#34D399] rounded-2xl opacity-60 blur-sm animate-[loginGlow_3s_ease-in-out_infinite]" />
          {/* Gradient border */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-[#34D399] via-blue-500 to-[#34D399] rounded-2xl opacity-80 animate-[loginGlow_3s_ease-in-out_infinite]" />

          <div className="relative bg-[#0f0f0f]/95 backdrop-blur-xl rounded-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#34D399] to-blue-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-[#34D399]/20">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Portal do Mentorado</h2>
              <p className="text-gray-400 text-sm">
                Acesse suas aulas e modulos de aprendizado
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
                  <Mail className="h-4 w-4 inline mr-2 text-[#34D399]" />
                  Email
                </Label>
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#34D399]/0 via-[#34D399]/0 to-blue-500/0 rounded-lg group-focus-within:from-[#34D399]/60 group-focus-within:via-blue-500/60 group-focus-within:to-[#34D399]/60 transition-all duration-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="relative bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 text-sm font-medium">Senha</Label>
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#34D399]/0 via-[#34D399]/0 to-blue-500/0 rounded-lg group-focus-within:from-[#34D399]/60 group-focus-within:via-blue-500/60 group-focus-within:to-[#34D399]/60 transition-all duration-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Sua senha"
                    className="relative bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-transparent transition-all duration-300 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#34D399] to-blue-500 hover:from-[#34D399]/90 hover:to-blue-500/90 text-white font-semibold py-3 rounded-lg shadow-lg shadow-[#34D399]/20 hover:shadow-[#34D399]/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Entrar
                    <LogIn className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes loginGlow {
            0%, 100% { opacity: 0.5; filter: blur(4px); }
            50% { opacity: 0.8; filter: blur(8px); }
          }
        `}} />
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white">
      {/* Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes subtlePulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes progressFill {
          from { stroke-dashoffset: 283; }
          to { stroke-dashoffset: 283; }
        }
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232, 121, 249, 0); }
          50% { box-shadow: 0 0 20px 0 rgba(232, 121, 249, 0.1); }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.7s ease-out forwards; }
        .animate-fadeInLeft { animation: fadeInLeft 0.6s ease-out forwards; }
        .animate-shimmer { animation: shimmer 2s linear infinite; }
        .animate-gradientMove { animation: gradientMove 4s ease infinite; background-size: 200% 200%; }
        .animate-subtlePulse { animation: subtlePulse 3s ease-in-out infinite; }
        .animate-cardGlow { animation: cardGlow 4s ease-in-out infinite; }
        .animate-floatIn { animation: floatIn 0.5s ease-out forwards; }
        .stagger-1 { animation-delay: 0.1s; opacity: 0; }
        .stagger-2 { animation-delay: 0.2s; opacity: 0; }
        .stagger-3 { animation-delay: 0.3s; opacity: 0; }
        .stagger-4 { animation-delay: 0.4s; opacity: 0; }
        .stagger-5 { animation-delay: 0.5s; opacity: 0; }
        .stagger-6 { animation-delay: 0.6s; opacity: 0; }
        .stagger-7 { animation-delay: 0.7s; opacity: 0; }
      `}} />

      {/* Netflix-style Hero Section - Enhanced */}
      <div className="relative h-[85vh] mb-8">
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 via-transparent to-[#0a0a0a]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          {/* Subtle green radial from bottom-left */}
          <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-gradient-radial from-[#34D399]/8 to-transparent rounded-full blur-3xl" />
        </div>

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
          <div className="flex items-center justify-between animate-fadeInUp stagger-1">
            <div className="flex items-center gap-4">
              {/* Avatar circle */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34D399] to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#34D399]/20">
                {MOCK_MODE ? 'M' : (mentorado?.nome_completo?.charAt(0)?.toUpperCase() || 'M')}
              </div>
              <div>
                <h1 className="text-[28px] font-bold text-white leading-tight">
                  {MOCK_MODE ? 'Bem-vindo!' : `Ola, ${mentorado?.nome_completo?.split(' ')[0]}!`}
                </h1>
                <p className="text-[14px] text-gray-300/80">
                  Continue seu aprendizado de onde parou
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white hover:text-black transition-all duration-300 rounded-lg"
            >
              Sair
            </Button>
          </div>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
          <div className="max-w-2xl">
            <div className="animate-fadeInLeft stagger-2">
              <div className="inline-flex items-center gap-2 bg-[#34D399]/15 border border-[#34D399]/30 rounded-full px-4 py-1.5 mb-5">
                <div className="w-2 h-2 bg-[#34D399] rounded-full animate-subtlePulse" />
                <span className="text-[#34D399] text-xs font-semibold uppercase tracking-widest">Plataforma Ativa</span>
              </div>
            </div>
            <h2 className="text-[52px] font-extrabold text-white mb-4 leading-[1.1] tracking-tight animate-fadeInLeft stagger-3">
              Sua jornada de{' '}
              <span className="bg-gradient-to-r from-[#34D399] via-blue-400 to-[#34D399] bg-clip-text text-transparent animate-gradientMove">
                aprendizado
              </span>
              {' '}continua
            </h2>
            <p className="text-[17px] text-gray-300/90 mb-8 leading-relaxed max-w-lg animate-fadeInLeft stagger-4">
              Acesse seus modulos, acompanhe seu progresso e descubra novas oportunidades de crescimento profissional.
            </p>
            <div className="flex flex-wrap gap-3 animate-fadeInUp stagger-5">
              <Link
                href="/mentorado/videos/netflix"
                className="group bg-white text-black px-8 py-3.5 rounded-lg font-semibold hover:bg-opacity-90 transition-all duration-300 flex items-center text-[15px] shadow-xl shadow-white/10 hover:shadow-white/20 hover:scale-[1.03] active:scale-[0.98]"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Assistir Aulas
              </Link>
              <Link
                href="/mentorado/banco-de-aulas"
                className="group bg-gradient-to-r from-[#34D399] to-[#059669] text-white px-7 py-3.5 rounded-lg font-semibold hover:opacity-90 transition-all duration-300 flex items-center text-[15px] shadow-lg shadow-[#34D399]/20 hover:shadow-[#34D399]/40 hover:scale-[1.03] active:scale-[0.98]"
              >
                <BookOpen className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Banco de Aulas
              </Link>
              <Link
                href="/mentorado/comissoes"
                className="group bg-white/10 backdrop-blur-sm border border-white/20 text-white px-7 py-3.5 rounded-lg font-medium hover:bg-white/20 transition-all duration-300 flex items-center text-[15px] hover:scale-[1.03] active:scale-[0.98]"
              >
                <DollarSign className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Ver Comissoes
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Netflix-style Content Sections */}
      <div className="px-8 pb-12 space-y-14">

        {/* Novidades / What's New Banner */}
        <section className="animate-fadeInUp stagger-1">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1f1a] via-[#1a1a2e] to-[#0f1922] border border-white/5">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#34D399]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Icon */}
              <div className="shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#34D399]/20 to-blue-500/20 border border-[#34D399]/20 flex items-center justify-center">
                  <Star className="w-7 h-7 text-[#34D399]" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white">Novidades</h3>
                  <span className="px-2.5 py-0.5 bg-[#34D399]/15 border border-[#34D399]/30 rounded-full text-[#34D399] text-[11px] font-semibold uppercase tracking-wider">Novo</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Novos modulos e conteudos exclusivos estao disponiveis! Confira as atualizacoes mais recentes da plataforma e continue evoluindo na sua jornada.
                </p>
              </div>

              {/* CTA */}
              <div className="shrink-0">
                <Link
                  href="/mentorado/videos/netflix"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#34D399]/10 hover:bg-[#34D399]/20 border border-[#34D399]/30 hover:border-[#34D399]/50 text-[#34D399] rounded-lg font-medium text-sm transition-all duration-300 hover:scale-[1.03]"
                >
                  Explorar
                  <Play className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row - Enhanced */}
        <section>
          <h2 className="text-[22px] font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-[#34D399] to-blue-500 rounded-full" />
            Suas estatisticas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Progresso */}
            <div className="group relative animate-floatIn stagger-1">
              {/* Hover gradient border */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#34D399] to-emerald-500 rounded-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 blur-[1px]" />
              <div className="relative bg-[#141414] rounded-xl p-6 border border-white/5 group-hover:border-transparent transition-all duration-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] text-gray-500 font-semibold uppercase tracking-wider mb-3">Seu Progresso</p>
                    <div className="flex items-center">
                      {/* SVG circular progress */}
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                          <circle cx="50" cy="50" r="42" fill="none" stroke="url(#progressGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="264" className="transition-all duration-1000" />
                          <defs>
                            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#34D399" />
                              <stop offset="100%" stopColor="#818CF8" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[16px] font-bold text-white">0%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#34D399] to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#34D399]/20 group-hover:shadow-[#34D399]/40 transition-shadow duration-500">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-gradient-to-r from-[#34D399] to-emerald-500 rounded-full transition-all duration-1000" />
                </div>
              </div>
            </div>

            {/* Modulos */}
            <div className="group relative animate-floatIn stagger-2">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 blur-[1px]" />
              <div className="relative bg-[#141414] rounded-xl p-6 border border-white/5 group-hover:border-transparent transition-all duration-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] text-gray-500 font-semibold uppercase tracking-wider mb-3">Modulos</p>
                    <p className="text-[32px] font-bold text-white leading-none">3</p>
                    <p className="text-[12px] text-gray-500 mt-1">disponiveis</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow duration-500">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                </div>
                {/* Mini bar chart decoration */}
                <div className="mt-4 flex items-end gap-1 h-6">
                  {[40, 65, 85, 50, 70, 90, 60].map((h, i) => (
                    <div key={i} className="flex-1 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-sm transition-all duration-500" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Comissoes */}
            <div className="group relative animate-floatIn stagger-3">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 to-green-400 rounded-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 blur-[1px]" />
              <div className="relative bg-[#141414] rounded-xl p-6 border border-white/5 group-hover:border-transparent transition-all duration-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] text-gray-500 font-semibold uppercase tracking-wider mb-3">Comissoes</p>
                    <p className="text-[22px] font-bold text-white leading-none">R$ 0,00</p>
                    <p className="text-[12px] text-gray-500 mt-1">total acumulado</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow duration-500">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
                {/* Trend line decoration */}
                <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-1000" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ranking de Pontuacao por Genero - Componente Otimizado */}
        {!MOCK_MODE && (
          <RankingPorGenero
            showOnlyTop3={true}
            enableAutoRefresh={true}
            mentoradoId={mentorado?.id}
          />
        )}

        {/* Continue Watching Section - Modules Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-white flex items-center gap-3">
              <div className="w-1 h-6 bg-gradient-to-b from-[#34D399] to-blue-500 rounded-full" />
              Continue assistindo
            </h2>
            <Link
              href="/mentorado/videos/netflix"
              className="text-[13px] text-gray-500 hover:text-[#34D399] transition-colors duration-300 font-medium flex items-center gap-1.5 group"
            >
              Ver todos
              <span className="group-hover:translate-x-0.5 transition-transform duration-300">&rarr;</span>
            </Link>
          </div>

          {/* Modules Grid */}
          {modules.length === 0 ? (
            /* Loading skeleton / empty state */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-floatIn" style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}>
                  <div className="relative bg-[#141414] rounded-xl overflow-hidden aspect-[3/4] mb-3 border border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                        <BookOpen className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="h-3 w-20 bg-white/5 rounded-full mb-2" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
                      <div className="h-2 w-14 bg-white/[0.03] rounded-full" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15 + 0.2}s` }} />
                    </div>
                  </div>
                  <div className="px-1 space-y-2">
                    <div className="h-3 w-3/4 bg-white/5 rounded-full" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
                    <div className="h-2 w-1/2 bg-white/[0.03] rounded-full" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: '0.3s' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {modules.map((module, index) => (
                <Link
                  key={module.id}
                  href="/mentorado/videos/netflix"
                  className="group cursor-pointer animate-floatIn"
                  style={{ animationDelay: `${index * 0.08}s`, opacity: 0 }}
                >
                  <div className="relative bg-[#141414] rounded-xl overflow-hidden aspect-[3/4] mb-3 border border-white/5 group-hover:border-[#34D399]/30 transition-all duration-500 group-hover:scale-[1.05] group-hover:shadow-2xl group-hover:shadow-[#34D399]/10">
                    {module.cover_image_url ? (
                      <img
                        src={module.cover_image_url}
                        alt={module.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#34D399]/10 via-[#141414] to-blue-500/10 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white/40 group-hover:text-white/60 transition-colors duration-300" />
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-75 group-hover:scale-100">
                        <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow-2xl shadow-black/40">
                          <Play className="w-6 h-6 text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                    {/* Module number badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-[10px] text-white/70 font-medium">
                      Modulo {index + 1}
                    </div>
                  </div>
                  <div className="px-1">
                    <h3 className="text-white text-[14px] font-medium mb-1 group-hover:text-[#34D399] transition-colors duration-300 line-clamp-2">
                      {module.title}
                    </h3>
                    <p className="text-gray-500 text-[12px] line-clamp-2">
                      {module.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions Grid - Enhanced */}
        <section>
          <h2 className="text-[22px] font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-[#34D399] to-blue-500 rounded-full" />
            Acesso rapido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            {[
              { href: '/mentorado/videos/netflix', icon: Play, label: 'Minhas Aulas', color: '#34D399', glowColor: 'rgba(232,121,249,0.15)' },
              { href: '/mentorado/comissoes', icon: DollarSign, label: 'Comissoes', color: '#22C55E', glowColor: 'rgba(34,197,94,0.15)' },
              { href: '/area-do-aluno', icon: Brain, label: 'Area do Aluno', color: '#3B82F6', glowColor: 'rgba(59,130,246,0.15)', special: true },
              { href: '/mentorado/metas', icon: Target, label: 'Metas', color: '#F59E0B', glowColor: 'rgba(245,158,11,0.15)' },
              { href: '/mentorado/conquistas', icon: Trophy, label: 'Conquistas', color: '#EF4444', glowColor: 'rgba(239,68,68,0.15)' },
              { href: '/mentorado/onboarding', icon: Brain, label: 'Onboarding', color: '#8B5CF6', glowColor: 'rgba(139,92,246,0.15)' },
              { href: '/mentorado/progress', icon: Star, label: 'Progresso', color: '#06B6D4', glowColor: 'rgba(6,182,212,0.15)' },
            ].map((action, i) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`group relative rounded-xl p-5 text-center transition-all duration-500 hover:scale-[1.05] active:scale-[0.97] animate-floatIn ${
                    action.special
                      ? 'bg-gradient-to-br from-blue-500/10 to-emerald-500/10 border border-blue-400/20 hover:border-blue-400/40'
                      : 'bg-[#141414] border border-white/5 hover:border-white/10'
                  }`}
                  style={{ animationDelay: `${i * 0.06}s`, opacity: 0 }}
                >
                  {/* Hover glow effect */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ boxShadow: `inset 0 0 30px ${action.glowColor}, 0 0 20px ${action.glowColor}` }}
                  />
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${action.color}20, ${action.color}40)`,
                        boxShadow: `0 4px 12px ${action.color}15`,
                      }}
                    >
                      <Icon className="w-5 h-5 text-white transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <span className={`text-[13px] block font-medium transition-colors duration-300 ${
                      action.special ? 'text-blue-200 group-hover:text-blue-100' : 'text-gray-300 group-hover:text-white'
                    }`}>
                      {action.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Account Info - Enhanced - oculto em mock mode */}
        {!MOCK_MODE && (
          <section>
            <h2 className="text-[22px] font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-1 h-6 bg-gradient-to-b from-[#34D399] to-blue-500 rounded-full" />
              Informacoes da conta
            </h2>
            <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  {/* Avatar and name block */}
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#34D399] to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-[#34D399]/20">
                        {mentorado?.nome_completo?.charAt(0)?.toUpperCase() || 'M'}
                      </div>
                      {/* Online indicator */}
                      <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#22C55E] rounded-full border-2 border-[#141414]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-0.5">{mentorado?.nome_completo || 'Mentorado'}</h3>
                      <p className="text-sm text-gray-400">{mentorado?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full text-[#22C55E] text-[11px] font-semibold uppercase tracking-wider">
                          <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" />
                          Ativo
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden md:block w-px h-20 bg-white/5 self-center" />

                  {/* Details grid */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Email</p>
                      <p className="text-sm text-white font-medium truncate">{mentorado?.email}</p>
                    </div>
                    {mentorado?.telefone && (
                      <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Telefone</p>
                        <p className="text-sm text-white font-medium">{mentorado?.telefone}</p>
                      </div>
                    )}
                    <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Estado</p>
                      <p className="text-sm text-white font-medium flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#34D399] rounded-full" />
                        {mentorado?.estado_atual || 'Em progresso'}
                      </p>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Membro desde</p>
                      <p className="text-sm text-white font-medium">
                        {mentorado?.created_at
                          ? new Date(mentorado.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>


      {/* Modal de Genero e Especialidade - oculto em mock mode */}
      {!MOCK_MODE && mentorado && (
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
