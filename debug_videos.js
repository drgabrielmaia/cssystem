const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugVideosPlatform() {
  try {
    console.log('🔍 DEBUG: Plataforma de Vídeos\n')

    // 1. Verificar tabelas existem
    console.log('1️⃣ Verificando se tabelas existem...')

    try {
      await supabase.from('video_modules').select('count', { count: 'exact', head: true })
      console.log('✅ video_modules existe')
    } catch (e) {
      console.log('❌ video_modules não existe:', e.message)
    }

    try {
      await supabase.from('video_lessons').select('count', { count: 'exact', head: true })
      console.log('✅ video_lessons existe')
    } catch (e) {
      console.log('❌ video_lessons não existe:', e.message)
    }

    try {
      await supabase.from('video_access_control').select('count', { count: 'exact', head: true })
      console.log('✅ video_access_control existe')
    } catch (e) {
      console.log('❌ video_access_control não existe:', e.message)
    }

    // 2. Testar queries da página admin
    console.log('\n2️⃣ Testando queries da página admin...')

    console.log('🔍 Buscando módulos...')
    const { data: modules, error: modulesError } = await supabase
      .from('video_modules')
      .select('*')
      .eq('is_active', true)
      .order('order_index')

    if (modulesError) {
      console.log('❌ Erro ao buscar módulos:', modulesError)
    } else {
      console.log(`✅ ${modules?.length || 0} módulos encontrados`)
      modules?.forEach(m => console.log(`   - ${m.title}`))
    }

    console.log('\n🔍 Buscando mentorados...')
    const { data: mentorados, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, status_login')
      .eq('excluido', false)
      .eq('status_login', 'ativo')
      .order('nome_completo')

    if (mentoradosError) {
      console.log('❌ Erro ao buscar mentorados:', mentoradosError)
    } else {
      console.log(`✅ ${mentorados?.length || 0} mentorados ativos`)
    }

    console.log('\n🔍 Buscando controles de acesso...')
    const { data: access, error: accessError } = await supabase
      .from('video_access_control')
      .select('*')

    if (accessError) {
      console.log('❌ Erro ao buscar controles:', accessError)
    } else {
      console.log(`✅ ${access?.length || 0} controles de acesso`)
    }

    // 3. Testar RLS policies
    console.log('\n3️⃣ Testando inserção (para verificar RLS)...')

    const { data: insertTest, error: insertError } = await supabase
      .from('video_modules')
      .insert({
        title: 'Teste RLS',
        description: 'Testando permissões',
        order_index: 999
      })
      .select()

    if (insertError) {
      console.log('❌ RLS bloqueando inserção (esperado):', insertError.message)
    } else {
      console.log('✅ Inserção funcionou - RLS pode estar desabilitado')

      // Limpar o teste
      await supabase
        .from('video_modules')
        .delete()
        .eq('title', 'Teste RLS')
    }

    // 4. Verificar autenticação
    console.log('\n4️⃣ Verificando autenticação...')
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      console.log('✅ Usuário autenticado:', user.email)
    } else {
      console.log('❌ Nenhum usuário autenticado')
    }

    console.log('\n🚀 DIAGNÓSTICO COMPLETO!')
    console.log('\nPara verificar a página funcionando:')
    console.log('1. Acesse: https://cs.medicosderesultado.com.br/admin/videos')
    console.log('2. Verifique o console do browser (F12)')
    console.log('3. Teste: https://cs.medicosderesultado.com.br/admin/videos/access')

  } catch (err) {
    console.error('❌ Erro geral:', err)
  }
}

debugVideosPlatform()