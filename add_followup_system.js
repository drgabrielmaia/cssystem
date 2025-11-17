// Adicionar sistema de follow-up expandido
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

async function addFollowUpSystem() {
  try {
    console.log('🔄 ADICIONANDO SISTEMA DE FOLLOW-UP EXPANDIDO')
    console.log('=' .repeat(60))

    console.log('📋 NOVOS STATUS E FOLLOW-UPS QUE SERÃO ADICIONADOS:')
    console.log('')

    console.log('🆕 NOVOS STATUS DE LEADS:')
    console.log('   • qualificado - Lead passou na qualificação')
    console.log('   • nao_qualificado - Lead não atende aos critérios')
    console.log('   • aguardando_resposta - Esperando retorno do lead')
    console.log('   • reagendamento - Precisa reagendar call')
    console.log('   • documentacao_pendente - Aguardando documentos')
    console.log('   • interesse_baixo - Lead com pouco interesse')
    console.log('   • orcamento_insuficiente - Não tem orçamento adequado')
    console.log('')

    console.log('📅 FOLLOW-UPS DISPONÍVEIS:')
    console.log('   • reativar - Lead para ser reativado')
    console.log('   • follow_up_1_semana - Agendar follow-up em 1 semana')
    console.log('   • follow_up_1_mes - Agendar follow-up em 1 mês')
    console.log('   • follow_up_3_meses - Agendar follow-up em 3 meses')
    console.log('   • enviar_material - Enviar material educativo')
    console.log('   • ligar_novamente - Ligar novamente em X dias')
    console.log('')

    console.log('🔧 COMANDO SQL PARA ADICIONAR CAMPO FOLLOW_UP:')
    console.log('ALTER TABLE leads ADD COLUMN follow_up_status TEXT;')
    console.log('ALTER TABLE leads ADD COLUMN follow_up_data DATE;')
    console.log('ALTER TABLE leads ADD COLUMN follow_up_observacoes TEXT;')
    console.log('')

    console.log('⚠️  NOTA: Execute estes comandos SQL manualmente no Supabase Dashboard')
    console.log('    em Database > SQL Editor para adicionar os campos.')
    console.log('')

    console.log('📝 STATUS COMPLETOS SUGERIDOS:')
    const statusCompletos = [
      'novo',
      'contactado',
      'qualificado',
      'nao_qualificado',
      'call_agendada',
      'proposta_enviada',
      'aguardando_resposta',
      'reagendamento',
      'documentacao_pendente',
      'interesse_baixo',
      'orcamento_insuficiente',
      'vendido',
      'perdido',
      'no_show'
    ]

    statusCompletos.forEach((status, index) => {
      console.log(`   ${index + 1}. ${status}`)
    })

    console.log('')
    console.log('🎯 FOLLOW-UPS DISPONÍVEIS:')
    const followUps = [
      'reativar',
      'follow_up_1_semana',
      'follow_up_1_mes',
      'follow_up_3_meses',
      'enviar_material',
      'ligar_novamente'
    ]

    followUps.forEach((followUp, index) => {
      console.log(`   ${index + 1}. ${followUp}`)
    })

    console.log('')
    console.log('✅ Estrutura planejada com sucesso!')
    console.log('   Execute os comandos SQL no Supabase para implementar.')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

addFollowUpSystem()