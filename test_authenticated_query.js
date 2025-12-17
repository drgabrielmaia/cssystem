const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWithAuth() {
  try {
    console.log('🧪 TESTANDO COM AUTENTICAÇÃO SIMULADA\n')

    // 1. Teste sem autenticação (como está agora)
    console.log('1️⃣ Teste SEM autenticação (anon):')
    const { data: unauthModules, error: unauthError } = await supabase
      .from('video_modules')
      .select('*')

    if (unauthError) {
      console.log('❌ Erro sem auth:', unauthError.message)
    } else {
      console.log(`✅ ${unauthModules?.length || 0} módulos encontrados sem auth`)
    }

    // 2. Simular autenticação com email fake
    console.log('\n2️⃣ Teste COM autenticação simulada:')

    // Tentar fazer login com um email de teste
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123456'
      })

      if (error) {
        console.log('❌ Login failed (esperado):', error.message)
      } else {
        console.log('✅ Login success:', data.user?.email)

        // Testar query autenticada
        const { data: authModules, error: authError } = await supabase
          .from('video_modules')
          .select('*')

        if (authError) {
          console.log('❌ Erro com auth:', authError.message)
        } else {
          console.log(`✅ ${authModules?.length || 0} módulos com auth`)
        }
      }
    } catch (e) {
      console.log('❌ Erro no login:', e.message)
    }

    // 3. Verificar as policies RLS diretamente
    console.log('\n3️⃣ Verificando policies RLS:')

    const { data: policies } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
          FROM pg_policies
          WHERE tablename LIKE '%video%';
        `
      })
      .single()

    console.log('📋 Policies encontradas:', policies)

    // 4. Teste direto com service role simulado
    console.log('\n4️⃣ SOLUÇÃO TEMPORÁRIA:')
    console.log('Execute este SQL para desabilitar RLS temporariamente:')
    console.log(`
      -- DESABILITAR RLS TEMPORARIAMENTE
      ALTER TABLE video_modules DISABLE ROW LEVEL SECURITY;
      ALTER TABLE video_lessons DISABLE ROW LEVEL SECURITY;
      ALTER TABLE lesson_progress DISABLE ROW LEVEL SECURITY;
      ALTER TABLE video_access_control DISABLE ROW LEVEL SECURITY;

      -- Verificar dados existem
      SELECT 'Módulos' as tipo, count(*) as total FROM video_modules
      UNION ALL
      SELECT 'Aulas' as tipo, count(*) as total FROM video_lessons;
    `)

  } catch (err) {
    console.error('❌ Erro geral:', err)
  }
}

testWithAuth()