// Teste do login usando puppeteer ou similar para simular navegador real
const fs = require('fs')
const path = require('path')

// Como não temos puppeteer, vou simular o que aconteceria no navegador
async function simulateBrowserLogin() {
  try {
    console.log('🌐 SIMULANDO LOGIN NO NAVEGADOR')
    console.log('=' .repeat(60))

    // Simular as variáveis globais do navegador
    global.atob = function(str) {
      return Buffer.from(str, 'base64').toString('utf-8')
    }

    // Simular localStorage
    const localStorage = {
      data: {},
      setItem: function(key, value) {
        this.data[key] = value
        console.log(`💾 localStorage.setItem("${key}", ...)`)
      },
      getItem: function(key) {
        return this.data[key] || null
      }
    }

    // Simular fetch/supabase
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      'https://udzmlnnztzzwrphhizol.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'
    )

    // Simular exatamente o que o formulário HTML faria
    const email = 'guilhermecezarsoares@gmail.com'
    const password = 'mentoradoindica'

    console.log('📧 Email:', email)
    console.log('🔑 Senha:', password)
    console.log('')

    console.log('🔍 Simulando handleLogin...')

    // Passo 1: Buscar mentorado
    console.log('📡 Buscando mentorado no banco...')
    const { data, error } = await supabase
      .from('mentorados')
      .select('*')
      .eq('email', email)
      .eq('status_login', 'ativo')
      .single()

    if (error || !data) {
      console.log('❌ FALHA: Email não encontrado ou conta inativa')
      console.log('Error:', error)
      return false
    }

    console.log('✅ Mentorado encontrado:', data.nome_completo)

    // Passo 2: Verificar senha
    console.log('🔓 Decodificando senha...')
    const storedPassword = atob(data.password_hash)

    console.log('Senha decodificada:', `"${storedPassword}"`)
    console.log('Senha digitada:   ', `"${password}"`)
    console.log('Iguais?:', password === storedPassword)

    if (password !== storedPassword) {
      console.log('❌ FALHA: Senha incorreta')
      return false
    }

    console.log('✅ Senha correta!')

    // Passo 3: Salvar no localStorage (simulado)
    localStorage.setItem('mentorado', JSON.stringify(data))

    // Passo 4: Carregar indicações
    console.log('📋 Carregando indicações...')
    const { data: indicacoes, error: errorIndicacoes } = await supabase
      .from('leads')
      .select('*')
      .eq('indicado_por', data.id)
      .order('created_at', { ascending: false })

    if (errorIndicacoes) {
      console.log('⚠️  Erro ao carregar indicações:', errorIndicacoes.message)
    } else {
      console.log('✅ Indicações carregadas:', indicacoes?.length || 0, 'encontradas')
    }

    console.log('')
    console.log('🎉 LOGIN SIMULADO COM SUCESSO!')
    console.log('🎯 O login deveria funcionar no navegador real também!')

    return true

  } catch (error) {
    console.log('❌ ERRO na simulação:', error.message)
    return false
  }
}

// Executar teste
simulateBrowserLogin().then(success => {
  if (success) {
    console.log('\n✅ CONCLUSÃO: Login deve funcionar no navegador!')
  } else {
    console.log('\n❌ CONCLUSÃO: Há problemas no login!')
  }
})