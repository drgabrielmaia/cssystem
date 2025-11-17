// Teste completo simulando o login do frontend

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRealLogin() {
  try {
    console.log('🔍 TESTE DE LOGIN REAL - SIMULANDO FRONTEND')
    console.log('=' .repeat(60))

    const testEmail = 'guilhermecezarsoares@gmail.com'
    const testPassword = 'mentoradoindica'

    console.log(`📧 Email de teste: ${testEmail}`)
    console.log(`🔑 Senha de teste: ${testPassword}`)
    console.log('')

    // Simular exatamente o que o frontend faz
    console.log('🔍 Passo 1: Buscar mentorado pelo email...')

    const { data, error } = await supabase
      .from('mentorados')
      .select('*')
      .eq('email', testEmail)
      .eq('status_login', 'ativo')
      .single()

    if (error) {
      console.log(`❌ Erro na query: ${error.message}`)
      console.log(`Código do erro: ${error.code}`)
      if (error.code === 'PGRST116') {
        console.log('❌ Nenhum mentorado encontrado com esse email e status ativo')
      }
      return
    }

    if (!data) {
      console.log('❌ Nenhum mentorado encontrado')
      return
    }

    console.log(`✅ Mentorado encontrado: ${data.nome_completo}`)
    console.log(`📧 Email: ${data.email}`)
    console.log(`🔐 Password Hash no banco: "${data.password_hash}"`)
    console.log(`📊 Status Login: ${data.status_login}`)
    console.log('')

    // Verificar senha - simular exatamente o frontend
    console.log('🔍 Passo 2: Verificar senha...')

    try {
      console.log('Tentando decodificar com atob...')

      // Simular atob do browser usando Buffer
      const storedPassword = Buffer.from(data.password_hash, 'base64').toString('utf-8')
      console.log(`🔓 Senha decodificada: "${storedPassword}"`)
      console.log(`🔑 Senha digitada: "${testPassword}"`)
      console.log(`✅ Senhas são iguais? ${testPassword === storedPassword}`)

      if (testPassword !== storedPassword) {
        console.log('❌ SENHA INCORRETA!')
        console.log(`Esperado: "${testPassword}"`)
        console.log(`Recebido: "${storedPassword}"`)

        // Debug extra
        console.log('')
        console.log('🔍 DEBUG ADICIONAL:')
        console.log(`Hash no banco (hex): ${Buffer.from(data.password_hash, 'base64').toString('hex')}`)
        console.log(`Senha esperada (hex): ${Buffer.from(testPassword, 'utf-8').toString('hex')}`)

        return
      } else {
        console.log('✅ SENHA CORRETA! Login deveria funcionar')
      }

    } catch (decodeError) {
      console.log(`❌ Erro ao decodificar hash: ${decodeError.message}`)
      console.log(`Hash problemático: "${data.password_hash}"`)
      return
    }

    console.log('')
    console.log('🎉 TESTE COMPLETO - LOGIN DEVERIA FUNCIONAR!')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

testRealLogin()