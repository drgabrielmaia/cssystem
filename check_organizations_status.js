const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrganizationsStatus() {
  console.log('🔍 Verificando estado das organizações no Supabase...\n');

  try {
    // 1. Verificar organizações existentes
    console.log('1️⃣ ORGANIZAÇÕES EXISTENTES:');
    console.log('=' .repeat(50));

    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true });

    if (orgError) {
      console.error('❌ Erro ao buscar organizações:', orgError);
    } else {
      console.log(`Total de organizações: ${organizations?.length || 0}`);
      if (organizations && organizations.length > 0) {
        organizations.forEach((org, index) => {
          console.log(`\n${index + 1}. ${org.name}`);
          console.log(`   ID: ${org.id}`);
          console.log(`   Created: ${new Date(org.created_at).toLocaleString('pt-BR')}`);
        });
      }
    }

    // 2. Verificar usuários nas organizações
    console.log('\n2️⃣ USUÁRIOS NAS ORGANIZAÇÕES:');
    console.log('=' .repeat(50));

    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select('*')
      .order('created_at', { ascending: true });

    if (orgUsersError) {
      console.error('❌ Erro ao buscar organization_users:', orgUsersError);
    } else {
      console.log(`Total de vínculos usuário-organização: ${orgUsers?.length || 0}`);
      if (orgUsers && orgUsers.length > 0) {
        // Agrupar por organização
        const usersByOrg = {};
        orgUsers.forEach(ou => {
          if (!usersByOrg[ou.organization_id]) {
            usersByOrg[ou.organization_id] = [];
          }
          usersByOrg[ou.organization_id].push(ou);
        });

        for (const [orgId, users] of Object.entries(usersByOrg)) {
          console.log(`\nOrganização ID: ${orgId}`);
          users.forEach(u => {
            console.log(`  - User ID: ${u.user_id} (Role: ${u.role})`);
          });
        }
      }
    }

    // 3. Verificar todos os usuários
    console.log('\n3️⃣ TODOS OS USUÁRIOS (auth.users):');
    console.log('=' .repeat(50));

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('created_at', { ascending: true });

    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError);
    } else {
      console.log(`Total de usuários: ${profiles?.length || 0}`);
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`\n${index + 1}. ${profile.full_name || 'Sem nome'}`);
          console.log(`   ID: ${profile.id}`);
          console.log(`   Email: ${profile.email}`);
          console.log(`   Role: ${profile.role}`);
        });
      }
    }

    // 4. Identificar usuários SEM organização
    console.log('\n4️⃣ USUÁRIOS SEM ORGANIZAÇÃO:');
    console.log('=' .repeat(50));

    if (profiles && orgUsers) {
      const usersWithOrg = new Set(orgUsers.map(ou => ou.user_id));
      const usersWithoutOrg = profiles.filter(p => !usersWithOrg.has(p.id));

      console.log(`Total de usuários sem organização: ${usersWithoutOrg.length}`);
      if (usersWithoutOrg.length > 0) {
        usersWithoutOrg.forEach((user, index) => {
          console.log(`\n${index + 1}. ${user.full_name || 'Sem nome'}`);
          console.log(`   ID: ${user.id}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Role: ${user.role}`);
        });
      }
    }

    // 5. Verificar emails específicos
    console.log('\n5️⃣ STATUS DOS EMAILS MENCIONADOS:');
    console.log('=' .repeat(50));

    const emailsToCheck = ['admin@admin.com', 'kellybsantoss@icloud.com'];

    for (const email of emailsToCheck) {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('email', email)
        .single();

      if (userError || !user) {
        console.log(`\n❌ ${email}: NÃO ENCONTRADO`);
      } else {
        console.log(`\n✅ ${email}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Nome: ${user.full_name || 'Sem nome'}`);
        console.log(`   Role: ${user.role}`);

        // Verificar se tem organização
        const { data: userOrg } = await supabase
          .from('organization_users')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .single();

        if (userOrg) {
          console.log(`   ✅ TEM ORGANIZAÇÃO: ${userOrg.organization_id} (Role: ${userOrg.role})`);
        } else {
          console.log(`   ⚠️ NÃO TEM ORGANIZAÇÃO`);
        }
      }
    }

    // 6. Resumo final
    console.log('\n📊 RESUMO FINAL:');
    console.log('=' .repeat(50));
    console.log(`Total de organizações: ${organizations?.length || 0}`);
    console.log(`Total de usuários: ${profiles?.length || 0}`);
    console.log(`Usuários com organização: ${orgUsers ? new Set(orgUsers.map(ou => ou.user_id)).size : 0}`);
    console.log(`Usuários sem organização: ${profiles && orgUsers ? profiles.length - new Set(orgUsers.map(ou => ou.user_id)).size : 'N/A'}`);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkOrganizationsStatus();