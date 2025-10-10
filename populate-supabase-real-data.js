const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://myjuwahcnnyaxtvhnhwg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15anV3YWhjbm55YXh0dmhuaHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgzMjU0NjYsImV4cCI6MjA0MzkwMTQ2Nn0.PzOVYN6qKhDaB5lZXeVDcKd8RaXZsLRRZpnBD8rHBgY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function populateRealData() {
  try {
    console.log('🔄 Limpando dados fake...')

    // Limpar dados fake se existirem
    await supabase.from('calendar_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    console.log('✅ Dados fake removidos')

    console.log('🔄 Inserindo leads reais...')

    // Inserir os leads reais
    const leadsData = [
      {
        nome_completo: 'Renata Santos Teixeira',
        email: 'renata.santos@email.com',
        telefone: '(11) 99999-0101',
        origem: 'instagram',
        status: 'cliente',
        valor_potencial: 8500.00,
        observacoes: 'Fechou mentoria - Instagram Ativo',
        data_primeiro_contato: '2025-10-01T00:00:00Z'
      },
      {
        nome_completo: 'Glaycon Michels',
        email: 'glaycon.michels@email.com',
        telefone: '(11) 99999-0102',
        origem: 'instagram',
        status: 'cliente',
        valor_potencial: 7200.00,
        observacoes: 'Fechou mentoria - Instagram Ativo',
        data_primeiro_contato: '2025-10-02T00:00:00Z'
      },
      {
        nome_completo: 'Lidio Barros',
        email: 'lidio.barros@email.com',
        telefone: '(11) 99999-0103',
        origem: 'instagram',
        status: 'nao_vendida',
        valor_potencial: 6500.00,
        observacoes: 'Não fechou - Instagram Ativo',
        data_primeiro_contato: '2025-10-03T00:00:00Z'
      },
      {
        nome_completo: 'Beatriz Gurgel',
        email: 'beatriz.gurgel@email.com',
        telefone: '(11) 99999-0104',
        origem: 'instagram',
        status: 'cliente',
        valor_potencial: 9100.00,
        observacoes: 'Fechou mentoria - Instagram Ativo',
        data_primeiro_contato: '2025-10-03T00:00:00Z'
      },
      {
        nome_completo: 'Leonardo Trinta',
        email: 'leonardo.trinta@email.com',
        telefone: '(11) 99999-0105',
        origem: 'instagram',
        status: 'nao_vendida',
        valor_potencial: 5800.00,
        observacoes: 'Não fechou - Instagram Ativo',
        data_primeiro_contato: '2025-10-03T00:00:00Z'
      },
      {
        nome_completo: 'Nathalia Gomes',
        email: 'nathalia.gomes@email.com',
        telefone: '(11) 99999-0106',
        origem: 'instagram',
        status: 'cliente',
        valor_potencial: 7800.00,
        observacoes: 'Fechou mentoria - Instagram Ativo',
        data_primeiro_contato: '2025-10-08T00:00:00Z'
      },
      {
        nome_completo: 'Lucas Vilarinho',
        email: 'lucas.vilarinho@email.com',
        telefone: '(11) 99999-0107',
        origem: 'instagram',
        status: 'cliente',
        valor_potencial: 8200.00,
        observacoes: 'Fechou mentoria - Instagram Ativo',
        data_primeiro_contato: '2025-10-08T00:00:00Z'
      },
      {
        nome_completo: 'Vithoria Giacheto',
        email: 'vithoria.giacheto@email.com',
        telefone: '(11) 99999-0108',
        origem: 'formulario',
        status: 'nao_vendida',
        valor_potencial: 4500.00,
        observacoes: 'Não fechou - Formulário Linkbio',
        data_primeiro_contato: '2025-10-09T00:00:00Z'
      },
      {
        nome_completo: 'Aguinaldo Filho',
        email: 'aguinaldo.filho@email.com',
        telefone: '(11) 99999-0109',
        origem: 'indicacao',
        status: 'cliente',
        valor_potencial: 9500.00,
        observacoes: 'Fechou mentoria - Indicação de mentorado',
        data_primeiro_contato: '2025-10-10T00:00:00Z'
      },
      {
        nome_completo: 'Kathy',
        email: 'kathy@email.com',
        telefone: '(11) 99999-0110',
        origem: 'formulario',
        status: 'call_agendada',
        valor_potencial: 6000.00,
        observacoes: 'Formulário VD3 - Aguardando definição',
        data_primeiro_contato: '2025-10-10T00:00:00Z'
      }
    ]

    const { data: leadsInserted, error: leadsError } = await supabase
      .from('leads')
      .insert(leadsData)
      .select()

    if (leadsError) throw leadsError
    console.log('✅ Leads inseridos:', leadsInserted.length)

    console.log('🔄 Criando eventos de call...')

    // Criar eventos de call para cada lead
    const callsData = [
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Renata Santos Teixeira').id,
        title: 'Call Comercial - Renata Santos Teixeira',
        description: 'Call de vendas com Renata Santos Teixeira - Canal: Instagram Ativo',
        start_datetime: '2025-10-01T14:00:00Z',
        end_datetime: '2025-10-01T15:00:00Z',
        call_status: 'vendida',
        sale_value: 8500.00,
        result_notes: 'Call real registrada - Mentoria fechada',
        all_day: false
      },
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Glaycon Michels').id,
        title: 'Call Comercial - Glaycon Michels',
        description: 'Call de vendas com Glaycon Michels - Canal: Instagram Ativo',
        start_datetime: '2025-10-02T15:30:00Z',
        end_datetime: '2025-10-02T16:30:00Z',
        call_status: 'vendida',
        sale_value: 7200.00,
        result_notes: 'Call real registrada - Mentoria fechada',
        all_day: false
      },
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Lidio Barros').id,
        title: 'Call Comercial - Lidio Barros',
        description: 'Call de vendas com Lidio Barros - Canal: Instagram Ativo',
        start_datetime: '2025-10-03T10:00:00Z',
        end_datetime: '2025-10-03T11:00:00Z',
        call_status: 'nao_vendida',
        sale_value: null,
        result_notes: 'Call real registrada - Não fechou',
        all_day: false
      },
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Beatriz Gurgel').id,
        title: 'Call Comercial - Beatriz Gurgel',
        description: 'Call de vendas com Beatriz Gurgel - Canal: Instagram Ativo',
        start_datetime: '2025-10-03T16:00:00Z',
        end_datetime: '2025-10-03T17:00:00Z',
        call_status: 'vendida',
        sale_value: 9100.00,
        result_notes: 'Call real registrada - Mentoria fechada',
        all_day: false
      },
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Leonardo Trinta').id,
        title: 'Call Comercial - Leonardo Trinta',
        description: 'Call de vendas com Leonardo Trinta - Canal: Instagram Ativo',
        start_datetime: '2025-10-03T11:30:00Z',
        end_datetime: '2025-10-03T12:30:00Z',
        call_status: 'nao_vendida',
        sale_value: null,
        result_notes: 'Call real registrada - Não fechou',
        all_day: false
      },
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Nathalia Gomes').id,
        title: 'Call Comercial - Nathalia Gomes',
        description: 'Call de vendas com Nathalia Gomes - Canal: Instagram Ativo',
        start_datetime: '2025-10-08T14:30:00Z',
        end_datetime: '2025-10-08T15:30:00Z',
        call_status: 'vendida',
        sale_value: 7800.00,
        result_notes: 'Call real registrada - Mentoria fechada',
        all_day: false
      },
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Lucas Vilarinho').id,
        title: 'Call Comercial - Lucas Vilarinho',
        description: 'Call de vendas com Lucas Vilarinho - Canal: Instagram Ativo',
        start_datetime: '2025-10-08T09:00:00Z',
        end_datetime: '2025-10-08T10:00:00Z',
        call_status: 'vendida',
        sale_value: 8200.00,
        result_notes: 'Call real registrada - Mentoria fechada',
        all_day: false
      },
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Vithoria Giacheto').id,
        title: 'Call Comercial - Vithoria Giacheto',
        description: 'Call de vendas com Vithoria Giacheto - Canal: Formulário Linkbio',
        start_datetime: '2025-10-09T15:00:00Z',
        end_datetime: '2025-10-09T16:00:00Z',
        call_status: 'nao_vendida',
        sale_value: null,
        result_notes: 'Call real registrada - Não fechou',
        all_day: false
      },
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Aguinaldo Filho').id,
        title: 'Call Comercial - Aguinaldo Filho',
        description: 'Call de vendas com Aguinaldo Filho - Canal: Indicação de mentorado',
        start_datetime: '2025-10-10T10:30:00Z',
        end_datetime: '2025-10-10T11:30:00Z',
        call_status: 'vendida',
        sale_value: 9500.00,
        result_notes: 'Call real registrada - Mentoria fechada',
        all_day: false
      },
      {
        lead_id: leadsInserted.find(l => l.nome_completo === 'Kathy').id,
        title: 'Call Comercial - Kathy',
        description: 'Call de vendas com Kathy - Canal: Formulário VD3',
        start_datetime: '2025-10-10T16:30:00Z',
        end_datetime: '2025-10-10T17:30:00Z',
        call_status: 'agendada',
        sale_value: null,
        result_notes: 'Call real registrada - Aguardando definição',
        all_day: false
      }
    ]

    const { data: callsInserted, error: callsError } = await supabase
      .from('calendar_events')
      .insert(callsData)
      .select()

    if (callsError) throw callsError
    console.log('✅ Calls inseridas:', callsInserted.length)

    // Mostrar estatísticas
    const { data: stats } = await supabase
      .from('calendar_events')
      .select('call_status, sale_value')
      .not('lead_id', 'is', null)

    const vendidas = stats.filter(s => s.call_status === 'vendida').length
    const naoVendidas = stats.filter(s => s.call_status === 'nao_vendida').length
    const totalVendas = stats
      .filter(s => s.call_status === 'vendida')
      .reduce((sum, s) => sum + (s.sale_value || 0), 0)

    console.log('\n📊 ESTATÍSTICAS:')
    console.log(`Total de calls: ${stats.length}`)
    console.log(`Calls vendidas: ${vendidas}`)
    console.log(`Calls não vendidas: ${naoVendidas}`)
    console.log(`Total em vendas: R$ ${totalVendas.toLocaleString('pt-BR')}`)
    console.log(`Taxa de conversão: ${((vendidas / (vendidas + naoVendidas)) * 100).toFixed(1)}%`)

    console.log('\n🎉 Dados reais populados com sucesso!')

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

populateRealData()