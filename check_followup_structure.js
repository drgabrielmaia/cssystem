// Verificar estrutura atual de follow-up no banco
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

async function checkFollowUpStructure() {
  try {
    console.log('🔍 VERIFICANDO ESTRUTURA DE FOLLOW-UP')
    console.log('=' .repeat(60))

    // Verificar se existe tabela de follow-ups
    console.log('📋 Verificando tabela follow_ups...')
    const { data: followUps, error: followUpError } = await supabase
      .from('follow_ups')
      .select('*')
      .limit(5)

    if (followUpError) {
      console.log('❌ Erro ao acessar follow_ups:', followUpError.message)

      // Verificar se existe campo follow_up_status na tabela leads
      console.log('\n📋 Verificando campo follow_up_status na tabela leads...')
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, nome_completo, status, follow_up_status')
        .limit(5)

      if (leadsError) {
        console.log('❌ Campo follow_up_status não existe na tabela leads')
        console.log('⚠️  É necessário criar estrutura de follow-up')
      } else {
        console.log('✅ Campo follow_up_status encontrado na tabela leads')
        console.log('\n📊 Exemplos de follow_up_status:')
        leads.forEach(lead => {
          console.log(`   • ${lead.nome_completo}: ${lead.follow_up_status || 'NULL'}`)
        })
      }
    } else {
      console.log('✅ Tabela follow_ups encontrada!')
      console.log(`📊 Total de registros: ${followUps.length}`)

      if (followUps.length > 0) {
        console.log('\n📋 Estrutura dos follow-ups:')
        console.log(JSON.stringify(followUps[0], null, 2))
      }
    }

    // Verificar status únicos nos leads
    console.log('\n🔍 Analisando status únicos nos leads...')
    const { data: statusData, error: statusError } = await supabase
      .from('leads')
      .select('status')

    if (!statusError && statusData) {
      const uniqueStatuses = [...new Set(statusData.map(item => item.status))]
      console.log('📝 Status atuais dos leads:')
      uniqueStatuses.forEach(status => {
        console.log(`   • ${status}`)
      })
    }

    console.log('\n💡 NOVAS OPÇÕES DE FOLLOW-UP SUGERIDAS:')
    console.log('   • nao_qualificado - Lead não atende aos critérios')
    console.log('   • aguardando_resposta - Esperando retorno do lead')
    console.log('   • reativar - Lead para ser reativado')
    console.log('   • proposta_enviada - Proposta comercial enviada')
    console.log('   • reagendamento - Precisa reagendar call')
    console.log('   • documentacao_pendente - Aguardando documentos')
    console.log('   • follow_up_1_semana - Agendar follow-up em 1 semana')
    console.log('   • follow_up_1_mes - Agendar follow-up em 1 mês')
    console.log('   • interesse_baixo - Lead com pouco interesse')
    console.log('   • orcamento_insuficiente - Não tem orçamento adequado')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

checkFollowUpStructure()