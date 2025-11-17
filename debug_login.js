// Debug script que simula EXATAMENTE o frontend
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugLogin() {
  try {
    console.log('🔍 DEBUG DO LOGIN - SIMULANDO EXATAMENTE O FRONTEND')
    console.log('=' .repeat(60))

    const email = 'guilhermecezarsoares@gmail.com'
    const password = 'mentoradoindica'

    console.log('🔍 Iniciando login com:', email)

    // Buscar mentorado pelo email e verificar senha
    const { data, error } = await supabase
      .from('mentorados')
      .select('*')
      .eq('email', email)
      .eq('status_login', 'ativo')
      .single()

    console.log('📊 Resultado da query:', { data, error })

    if (error || !data) {
      console.log('❌ Erro na query ou mentorado não encontrado:', error)
      console.log('Frontend mostraria: "Email não encontrado ou conta inativa"')
      return
    }

    console.log('✅ Mentorado encontrado:', data.nome_completo)
    console.log('🔐 Hash no banco:', data.password_hash)

    // Verificar senha (decodificar base64) - EXATAMENTE como no frontend
    const storedPassword = atob(data.password_hash)
    console.log('🔓 Senha decodificada:', storedPassword)
    console.log('🔑 Senha digitada:', password)
    console.log('✅ Senhas iguais?', password === storedPassword)

    if (password !== storedPassword) {
      console.log('❌ Frontend mostraria: "Senha incorreta"')
      return
    }

    console.log('🎉 Login bem-sucedido!')
    console.log('Frontend deveria:')
    console.log('1. setMentorado(data)')
    console.log('2. setIsLoggedIn(true)')
    console.log('3. localStorage.setItem("mentorado", JSON.stringify(data))')
    console.log('4. Carregar indicações')

    // Simular carregamento de indicações
    const { data: indicacoes, error: errorIndicacoes } = await supabase
      .from('leads')
      .select('*')
      .eq('indicado_por', data.id)
      .order('created_at', { ascending: false })

    console.log('')
    console.log('📋 Indicações encontradas:', indicacoes?.length || 0)

    if (errorIndicacoes) {
      console.log('❌ Erro ao carregar indicações:', errorIndicacoes)
    } else {
      console.log('✅ Indicações carregadas com sucesso')
    }

    console.log('')
    console.log('🎯 CONCLUSÃO: Login deveria funcionar perfeitamente!')

  } catch (error) {
    console.error('❌ Erro geral no debug:', error)
  }
}

// Simular atob do browser (para testar se há diferença)
global.atob = function(str) {
  return Buffer.from(str, 'base64').toString('utf-8')
}

debugLogin()