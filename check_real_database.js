const { createClient } = require('@supabase/supabase-js')

// Service role key para ter acesso completo
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTYzNTY3NiwiZXhwIjoyMDQ1MjExNjc2fQ.g6lJLaOQ9CW4PGNJYHMq_xyunTWtMiMGrcdUTD-W7jQ'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkRealDatabase() {
  try {
    console.log('🔍 VERIFICAÇÃO REAL DO BANCO DE DADOS\n')

    // 1. Verificar todas as tabelas relacionadas a vídeos
    console.log('1️⃣ Verificando estrutura das tabelas...')

    try {
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%video%')

      console.log('📋 Tabelas de vídeo encontradas:', tables?.map(t => t.table_name) || 'nenhuma')
    } catch (e) {
      console.log('❌ Erro ao verificar tabelas:', e.message)
    }

    // 2. Verificar dados nas tabelas com service role
    console.log('\n2️⃣ Verificando dados reais (com service role)...')

    // Check video_modules
    try {
      const { data: modules, count } = await supabase
        .from('video_modules')
        .select('*', { count: 'exact' })

      console.log(`📊 video_modules: ${count} registros`)
      if (modules && modules.length > 0) {
        modules.forEach(m => console.log(`   - ${m.title} (${m.is_active ? 'ativo' : 'inativo'})`))
      }
    } catch (e) {
      console.log('❌ Erro em video_modules:', e.message)
    }

    // Check video_lessons
    try {
      const { data: lessons, count } = await supabase
        .from('video_lessons')
        .select('*', { count: 'exact' })

      console.log(`📊 video_lessons: ${count} registros`)
      if (lessons && lessons.length > 0) {
        lessons.forEach(l => console.log(`   - ${l.title} (módulo: ${l.module_id})`))
      }
    } catch (e) {
      console.log('❌ Erro em video_lessons:', e.message)
    }

    // Check lesson_progress
    try {
      const { count } = await supabase
        .from('lesson_progress')
        .select('*', { count: 'exact' })

      console.log(`📊 lesson_progress: ${count} registros`)
    } catch (e) {
      console.log('❌ Erro em lesson_progress:', e.message)
    }

    // Check video_access_control
    try {
      const { count } = await supabase
        .from('video_access_control')
        .select('*', { count: 'exact' })

      console.log(`📊 video_access_control: ${count} registros`)
    } catch (e) {
      console.log('❌ Erro em video_access_control:', e.message)
    }

    // 3. Testar RLS policies
    console.log('\n3️⃣ Verificando RLS policies...')

    try {
      const { data } = await supabase
        .from('pg_policies')
        .select('*')
        .like('tablename', '%video%')

      console.log(`🛡️ ${data?.length || 0} políticas RLS encontradas para tabelas de vídeo`)
      data?.forEach(p => console.log(`   - ${p.tablename}: ${p.policyname}`))
    } catch (e) {
      console.log('❌ Erro ao verificar RLS:', e.message)
    }

    // 4. Tentar inserir dados de teste
    console.log('\n4️⃣ Tentando inserir dados de teste...')

    try {
      const { data, error } = await supabase
        .from('video_modules')
        .insert({
          title: 'Teste Module',
          description: 'Teste de inserção',
          order_index: 999,
          is_active: true
        })
        .select()

      if (error) {
        console.log('❌ Erro na inserção:', error.message)
      } else {
        console.log('✅ Inserção bem-sucedida!')

        // Limpar o teste
        await supabase
          .from('video_modules')
          .delete()
          .eq('title', 'Teste Module')

        console.log('🧹 Registro de teste removido')
      }
    } catch (e) {
      console.log('❌ Erro na inserção:', e.message)
    }

    console.log('\n🚀 RELATÓRIO COMPLETO FINALIZADO!')

  } catch (err) {
    console.error('❌ Erro geral:', err)
  }
}

checkRealDatabase()