// Migrar leads vendidos de novembro para tabela lead_vendas
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Variáveis de ambiente não encontradas')
  console.log('Precisa: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function migrateVendasNovembro() {
  try {
    console.log('🔄 MIGRANDO VENDAS DE NOVEMBRO PARA LEAD_VENDAS')
    console.log('=' .repeat(60))

    const leadsVendidos = [
      {
        nome: 'Maria Vitoria Coutinho',
        telefone: '(34) 9211-8560',
        valor_vendido: 40000,
        valor_arrecadado: 30000
      },
      {
        nome: 'Caio de Macena',
        valor_vendido: 40000,
        valor_arrecadado: 40000
      },
      {
        nome: 'Daniella Alencar',
        telefone: '(61) 9942-2397',
        valor_vendido: 40000,
        valor_arrecadado: 23796
      },
      {
        nome: 'Mila Cruz',
        telefone: '(71) 8510-2440',
        valor_vendido: 40000,
        valor_arrecadado: 30000
      },
      {
        nome: 'Ruan Mathias Sousa Dias',
        telefone: '(83) 9900-6117',
        valor_vendido: 40000,
        valor_arrecadado: 5000
      }
    ]

    console.log(`📊 Processando ${leadsVendidos.length} leads vendidos...`)

    for (const leadInfo of leadsVendidos) {
      console.log(`\n🔍 Buscando: ${leadInfo.nome}`)

      // Buscar lead na base de dados
      const { data: leads, error: searchError } = await supabase
        .from('leads')
        .select('id, nome_completo, telefone, status, valor_vendido, valor_arrecadado')
        .ilike('nome_completo', `%${leadInfo.nome}%`)

      if (searchError) {
        console.log(`❌ Erro ao buscar ${leadInfo.nome}:`, searchError.message)
        continue
      }

      if (!leads || leads.length === 0) {
        console.log(`⚠️  Lead não encontrado: ${leadInfo.nome}`)
        continue
      }

      if (leads.length > 1) {
        console.log(`⚠️  Múltiplos leads encontrados para ${leadInfo.nome}:`)
        leads.forEach(lead => console.log(`   - ${lead.nome_completo} (${lead.telefone})`))
        console.log(`   Usando o primeiro: ${leads[0].nome_completo}`)
      }

      const lead = leads[0]
      console.log(`✅ Lead encontrado: ${lead.nome_completo} (ID: ${lead.id})`)

      // Atualizar status para vendido se não estiver
      if (lead.status !== 'vendido') {
        console.log(`📝 Atualizando status para vendido...`)
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            status: 'vendido',
            valor_vendido: leadInfo.valor_vendido,
            valor_arrecadado: leadInfo.valor_arrecadado,
            convertido_em: new Date('2025-11-01').toISOString()
          })
          .eq('id', lead.id)

        if (updateError) {
          console.log(`❌ Erro ao atualizar lead:`, updateError.message)
          continue
        }
      }

      // Verificar se já existe na lead_vendas
      const { data: existingVenda, error: checkError } = await supabase
        .from('lead_vendas')
        .select('id')
        .eq('lead_id', lead.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.log(`❌ Erro ao verificar lead_vendas:`, checkError.message)
        continue
      }

      if (existingVenda) {
        console.log(`⚠️  Já existe registro na lead_vendas, atualizando...`)
        const { error: updateVendaError } = await supabase
          .from('lead_vendas')
          .update({
            valor_vendido: leadInfo.valor_vendido,
            valor_arrecadado: leadInfo.valor_arrecadado,
            data_venda: '2025-11-01',
            data_arrecadacao: leadInfo.valor_arrecadado > 0 ? '2025-11-01' : null,
            status_pagamento: leadInfo.valor_arrecadado >= leadInfo.valor_vendido ? 'pago' : 'parcial',
            observacoes: 'Migração manual - dados de novembro 2025'
          })
          .eq('lead_id', lead.id)

        if (updateVendaError) {
          console.log(`❌ Erro ao atualizar lead_vendas:`, updateVendaError.message)
        } else {
          console.log(`✅ Registro atualizado na lead_vendas`)
        }
      } else {
        console.log(`💾 Criando registro na lead_vendas...`)
        const { error: insertError } = await supabase
          .from('lead_vendas')
          .insert([{
            lead_id: lead.id,
            valor_vendido: leadInfo.valor_vendido,
            valor_arrecadado: leadInfo.valor_arrecadado,
            data_venda: '2025-11-01',
            data_arrecadacao: leadInfo.valor_arrecadado > 0 ? '2025-11-01' : null,
            parcelas: 1,
            tipo_venda: 'direta',
            status_pagamento: leadInfo.valor_arrecadado >= leadInfo.valor_vendido ? 'pago' : 'parcial',
            observacoes: 'Migração manual - dados de novembro 2025'
          }])

        if (insertError) {
          console.log(`❌ Erro ao inserir na lead_vendas:`, insertError.message)
        } else {
          console.log(`✅ Registro criado na lead_vendas`)
        }
      }

      console.log(`📊 Vendido: R$ ${leadInfo.valor_vendido.toLocaleString()}, Arrecadado: R$ ${leadInfo.valor_arrecadado.toLocaleString()}`)
    }

    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA!')
    console.log('=' .repeat(60))

    // Verificar resultado final
    const { data: vendasCount, error: countError } = await supabase
      .from('lead_vendas')
      .select('*', { count: 'exact' })
      .gte('data_venda', '2025-11-01')
      .lt('data_venda', '2025-12-01')

    if (!countError) {
      console.log(`📈 Total de vendas em novembro 2025: ${vendasCount?.length || 0}`)

      const totalVendido = vendasCount?.reduce((sum, venda) => sum + (venda.valor_vendido || 0), 0) || 0
      const totalArrecadado = vendasCount?.reduce((sum, venda) => sum + (venda.valor_arrecadado || 0), 0) || 0

      console.log(`💰 Total vendido: R$ ${totalVendido.toLocaleString()}`)
      console.log(`💵 Total arrecadado: R$ ${totalArrecadado.toLocaleString()}`)
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

migrateVendasNovembro()