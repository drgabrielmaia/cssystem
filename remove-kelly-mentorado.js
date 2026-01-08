// Script para remover kelly como mentorada
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function removeKellyMentorado() {
  try {
    console.log('🗑️ Removendo Kelly da tabela mentorados...')

    // Buscar kelly na tabela mentorados
    const { data: kellyMentorado, error: searchError } = await supabase
      .from('mentorados')
      .select('*')
      .eq('email', 'kellybsantoss@icloud.com')

    if (searchError) {
      console.error('❌ Erro ao buscar:', searchError)
      return
    }

    if (!kellyMentorado || kellyMentorado.length === 0) {
      console.log('✅ Kelly não está na tabela mentorados')
      return
    }

    console.log(`📋 Encontrados ${kellyMentorado.length} registro(s):`)
    kellyMentorado.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}`)
      console.log(`      Nome: ${record.nome_completo}`)
      console.log(`      Email: ${record.email}`)
      console.log(`      Criado em: ${record.created_at}`)
    })

    // Remover todos os registros
    const { error: deleteError } = await supabase
      .from('mentorados')
      .delete()
      .eq('email', 'kellybsantoss@icloud.com')

    if (deleteError) {
      console.error('❌ Erro ao remover:', deleteError)
      return
    }

    console.log('✅ Kelly removida da tabela mentorados!')
    console.log('💡 Kelly deve continuar como membro da organização normalmente')

    // Verificar organização
    const { data: orgUser, error: orgError } = await supabase
      .from('organization_users')
      .select('*')
      .eq('email', 'kellybsantoss@icloud.com')

    if (orgError) {
      console.error('❌ Erro ao verificar organização:', orgError)
      return
    }

    if (orgUser && orgUser.length > 0) {
      console.log('✅ Kelly ainda está na organização como:')
      orgUser.forEach(user => {
        console.log(`   - Organização: ${user.organization_id}`)
        console.log(`   - Role: ${user.role}`)
        console.log(`   - Status: ${user.user_id ? 'Ativo' : 'Convite pendente'}`)
      })
    } else {
      console.log('⚠️  Kelly não está em nenhuma organização!')
    }

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

removeKellyMentorado()