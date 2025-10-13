'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Phone, PhoneOff, CheckCircle, XCircle, Clock } from 'lucide-react'

interface CallEvent {
  id: string
  title: string
  call_status: string | null
  sale_value: number | null
  updated_at: string
  mentorados: {
    nome_completo: string
  } | null
}

export default function TestRealtimePage() {
  const [calls, setCalls] = useState<CallEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadCalls()

    // Auto-refresh a cada 10 segundos para teste
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh test page...')
      loadCalls()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const loadCalls = async () => {
    try {
      console.log('📡 Carregando calls para teste...')

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          call_status,
          sale_value,
          updated_at,
          mentorados:mentorado_id (
            nome_completo
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(8)

      if (error) throw error

      console.log('📊 Dados recebidos:', data?.map(c => ({
        id: c.id.slice(-4),
        title: c.title,
        status: c.call_status,
        updated: new Date(c.updated_at).toLocaleTimeString()
      })))

      const transformedCalls = (data || []).map(call => ({
        ...call,
        mentorados: Array.isArray(call.mentorados) && call.mentorados.length > 0
          ? call.mentorados[0]
          : null
      }))

      setCalls(transformedCalls)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('❌ Erro ao carregar calls:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateCallStatus = async (callId: string, newStatus: string) => {
    try {
      console.log(`🔄 Atualizando call ${callId} para status: ${newStatus}`)

      const updateData: any = {
        call_status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'vendida') {
        const value = prompt('Valor da venda (R$):')
        if (value) {
          updateData.sale_value = parseFloat(value.replace(',', '.'))
        }
      } else if (newStatus === 'nao_vendida') {
        updateData.sale_value = null
      }

      const { error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', callId)

      if (error) throw error

      console.log('✅ Call atualizada com sucesso!')

      // Forçar reload imediato
      setTimeout(() => loadCalls(), 500)

    } catch (error) {
      console.error('❌ Erro ao atualizar call:', error)
      alert('Erro ao atualizar call')
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline">Sem Status</Badge>
    }

    const statusConfig = {
      'agendada': { label: 'Agendada', className: 'bg-gray-100 text-gray-800', icon: Clock },
      'realizada': { label: 'Realizada', className: 'bg-blue-100 text-blue-800', icon: Phone },
      'no_show': { label: 'No-Show', className: 'bg-orange-100 text-orange-800', icon: PhoneOff },
      'vendida': { label: 'Vendida', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      'nao_vendida': { label: 'Não Vendida', className: 'bg-red-100 text-red-800', icon: XCircle },
      'aguardando_resposta': { label: 'Aguardando', className: 'bg-yellow-100 text-yellow-800', icon: Clock }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendada
    const Icon = config.icon

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return ''
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teste de Atualização em Tempo Real</h1>
          <p className="text-gray-600">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadCalls()}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Carregando...' : 'Atualizar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {calls.map((call) => (
          <Card key={call.id} className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base font-medium mb-1">
                    {call.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {call.mentorados?.nome_completo || 'Sem mentorado'}
                  </p>
                  <p className="text-xs text-gray-400">
                    ID: ...{call.id.slice(-4)} | Atualizado: {new Date(call.updated_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(call.call_status)}
                  {call.sale_value && (
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(call.sale_value)}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateCallStatus(call.id, 'realizada')}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Realizada
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateCallStatus(call.id, 'no_show')}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <PhoneOff className="w-3 h-3 mr-1" />
                  No-Show
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateCallStatus(call.id, 'vendida')}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Vendida
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateCallStatus(call.id, 'nao_vendida')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Não Vendida
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-2">Instruções para Teste:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. Clique em qualquer botão de status para alterar uma call</li>
          <li>2. Observe se o status atualiza automaticamente em 10 segundos</li>
          <li>3. Verifique se a mudança aparece no Social Seller também</li>
          <li>4. Use o botão "Atualizar" para forçar refresh manual</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          🔄 Auto-refresh ativo a cada 10 segundos
        </p>
      </div>
    </div>
  )
}