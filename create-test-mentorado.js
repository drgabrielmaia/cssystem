// Script para criar mentorado de teste
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestMentorado() {
  try {
    console.log('🧪 Criando mentorado de teste...')

    const testMentorado = {
      nome: 'Kelly',
      nome_completo: 'Kelly Beatriz dos Santos',
      email: 'kellybsantoss@icloud.com',
      telefone: '(85) 99999-9999',
      estado_entrada: 'SP',
      estado_atual: 'Em progresso',
      data_entrada: '2026-01-08',
      password_hash: 'teste123', // Senha simples para teste
      status_login: 'ativo'
    }

    // Verificar se já existe
    const { data: existing, error: existError } = await supabase
      .from('mentorados')
      .select('*')
      .eq('email', testMentorado.email)
      .single()

    if (existing) {
      console.log('✅ Mentorado já existe:', existing.id)

      // Atualizar para garantir que está ativo
      const { error: updateError } = await supabase
        .from('mentorados')
        .update({
          status_login: 'ativo',
          password_hash: 'teste123'
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError)
        return
      }

      console.log('✅ Mentorado atualizado para ativo!')
      console.log('📧 Email:', testMentorado.email)
      console.log('🔑 Senha: teste123')
      console.log('🌐 Teste em: http://localhost:3000/mentorado')
      return
    }

    // Criar novo
    const { data, error } = await supabase
      .from('mentorados')
      .insert([testMentorado])
      .select()
      .single()

    if (error) {
      console.error('❌ Erro ao criar mentorado:', error)
      return
    }

    console.log('✅ Mentorado de teste criado!')
    console.log('📊 ID:', data.id)
    console.log('📧 Email:', data.email)
    console.log('🔑 Senha: teste123')
    console.log('🌐 Teste em: http://localhost:3000/mentorado')

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

createTestMentorado()