// Script para criar dívidas de teste para Ana Luísa
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAnaLuisaDividas() {
  try {
    console.log('💰 Criando dívidas de teste para Ana Luísa...')

    // 1. Buscar Ana Luísa na tabela mentorados
    const { data: anaLuisa, error: anaError } = await supabase
      .from('mentorados')
      .select('*')
      .eq('nome_completo', 'Ana Luisa Brito')
      .single()

    if (anaError || !anaLuisa) {
      console.error('❌ Ana Luísa não encontrada:', anaError)
      return
    }

    console.log(`✅ Ana Luísa encontrada: ${anaLuisa.id}`)
    console.log(`   Email: ${anaLuisa.email}`)
    console.log(`   Organização: ${anaLuisa.organization_id}`)

    // 2. Verificar se já tem dívidas
    const { data: dividasExistentes } = await supabase
      .from('dividas')
      .select('*')
      .eq('mentorado_id', anaLuisa.id)

    console.log(`📊 Dívidas existentes: ${dividasExistentes?.length || 0}`)

    if (dividasExistentes && dividasExistentes.length > 0) {
      console.log('💡 Ana Luísa já tem dívidas cadastradas:')
      dividasExistentes.forEach((d, index) => {
        console.log(`   ${index + 1}. R$ ${d.valor} - ${d.status} - Venc: ${d.data_vencimento}`)
      })

      console.log('\n❓ Deseja criar mais dívidas mesmo assim? Cancelando para evitar duplicatas...')
      return
    }

    // 3. Criar dívidas de teste
    const hoje = new Date()
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 15)
    const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 10)

    const dividasParaCriar = [
      {
        mentorado_id: anaLuisa.id,
        mentorado_nome: anaLuisa.nome_completo,
        valor: 350.00,
        data_vencimento: mesPassado.toISOString().split('T')[0], // Atrasada
        status: 'atrasado',
        observacoes: 'Mensalidade de dezembro - Em atraso'
      },
      {
        mentorado_id: anaLuisa.id,
        mentorado_nome: anaLuisa.nome_completo,
        valor: 350.00,
        data_vencimento: proximoMes.toISOString().split('T')[0], // Próximo mês
        status: 'pendente',
        observacoes: 'Mensalidade de janeiro'
      },
      {
        mentorado_id: anaLuisa.id,
        mentorado_nome: anaLuisa.nome_completo,
        valor: 750.00,
        data_vencimento: '2026-02-15',
        status: 'pendente',
        observacoes: 'Taxa de mentoria personalizada'
      }
    ]

    // 4. Inserir dívidas
    const { data: novasDividas, error: insercaoError } = await supabase
      .from('dividas')
      .insert(dividasParaCriar)
      .select()

    if (insercaoError) {
      console.error('❌ Erro ao criar dívidas:', insercaoError)
      return
    }

    console.log('✅ Dívidas criadas com sucesso!')
    console.log(`📊 Total de dívidas criadas: ${novasDividas?.length || 0}`)

    novasDividas?.forEach((d, index) => {
      console.log(`   ${index + 1}. R$ ${d.valor}`)
      console.log(`      Status: ${d.status}`)
      console.log(`      Vencimento: ${d.data_vencimento}`)
      console.log(`      Obs: ${d.observacoes}`)
    })

    console.log('\n🎯 Ana Luísa agora deve aparecer na página de pendências!')

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

createAnaLuisaDividas()