'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'

export default function MentoradoLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { signIn } = useMentoradoAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔍 Tentando login:', { email, password })
      
      const success = await signIn(email, password)
      
      if (success) {
        console.log('✅ Login bem-sucedido!')
        
        // Disparar evento para notificar outros componentes
        window.dispatchEvent(new CustomEvent('mentoradoLoginSuccess'))
        
        // Redirecionar baseado no tipo de usuário
        // Se for owner da organização, vai para admin
        // Se for mentorado normal, vai para área do mentorado
        
        // Aguardar um pouco para o contexto atualizar
        setTimeout(() => {
          // Verificar se é admin (owner) através do email da organização
          checkIfIsAdminAndRedirect()
        }, 500)
      } else {
        setError('Email ou senha incorretos')
      }
    } catch (error) {
      console.error('❌ Erro no login:', error)
      setError('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const checkIfIsAdminAndRedirect = async () => {
    try {
      // Verificar se é owner da organização
      const response = await fetch('/api/check-admin-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        const { isAdmin, isOwner } = await response.json()
        
        if (isOwner || isAdmin) {
          console.log('👑 Usuário é admin/owner, redirecionando para área admin')
          router.push('/admin/dashboard')
        } else {
          console.log('👤 Usuário é mentorado, redirecionando para área do mentorado')
          router.push('/mentorado')
        }
      } else {
        // Fallback: assumir que é mentorado
        console.log('📱 Fallback: redirecionando para área do mentorado')
        router.push('/mentorado')
      }
    } catch (error) {
      console.log('📱 Erro ao verificar admin, usando fallback')
      router.push('/mentorado')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Login do Sistema
          </h1>
          <p className="text-gray-600">
            Faça login para acessar sua área
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Sua senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Fazendo login...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Problemas para fazer login?{' '}
            <a href="/suporte" className="text-blue-600 hover:text-blue-700">
              Entre em contato
            </a>
          </p>
        </div>

        {/* Informações de debug (remover em produção) */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Contas de teste:</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>📧 iachelps@gmail.com</p>
            <p>🔑 iache123</p>
            <p className="text-blue-600">→ Admin/Owner da organização IAC Helps</p>
          </div>
        </div>
      </div>
    </div>
  )
}