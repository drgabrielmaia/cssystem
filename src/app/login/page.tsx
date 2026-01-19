'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Para admin@admin.com, permitir login customizado
      if (email === 'admin@admin.com' && password.length < 6) {
        if (password === 'admin') {
          // Login customizado para admin
          document.cookie = 'admin_auth=true; path=/; max-age=86400' // 24 horas

          // Disparar evento customizado para notificar o contexto de auth
          window.dispatchEvent(new CustomEvent('adminLoginSuccess'))

          router.push('/lista-mentorados')
          return
        } else {
          setError('Email ou senha incorretos')
          return
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        // Tratar erros específicos
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.')
        } else {
          setError(error.message)
        }
        return
      }

      // Login bem-sucedido - verificar se é usuário do financeiro
      try {
        const { data: financeUser } = await supabase
          .from('usuarios_financeiro')
          .select('*')
          .eq('email', email)
          .eq('ativo', true)
          .single()

        if (financeUser) {
          // É usuário do financeiro - salvar dados e redirecionar
          localStorage.setItem('finance_user', JSON.stringify(financeUser))
          const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/financeiro/dashboard'
          router.push(redirectTo)
          return
        }
      } catch (financeError) {
        // Não é usuário do financeiro, continuar para dashboard normal
      }

      // Redirecionar para visão geral ou página anterior
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/lista-mentorados'
      router.push(redirectTo)
    } catch (error: any) {
      console.error('Erro no login:', error)
      setError('Erro interno do servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://medicosderesultado.com/wp-content/uploads/2024/10/capa-dashboard.png"
          alt="Background Médicos de Resultado"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Customer Success
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Faça login para acessar o sistema
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border border-white/20 bg-white/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Login</CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
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