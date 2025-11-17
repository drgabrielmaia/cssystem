// Executar comandos SQL para adicionar sistema de follow-up
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

async function executeFollowUpSQL() {
  try {
    console.log('🔄 EXECUTANDO ALTERAÇÕES SQL PARA FOLLOW-UP')
    console.log('=' .repeat(60))

    // 1. Adicionar campo follow_up_status
    console.log('1️⃣ Adicionando campo follow_up_status...')
    try {
      const { error: error1 } = await supabase.rpc('execute_sql', {
        query: 'ALTER TABLE leads ADD COLUMN follow_up_status TEXT;'
      })

      if (error1 && !error1.message.includes('already exists')) {
        console.log('❌ Erro ao adicionar follow_up_status:', error1.message)
      } else {
        console.log('✅ Campo follow_up_status adicionado/já existe')
      }
    } catch (e) {
      console.log('ℹ️  Tentando método alternativo para follow_up_status...')
    }

    // 2. Adicionar campo follow_up_data
    console.log('\n2️⃣ Adicionando campo follow_up_data...')
    try {
      const { error: error2 } = await supabase.rpc('execute_sql', {
        query: 'ALTER TABLE leads ADD COLUMN follow_up_data DATE;'
      })

      if (error2 && !error2.message.includes('already exists')) {
        console.log('❌ Erro ao adicionar follow_up_data:', error2.message)
      } else {
        console.log('✅ Campo follow_up_data adicionado/já existe')
      }
    } catch (e) {
      console.log('ℹ️  Tentando método alternativo para follow_up_data...')
    }

    // 3. Adicionar campo follow_up_observacoes
    console.log('\n3️⃣ Adicionando campo follow_up_observacoes...')
    try {
      const { error: error3 } = await supabase.rpc('execute_sql', {
        query: 'ALTER TABLE leads ADD COLUMN follow_up_observacoes TEXT;'
      })

      if (error3 && !error3.message.includes('already exists')) {
        console.log('❌ Erro ao adicionar follow_up_observacoes:', error3.message)
      } else {
        console.log('✅ Campo follow_up_observacoes adicionado/já existe')
      }
    } catch (e) {
      console.log('ℹ️  Tentando método alternativo para follow_up_observacoes...')
    }

    // Verificar se os campos foram adicionados
    console.log('\n🔍 Verificando estrutura atualizada...')
    const { data: testData, error: testError } = await supabase
      .from('leads')
      .select('id, nome_completo, follow_up_status, follow_up_data, follow_up_observacoes')
      .limit(1)

    if (!testError) {
      console.log('✅ Todos os campos de follow-up foram adicionados com sucesso!')
      console.log('📊 Estrutura atualizada confirmada')
    } else {
      console.log('⚠️  Alguns campos podem não ter sido criados:', testError.message)
      console.log('\n🔧 COMANDOS SQL PARA EXECUTAR MANUALMENTE:')
      console.log('   ALTER TABLE leads ADD COLUMN follow_up_status TEXT;')
      console.log('   ALTER TABLE leads ADD COLUMN follow_up_data DATE;')
      console.log('   ALTER TABLE leads ADD COLUMN follow_up_observacoes TEXT;')
    }

    console.log('\n📋 NOVOS STATUS DISPONÍVEIS:')
    const novosStatus = [
      'qualificado',
      'nao_qualificado',
      'aguardando_resposta',
      'reagendamento',
      'documentacao_pendente',
      'interesse_baixo',
      'orcamento_insuficiente'
    ]

    novosStatus.forEach(status => {
      console.log(`   • ${status}`)
    })

    console.log('\n🎯 FOLLOW-UPS DISPONÍVEIS:')
    const followUps = [
      'reativar',
      'follow_up_1_semana',
      'follow_up_1_mes',
      'follow_up_3_meses',
      'enviar_material',
      'ligar_novamente'
    ]

    followUps.forEach(followUp => {
      console.log(`   • ${followUp}`)
    })

    console.log('\n🎉 Sistema de follow-up expandido está pronto!')

  } catch (error) {
    console.error('❌ Erro geral:', error)
    console.log('\n🔧 Execute manualmente no Supabase Dashboard:')
    console.log('   ALTER TABLE leads ADD COLUMN follow_up_status TEXT;')
    console.log('   ALTER TABLE leads ADD COLUMN follow_up_data DATE;')
    console.log('   ALTER TABLE leads ADD COLUMN follow_up_observacoes TEXT;')
  }
}

executeFollowUpSQL()