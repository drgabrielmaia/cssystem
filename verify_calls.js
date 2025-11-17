// Verificar se as chamadas do Supabase estão funcionando corretamente
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyCalls() {
  try {
    console.log('🔍 VERIFICANDO CALLS DO SUPABASE')
    console.log('=' .repeat(60))
    console.log(`🔗 URL: ${supabaseUrl}`)
    console.log(`🔑 Key: ${supabaseAnonKey.substring(0, 20)}...`)
    console.log('')

    // Teste 1: Verificar conexão básica
    console.log('📡 Teste 1: Verificar conexão básica...')
    const { data: testData, error: testError } = await supabase
      .from('mentorados')
      .select('count')
      .limit(1)

    if (testError) {
      console.log('❌ Erro na conexão básica:', testError)
      return
    } else {
      console.log('✅ Conexão funcionando')
    }

    // Teste 2: Buscar Guilherme especificamente
    console.log('')
    console.log('📡 Teste 2: Buscar Guilherme especificamente...')
    const { data: guilherme, error: guilhermeError } = await supabase
      .from('mentorados')
      .select('*')
      .eq('email', 'guilhermecezarsoares@gmail.com')
      .single()

    if (guilhermeError) {
      console.log('❌ Erro ao buscar Guilherme:', guilhermeError)
      console.log('Código:', guilhermeError.code)
      console.log('Mensagem:', guilhermeError.message)
    } else {
      console.log('✅ Guilherme encontrado:')
      console.log('  ID:', guilherme.id)
      console.log('  Nome:', guilherme.nome_completo)
      console.log('  Email:', guilherme.email)
      console.log('  Status:', guilherme.status_login)
      console.log('  Hash:', guilherme.password_hash)
    }

    // Teste 3: Buscar com filtros do frontend
    console.log('')
    console.log('📡 Teste 3: Simular exatamente o frontend...')
    const { data: frontendData, error: frontendError } = await supabase
      .from('mentorados')
      .select('*')
      .eq('email', 'guilhermecezarsoares@gmail.com')
      .eq('status_login', 'ativo')
      .single()

    if (frontendError) {
      console.log('❌ Erro no teste do frontend:', frontendError)
      console.log('Código:', frontendError.code)
      console.log('Mensagem:', frontendError.message)

      // Se for PGRST116, significa que não encontrou registros
      if (frontendError.code === 'PGRST116') {
        console.log('🔍 Investigando: Nenhum registro encontrado...')

        // Verificar se existe com email
        const { data: semStatus, error: semStatusError } = await supabase
          .from('mentorados')
          .select('*')
          .eq('email', 'guilhermecezarsoares@gmail.com')

        if (semStatusError) {
          console.log('❌ Erro ao buscar sem filtro de status:', semStatusError)
        } else if (semStatus && semStatus.length > 0) {
          console.log('🔍 Registro encontrado SEM filtro de status:')
          semStatus.forEach(registro => {
            console.log(`  Status no banco: "${registro.status_login}"`)
            console.log(`  Comparação: "${registro.status_login}" === "ativo" ? ${registro.status_login === 'ativo'}`)
          })
        } else {
          console.log('❌ Nenhum registro encontrado nem mesmo sem filtro de status')
        }
      }
    } else {
      console.log('✅ Frontend test funcionando:')
      console.log('  ID:', frontendData.id)
      console.log('  Nome:', frontendData.nome_completo)
      console.log('  Email:', frontendData.email)
      console.log('  Status:', frontendData.status_login)
      console.log('  Hash:', frontendData.password_hash)
    }

    // Teste 4: Verificar permissões RLS
    console.log('')
    console.log('📡 Teste 4: Verificar permissões RLS...')
    const { data: allMentorados, error: allError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, status_login')
      .limit(5)

    if (allError) {
      console.log('❌ Erro ao buscar todos os mentorados (problema de RLS?):', allError)
    } else {
      console.log('✅ Conseguiu buscar mentorados:', allMentorados.length, 'registros')
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

verifyCalls()