'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export default function PopulateDataPage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const realCallsData = [
    {
      nome: 'Renata Santos Teixeira',
      email: 'renata.santos@email.com',
      telefone: '(11) 99999-0101',
      origem: 'instagram',
      status: 'cliente',
      valor: 8500.00,
      obs: 'Fechou mentoria - Instagram Ativo',
      data: '2025-10-01',
      callTime: '14:00:00',
      mentorado: true
    },
    {
      nome: 'Glaycon Michels',
      email: 'glaycon.michels@email.com',
      telefone: '(11) 99999-0102',
      origem: 'instagram',
      status: 'cliente',
      valor: 7200.00,
      obs: 'Fechou mentoria - Instagram Ativo',
      data: '2025-10-02',
      callTime: '15:30:00',
      mentorado: true
    },
    {
      nome: 'Lidio Barros',
      email: 'lidio.barros@email.com',
      telefone: '(11) 99999-0103',
      origem: 'instagram',
      status: 'nao_vendida',
      valor: 6500.00,
      obs: 'Não fechou - Instagram Ativo',
      data: '2025-10-03',
      callTime: '10:00:00',
      mentorado: false
    },
    {
      nome: 'Beatriz Gurgel',
      email: 'beatriz.gurgel@email.com',
      telefone: '(11) 99999-0104',
      origem: 'instagram',
      status: 'cliente',
      valor: 9100.00,
      obs: 'Fechou mentoria - Instagram Ativo',
      data: '2025-10-03',
      callTime: '16:00:00',
      mentorado: true
    },
    {
      nome: 'Leonardo Trinta',
      email: 'leonardo.trinta@email.com',
      telefone: '(11) 99999-0105',
      origem: 'instagram',
      status: 'nao_vendida',
      valor: 5800.00,
      obs: 'Não fechou - Instagram Ativo',
      data: '2025-10-03',
      callTime: '11:30:00',
      mentorado: false
    },
    {
      nome: 'Nathalia Gomes',
      email: 'nathalia.gomes@email.com',
      telefone: '(11) 99999-0106',
      origem: 'instagram',
      status: 'cliente',
      valor: 7800.00,
      obs: 'Fechou mentoria - Instagram Ativo',
      data: '2025-10-08',
      callTime: '14:30:00',
      mentorado: true
    },
    {
      nome: 'Lucas Vilarinho',
      email: 'lucas.vilarinho@email.com',
      telefone: '(11) 99999-0107',
      origem: 'instagram',
      status: 'cliente',
      valor: 8200.00,
      obs: 'Fechou mentoria - Instagram Ativo',
      data: '2025-10-08',
      callTime: '09:00:00',
      mentorado: true
    },
    {
      nome: 'Vithoria Giacheto',
      email: 'vithoria.giacheto@email.com',
      telefone: '(11) 99999-0108',
      origem: 'formulario',
      status: 'nao_vendida',
      valor: 4500.00,
      obs: 'Não fechou - Formulário Linkbio',
      data: '2025-10-09',
      callTime: '15:00:00',
      mentorado: false
    },
    {
      nome: 'Aguinaldo Filho',
      email: 'aguinaldo.filho@email.com',
      telefone: '(11) 99999-0109',
      origem: 'indicacao',
      status: 'cliente',
      valor: 9500.00,
      obs: 'Fechou mentoria - Indicação de mentorado',
      data: '2025-10-10',
      callTime: '10:30:00',
      mentorado: true
    },
    {
      nome: 'Kathy',
      email: 'kathy@email.com',
      telefone: '(11) 99999-0110',
      origem: 'formulario',
      status: 'call_agendada',
      valor: 6000.00,
      obs: 'Formulário VD3 - Aguardando definição',
      data: '2025-10-10',
      callTime: '16:30:00',
      mentorado: false
    }
  ]

  const populateData = async () => {
    try {
      setLoading(true)
      setStatus('🔄 Limpando dados antigos...')

      // Limpar dados antigos
      const { error: deleteCallsError } = await supabase
        .from('calendar_events')
        .delete()
        .not('id', 'eq', '00000000-0000-0000-0000-000000000000')

      const { error: deleteLeadsError } = await supabase
        .from('leads')
        .delete()
        .not('id', 'eq', '00000000-0000-0000-0000-000000000000')

      setStatus('🔄 Inserindo leads reais...')

      // Inserir leads
      const leadsToInsert = realCallsData.map(call => ({
        nome_completo: call.nome,
        email: call.email,
        telefone: call.telefone,
        origem: call.origem,
        status: call.status === 'cliente' ? 'cliente' : call.status,
        valor_potencial: call.valor,
        observacoes: call.obs,
        data_primeiro_contato: `${call.data}T00:00:00Z`
      }))

      const { data: leadsInserted, error: leadsError } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select()

      if (leadsError) throw leadsError

      setStatus('🔄 Criando eventos de call...')

      // Criar eventos de call
      const callsToInsert = realCallsData.map((call, index) => {
        const lead = leadsInserted[index]
        const startDateTime = `${call.data}T${call.callTime}Z`
        const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString()

        return {
          lead_id: lead.id,
          title: `Call Comercial - ${call.nome}`,
          description: `Call de vendas com ${call.nome} - Canal: ${
            call.origem === 'instagram' ? 'Instagram Ativo' :
            call.origem === 'formulario' ? (call.nome === 'Kathy' ? 'Formulário VD3' : 'Formulário Linkbio') :
            'Indicação de mentorado'
          }`,
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          call_status: call.status === 'cliente' ? 'vendida' :
                      call.status === 'nao_vendida' ? 'nao_vendida' : 'agendada',
          sale_value: call.status === 'cliente' ? call.valor : null,
          result_notes: `Call real registrada - ${
            call.status === 'cliente' ? 'Mentoria fechada' :
            call.status === 'nao_vendida' ? 'Não fechou' :
            'Aguardando definição'
          }`,
          all_day: false
        }
      })

      const { data: callsInserted, error: callsError } = await supabase
        .from('calendar_events')
        .insert(callsToInsert)
        .select()

      if (callsError) throw callsError

      // Calcular estatísticas
      const vendidas = callsInserted.filter(c => c.call_status === 'vendida').length
      const naoVendidas = callsInserted.filter(c => c.call_status === 'nao_vendida').length
      const totalVendas = callsInserted
        .filter(c => c.call_status === 'vendida')
        .reduce((sum, c) => sum + (c.sale_value || 0), 0)

      setStatus(`✅ Sucesso! ${leadsInserted.length} leads e ${callsInserted.length} calls criadas.
                 Vendidas: ${vendidas}, Não vendidas: ${naoVendidas}, Total: R$ ${totalVendas.toLocaleString('pt-BR')}`)

    } catch (error) {
      console.error('Erro:', error)
      setStatus(`❌ Erro: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Popular Dados Reais</h1>

        <div className="space-y-4">
          <p>Este script vai inserir os dados reais das calls de outubro/2025:</p>

          <ul className="text-sm space-y-1">
            {realCallsData.map((call, i) => (
              <li key={i} className="flex justify-between">
                <span>{call.nome}</span>
                <span className={call.mentorado ? 'text-green-600' : 'text-red-600'}>
                  {call.mentorado ? 'Fechou' : 'Não fechou'}
                </span>
              </li>
            ))}
          </ul>

          <Button
            onClick={populateData}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Populando...' : 'Popular Dados Reais'}
          </Button>

          {status && (
            <div className="p-4 bg-gray-100 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">{status}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}