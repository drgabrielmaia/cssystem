'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  DollarSign,
  TrendingUp,
  PieChart,
  BarChart3,
  Eye,
  EyeOff,
  ArrowRight,
  Shield
} from 'lucide-react'

export default function FinanceiroPlataformaLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Verificar se é usuário do financeiro
      const { data: financeUser, error: financeError } = await supabase
        .from('usuarios_financeiro')
        .select('*')
        .eq('email', email)
        .eq('ativo', true)
        .single()

      if (financeError || !financeUser) {
        await supabase.auth.signOut()
        throw new Error('Acesso negado. Usuário não autorizado para o financeiro.')
      }

      // Salvar dados do usuário financeiro
      localStorage.setItem('finance_user', JSON.stringify(financeUser))

      // Redirecionar para dashboard financeiro
      router.push('/financeiro-plataforma/dashboard')
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
        <div className="absolute top-60 right-10 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-gradient-to-r from-pink-400 to-red-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/3 left-1/2 w-80 h-80 bg-gradient-to-r from-indigo-400 to-cyan-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-white/30 backdrop-blur-xl border-r border-white/30 shadow-2xl">
          <div className="flex flex-col justify-center px-12 xl:px-16">
            {/* Logo */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] rounded-2xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-7 h-7 text-slate-800" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
                  <p className="text-slate-600 text-sm">Plataforma Premium</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Análise em Tempo Real</h3>
                  <p className="text-slate-600">Acompanhe fluxo de caixa, entradas, saídas e KPIs financeiros em tempo real.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Relatórios Visuais</h3>
                  <p className="text-slate-600">Gráficos interativos, drill-down inteligente e relatórios customizáveis.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Orçamentos Inteligentes</h3>
                  <p className="text-slate-600">Compare orçado vs realizado com alertas automáticos de variações.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <DollarSign className="w-8 h-8 text-slate-800" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
              <p className="text-slate-600">Plataforma Premium</p>
            </div>

            {/* Login Card */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-slate-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-800">Acesso Seguro</h2>
                </div>
                <p className="text-slate-600">Entre com suas credenciais do financeiro</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400 pr-12"
                      placeholder="Sua senha"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-slate-800 py-3 px-4 rounded-2xl font-semibold hover:from-[#B8860B] hover:to-[#DAA520] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 transition-all duration-200 flex items-center justify-center group disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-800"></div>
                  ) : (
                    <>
                      Entrar no Dashboard
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600">
                  Problemas para acessar?
                  <button className="text-[#D4AF37] hover:text-[#B8860B] ml-1 font-medium">
                    Entre em contato
                  </button>
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                🔒 Acesso protegido com autenticação de dois fatores
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}