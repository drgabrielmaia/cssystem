// Verificar se campo indicado_por existe na tabela leads
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

async function checkIndicadoPorField() {
  try {
    console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA LEADS')
    console.log('=' .repeat(60))

    // Tentar buscar um lead com o campo indicado_por
    const { data, error } = await supabase
      .from('leads')
      .select('id, nome_completo, indicado_por')
      .limit(1)

    if (error) {
      console.log('❌ Erro ao verificar campo indicado_por:', error.message)
      if (error.message.includes('column "indicado_por" does not exist')) {
        console.log('')
        console.log('⚠️  CAMPO INDICADO_POR NÃO EXISTE!')
        console.log('   É necessário adicionar o campo à tabela leads')
        console.log('')
        console.log('🔧 COMANDO SQL PARA ADICIONAR O CAMPO:')
        console.log('   ALTER TABLE leads ADD COLUMN indicado_por UUID REFERENCES mentorados(id);')
        console.log('')
        return false
      }
      throw error
    }

    console.log('✅ Campo indicado_por existe na tabela leads!')
    console.log(`📊 Primeira linha encontrada: ${data[0]?.nome_completo || 'N/A'}`)
    console.log(`🔗 Indicado por: ${data[0]?.indicado_por || 'NULL'}`)

    // Verificar quantos leads têm indicação
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })

    const { count: leadsComIndicacao } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .not('indicado_por', 'is', null)

    console.log('')
    console.log('📈 ESTATÍSTICAS:')
    console.log(`   Total de leads: ${totalLeads}`)
    console.log(`   Leads com indicação: ${leadsComIndicacao}`)
    console.log(`   Leads sem indicação: ${totalLeads - leadsComIndicacao}`)

    return true

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return false
  }
}

checkIndicadoPorField()