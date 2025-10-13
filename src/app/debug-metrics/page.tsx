'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw } from 'lucide-react'

export default function DebugMetricsPage() {
  const [rawEvents, setRawEvents] = useState<any[]>([])
  const [metricsView, setMetricsView] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadDebugData()
  }, [])

  const loadDebugData = async () => {
    try {
      setLoading(true)
      console.log('🔍 Carregando dados de debug...')

      // Dados brutos das calls
      const { data: eventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20)

      if (eventsError) {
        console.error('Erro ao carregar events:', eventsError)
      } else {
        console.log('📊 Events brutos:', eventsData)
        setRawEvents(eventsData || [])
      }

      // Dados da view de métricas
      const { data: metricsData, error: metricsError } = await supabase
        .from('social_seller_metrics')
        .select('*')
        .order('month_year', { ascending: false })

      if (metricsError) {
        console.error('Erro ao carregar metrics view:', metricsError)
      } else {
        console.log('📈 Metrics view:', metricsData)
        setMetricsView(metricsData || [])
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('💥 Erro geral:', error)
    } finally {
      setLoading(false)
    }
  }

  const forceRefreshView = async () => {
    try {
      console.log('🔄 Tentando forçar refresh da view...')

      // Tentar triggerar recálculo da view fazendo uma query com GROUP BY
      const { data, error } = await supabase.rpc('refresh_social_seller_metrics')

      if (error) {
        console.log('❌ Função refresh não existe, tentando query manual...')

        // Query manual para forçar recálculo
        const { data: manualCalc, error: manualError } = await supabase
          .from('calendar_events')
          .select('call_status')
          .not('call_status', 'is', null)

        console.log('📊 Query manual executada:', manualCalc?.length)
      } else {
        console.log('✅ View refreshed via função:', data)
      }

      // Recarregar dados
      await loadDebugData()
    } catch (error) {
      console.error('💥 Erro ao forçar refresh:', error)
    }
  }

  const updateSampleCall = async () => {
    try {
      if (rawEvents.length === 0) return

      const sampleCall = rawEvents[0]
      console.log('🔄 Atualizando call de teste:', sampleCall.id)

      const { error } = await supabase
        .from('calendar_events')
        .update({
          call_status: 'vendida',
          sale_value: 5000,
          updated_at: new Date().toISOString()
        })
        .eq('id', sampleCall.id)

      if (error) throw error

      console.log('✅ Call atualizada!')
      setTimeout(() => loadDebugData(), 1000)
    } catch (error) {
      console.error('❌ Erro ao atualizar call:', error)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Debug - Métricas do Social Seller</h1>
          <p className="text-gray-600">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadDebugData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button
            variant="secondary"
            onClick={forceRefreshView}
            disabled={loading}
          >
            Force Refresh View
          </Button>
          <Button
            onClick={updateSampleCall}
            disabled={loading || rawEvents.length === 0}
          >
            Atualizar Call Teste
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events Brutos */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar Events (Dados Brutos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rawEvents.map((event) => (
                <div key={event.id} className="p-3 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{event.title}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-1">
                    <div>Status: <span className="font-mono">{event.call_status || 'null'}</span></div>
                    <div>Valor: <span className="font-mono">{event.sale_value || 'null'}</span></div>
                    <div>ID: <span className="font-mono">...{event.id.slice(-6)}</span></div>
                    <div>Updated: {new Date(event.updated_at).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-2 bg-blue-50 rounded text-sm">
              <strong>Total events:</strong> {rawEvents.length}
              <br />
              <strong>Com status:</strong> {rawEvents.filter(e => e.call_status).length}
            </div>
          </CardContent>
        </Card>

        {/* Metrics View */}
        <Card>
          <CardHeader>
            <CardTitle>Social Seller Metrics (View)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {metricsView.map((metric, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                  <div className="font-medium">
                    {new Date(metric.month_year).toLocaleDateString('pt-BR', {
                      year: 'numeric',
                      month: 'long'
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-1">
                    <div>Total: {metric.total_calls}</div>
                    <div>Vendidas: {metric.calls_vendidas}</div>
                    <div>Não Vendidas: {metric.calls_nao_vendidas}</div>
                    <div>No-Show: {metric.no_shows}</div>
                    <div>Conversão: {metric.taxa_conversao}%</div>
                    <div>R$ Vendas: {metric.total_vendas}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-2 bg-green-50 rounded text-sm">
              <strong>Total períodos:</strong> {metricsView.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Query Manual */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Análise Manual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded">
              <div className="font-medium">Total Events</div>
              <div className="text-xl">{rawEvents.length}</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="font-medium">Com Call Status</div>
              <div className="text-xl">{rawEvents.filter(e => e.call_status).length}</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="font-medium">Vendidas</div>
              <div className="text-xl">{rawEvents.filter(e => e.call_status === 'vendida').length}</div>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <div className="font-medium">No-Show</div>
              <div className="text-xl">{rawEvents.filter(e => e.call_status === 'no_show').length}</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded text-sm">
            <h4 className="font-bold mb-2">Status Breakdown:</h4>
            {['vendida', 'nao_vendida', 'no_show', 'realizada', 'agendada', 'aguardando_resposta'].map(status => {
              const count = rawEvents.filter(e => e.call_status === status).length
              return count > 0 ? (
                <div key={status}>
                  <strong>{status}:</strong> {count} calls
                </div>
              ) : null
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}