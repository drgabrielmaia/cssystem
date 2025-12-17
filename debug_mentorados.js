const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugMentorados() {
  try {
    console.log('🔍 Verificando mentorados cadastrados...\n')

    // Buscar todos os mentorados
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, status_login, excluido, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Erro ao buscar mentorados:', error)
      return
    }

    if (!mentorados || mentorados.length === 0) {
      console.log('❌ Nenhum mentorado encontrado!')
      console.log('\n💡 Criando mentorado de teste...')

      // Criar mentorado de teste
      const { data: novoMentorado, error: createError } = await supabase
        .from('mentorados')
        .insert({
          nome_completo: 'Gabriel Maia',
          email: 'gabriel@medicosderesultado.com.br',
          telefone: '(11) 99999-9999',
          status_login: 'ativo',
          excluido: false
        })
        .select()

      if (createError) {
        console.error('❌ Erro ao criar mentorado:', createError)
      } else {
        console.log('✅ Mentorado de teste criado:', novoMentorado[0])
      }
      return
    }

    console.log(`📊 Total de mentorados: ${mentorados.length}\n`)

    // Agrupar por status
    const ativos = mentorados.filter(m => m.status_login === 'ativo' && !m.excluido)
    const inativos = mentorados.filter(m => m.status_login !== 'ativo' || m.excluido)

    console.log(`✅ Mentorados ATIVOS: ${ativos.length}`)
    ativos.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.nome_completo} (${m.email})`)
    })

    console.log(`\n⚠️  Mentorados INATIVOS: ${inativos.length}`)
    inativos.forEach((m, i) => {
      const status = m.excluido ? 'EXCLUÍDO' : m.status_login?.toUpperCase() || 'SEM STATUS'
      console.log(`   ${i + 1}. ${m.nome_completo} (${m.email}) - Status: ${status}`)
    })

    // Verificar módulos de vídeo
    console.log('\n🎥 Verificando módulos de vídeo...')
    const { data: modules } = await supabase
      .from('video_modules')
      .select('*')
      .order('order_index')

    if (modules && modules.length > 0) {
      console.log(`✅ ${modules.length} módulos encontrados:`)
      modules.forEach(m => {
        console.log(`   - ${m.title} (${m.is_active ? 'Ativo' : 'Inativo'})`)
      })
    } else {
      console.log('❌ Nenhum módulo de vídeo encontrado!')
    }

    // Verificar controles de acesso
    console.log('\n🛡️ Verificando controles de acesso...')
    const { data: accessControls } = await supabase
      .from('video_access_control')
      .select(`
        *,
        mentorados(nome_completo, email),
        video_modules(title)
      `)

    if (accessControls && accessControls.length > 0) {
      console.log(`✅ ${accessControls.length} controles de acesso:`)
      accessControls.forEach(ac => {
        console.log(`   - ${ac.mentorados?.nome_completo}: ${ac.video_modules?.title} (${ac.has_access ? 'LIBERADO' : 'BLOQUEADO'})`)
      })
    } else {
      console.log('ℹ️  Nenhum controle de acesso configurado (acesso livre)')
    }

    console.log('\n🚀 PRÓXIMOS PASSOS:')
    if (ativos.length > 0) {
      console.log(`1. Use este email para testar: ${ativos[0].email}`)
      console.log('2. Acesse: https://cs.medicosderesultado.com.br/mentorado')
      console.log('3. Faça login e teste a plataforma de vídeos')
    } else {
      console.log('1. Ative pelo menos um mentorado')
      console.log('2. Configure controles de acesso se necessário')
    }

  } catch (err) {
    console.error('❌ Erro geral:', err.message)
  }
}

debugMentorados()