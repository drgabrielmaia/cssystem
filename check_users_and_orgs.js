const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersAndOrgs() {
  console.log('🔍 Verificando usuários e organizações no Supabase...\n');

  try {
    // 1. Verificar tabela users
    console.log('1️⃣ TABELA USERS:');
    console.log('=' .repeat(50));

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (usersError) {
      console.log(`❌ Erro ao acessar users: ${usersError.message}`);
    } else {
      console.log(`✅ Total de usuários retornados: ${users?.length || 0}`);
      if (users && users.length > 0) {
        console.log('\nUsuários encontrados:');
        users.forEach((user, index) => {
          console.log(`\n${index + 1}. ID: ${user.id}`);
          console.log(`   Email: ${user.email || 'N/A'}`);
          console.log(`   Nome: ${user.full_name || user.name || 'N/A'}`);
          console.log(`   Role: ${user.role || 'N/A'}`);
          if (user.created_at) {
            console.log(`   Criado: ${new Date(user.created_at).toLocaleString('pt-BR')}`);
          }
        });
      }
    }

    // 2. Verificar tabela profiles
    console.log('\n2️⃣ TABELA PROFILES:');
    console.log('=' .repeat(50));

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (profilesError) {
      console.log(`❌ Erro ao acessar profiles: ${profilesError.message}`);
    } else {
      console.log(`✅ Total de profiles retornados: ${profiles?.length || 0}`);
      if (profiles && profiles.length > 0) {
        console.log('\nProfiles encontrados:');
        profiles.forEach((profile, index) => {
          console.log(`\n${index + 1}. ID: ${profile.id}`);
          console.log(`   Email: ${profile.email || 'N/A'}`);
          console.log(`   Nome: ${profile.full_name || profile.name || 'N/A'}`);
          console.log(`   Role: ${profile.role || 'N/A'}`);
        });
      }
    }

    // 3. Verificar emails específicos em users
    console.log('\n3️⃣ BUSCANDO EMAILS ESPECÍFICOS EM USERS:');
    console.log('=' .repeat(50));

    const emailsToCheck = ['admin@admin.com', 'kellybsantoss@icloud.com'];

    for (const email of emailsToCheck) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) {
        console.log(`\n❌ ${email}: ${userError.message}`);
      } else if (user) {
        console.log(`\n✅ ${email}: ENCONTRADO`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Nome: ${user.full_name || user.name || 'N/A'}`);
      } else {
        console.log(`\n⚠️ ${email}: Não encontrado`);
      }
    }

    // 4. Verificar tabela organizations (sem select para evitar erro de RLS)
    console.log('\n4️⃣ VERIFICANDO TABELA ORGANIZATIONS:');
    console.log('=' .repeat(50));

    // Tentar inserir uma organização teste para verificar se a tabela existe
    const testOrgId = 'test-' + Date.now();
    const { error: insertError } = await supabase
      .from('organizations')
      .insert({
        id: testOrgId,
        name: 'Test Organization',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      if (insertError.code === 'PGRST204' || insertError.code === '42501') {
        console.log('⚠️ Tabela organizations existe mas sem permissão de INSERT');
      } else if (insertError.code === 'PGRST205' || insertError.code === '42P01') {
        console.log('❌ Tabela organizations NÃO existe');
      } else {
        console.log(`⁉️ Status da tabela organizations incerto: ${insertError.code} - ${insertError.message}`);
      }
    } else {
      console.log('✅ Tabela organizations existe e permite INSERT');
      // Limpar o registro de teste
      await supabase.from('organizations').delete().eq('id', testOrgId);
    }

    // 5. Verificar tabela organization_users
    console.log('\n5️⃣ VERIFICANDO TABELA ORGANIZATION_USERS:');
    console.log('=' .repeat(50));

    // Tentar fazer um count sem select para evitar erro de RLS
    const { count, error: countError } = await supabase
      .from('organization_users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.code === 'PGRST205' || countError.code === '42P01') {
        console.log('❌ Tabela organization_users NÃO existe');
      } else if (countError.code === '42P17') {
        console.log('⚠️ Tabela organization_users existe mas tem erro de recursão em RLS');
        console.log(`   Detalhes: ${countError.message}`);
      } else {
        console.log(`⁉️ Status incerto: ${countError.code} - ${countError.message}`);
      }
    } else {
      console.log(`✅ Tabela organization_users existe. Total de registros: ${count || 0}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkUsersAndOrgs();