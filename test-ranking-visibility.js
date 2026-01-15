import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

const ADMIN_ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b';

async function testRankingVisibility() {
  console.log('🏆 TESTANDO VISIBILIDADE DO RANKING');
  console.log('='.repeat(60));

  try {
    console.log('👥 1. SIMULANDO CARREGAMENTO DO RANKING...');

    // Simular exatamente o que o código faz na página do mentorado
    // Step 1: Get all mentorados from the admin organization
    const { data: allMentorados, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, organization_id')
      .eq('excluido', false)
      .eq('organization_id', ADMIN_ORG_ID)
      .order('nome_completo')

    if (mentoradosError) {
      console.error('❌ Erro ao carregar mentorados:', mentoradosError)
      return
    }

    console.log(`✅ ${allMentorados.length} mentorados encontrados`)

    // Step 2: Get ranking data from the view
    const viewResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/view_dashboard_comissoes_mentorado?select=mentorado_id,total_indicacoes,indicacoes_vendidas,total_comissoes,valor_medio_comissao`,
      { headers }
    )

    let viewData = [];
    if (viewResponse.ok) {
      viewData = await viewResponse.json();
      console.log(`📊 View retornou ${viewData.length} registros com dados de comissão`)
    } else {
      console.log(`⚠️ Erro na view: ${viewResponse.status}`)
    }

    // Step 3: Create ranking with all mentorados, filling in 0 values for those without data
    const rankingFormatted = allMentorados?.map((mentorado) => {
      const rankingData = viewData?.find(item => item.mentorado_id === mentorado.id)

      return {
        mentorado_id: mentorado.id,
        nome_completo: mentorado.nome_completo,
        total_indicacoes: rankingData?.total_indicacoes || 0,
        indicacoes_vendidas: rankingData?.indicacoes_vendidas || 0,
        total_comissoes: rankingData?.total_comissoes || 0,
        valor_medio_comissao: rankingData?.valor_medio_comissao || 0
      }
    }).sort((a, b) => b.total_indicacoes - a.total_indicacoes) || []

    console.log(`\\n🏆 2. RESULTADO DO RANKING:`)
    console.log(`📊 Total de mentorados no ranking: ${rankingFormatted.length}`)

    if (rankingFormatted.length > 0) {
      console.log('\\n🥇 TOP 10 DO RANKING:')
      rankingFormatted.slice(0, 10).forEach((item, index) => {
        console.log(`  ${index + 1}º. ${item.nome_completo} - ${item.total_indicacoes} indicações`)
      })

      console.log('\\n🎯 CONDIÇÕES PARA EXIBIR O RANKING:')
      console.log(`   • showRanking: true (sempre)`)
      console.log(`   • ranking.length: ${rankingFormatted.length} (> 0 ✅)`)
      console.log(`   • Ranking deve aparecer: SIM ✅`)

    } else {
      console.log('❌ Ranking vazio - não apareceria na tela')
    }

    // Test the actual API call from the frontend perspective
    console.log('\\n🔧 3. TESTANDO CHAMADA DO FRONTEND...')

    // Simulate what the loadRankingData function does
    const frontendMentoradosResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,organization_id&excluido=eq.false&organization_id=eq.${ADMIN_ORG_ID}&order=nome_completo`,
      { headers }
    )

    if (frontendMentoradosResponse.ok) {
      const frontendMentorados = await frontendMentoradosResponse.json()
      console.log(`✅ Frontend carregaria ${frontendMentorados.length} mentorados`)

      if (frontendMentorados.length > 0) {
        console.log('✅ Ranking DEVE aparecer na tela do mentorado!')
      } else {
        console.log('❌ Ranking NÃO apareceria - nenhum mentorado encontrado')
      }
    }

    // Verificar se existe algum problema de estado no showRanking
    console.log('\\n🔍 4. VERIFICANDO POSSÍVEIS CAUSAS...')

    // Check if the user might be accessing from a different organization
    const allOrgsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=organization_id&excluido=eq.false`,
      { headers }
    )

    if (allOrgsResponse.ok) {
      const allMentoradosData = await allOrgsResponse.json()
      const orgGroups = {}

      allMentoradosData.forEach(m => {
        const orgId = m.organization_id || 'null'
        if (!orgGroups[orgId]) {
          orgGroups[orgId] = 0
        }
        orgGroups[orgId]++
      })

      console.log('📊 Distribuição por organização:')
      Object.keys(orgGroups).forEach(orgId => {
        const isCorrect = orgId === ADMIN_ORG_ID
        console.log(`   ${orgId}: ${orgGroups[orgId]} mentorados ${isCorrect ? '✅' : '❌'}`)
      })
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
  }

  console.log('\\n' + '='.repeat(60))
  console.log('💡 DIAGNÓSTICO RANKING:')
  console.log('   1. Se ranking tem dados: deve aparecer')
  console.log('   2. Se usuário está em org diferente: não verá ranking')
  console.log('   3. Verificar console do browser para erros JavaScript')
}

// Fake supabase client for this test
const supabase = {
  from: (table) => ({
    select: (fields) => ({
      eq: (field, value) => ({
        eq: (field2, value2) => ({
          order: (orderField) => ({
            then: async () => {
              // Make the actual API call
              const response = await fetch(
                `${SUPABASE_URL}/rest/v1/${table}?select=${fields}&${field}=eq.${value}&${field2}=eq.${value2}&order=${orderField}`,
                { headers }
              )
              if (response.ok) {
                const data = await response.json()
                return { data, error: null }
              } else {
                return { data: null, error: { message: `HTTP ${response.status}` } }
              }
            }
          })
        })
      })
    })
  })
}

// Add then method to handle the promise-like syntax
Object.getPrototypeOf(supabase.from('').select('').eq('', '').eq('', '').order('')).then = async function() {
  return this
}

// Execute test
testRankingVisibility()