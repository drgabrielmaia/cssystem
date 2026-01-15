import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function searchAdminPhones() {
  console.log('📞 BUSCANDO TELEFONES DE ADMINISTRADORES');
  console.log('=' .repeat(60));

  // 1. Buscar telefones na tabela mentorados relacionados aos emails de admin
  const adminEmails = [
    'kellybsantoss@icloud.com',
    'temp2@admin.com',
    'admin@admin.com'
  ];

  console.log('\n🔍 Buscando telefones dos admins na tabela mentorados:');

  for (const email of adminEmails) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/mentorados?select=nome,email,telefone&email=eq.${encodeURIComponent(email)}`,
        { headers }
      );

      if (response.status === 200) {
        const results = await response.json();
        console.log(`\n📧 Email: ${email}`);

        if (results.length > 0) {
          results.forEach(person => {
            console.log(`   ✅ Nome: ${person.nome || 'N/A'}`);
            console.log(`   📱 Telefone: ${person.telefone || 'N/A'}`);
          });
        } else {
          console.log(`   ❌ Não encontrado na tabela mentorados`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Erro ao buscar ${email}:`, error.message);
    }
  }

  // 2. Buscar telefone do admin configurado no .env
  console.log('\n📱 TELEFONE ADMIN CONFIGURADO NO SISTEMA:');
  console.log('   Telefone Admin (.env): 558396910414');

  // 3. Verificar se há alguma tabela com configurações de usuários ou perfis
  console.log('\n👤 BUSCANDO EM OUTRAS TABELAS POSSÍVEIS:');

  const userTables = ['users', 'profiles', 'user_profiles', 'accounts'];

  for (const tableName of userTables) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=5`,
        { headers }
      );

      if (response.status === 200) {
        const results = await response.json();
        console.log(`\n✅ Tabela ${tableName} existe com ${results.length} registros`);

        if (results.length > 0) {
          console.log('   📋 Campos disponíveis:', Object.keys(results[0]));

          // Verificar se há telefones
          const withPhones = results.filter(user =>
            user.phone || user.telefone || user.mobile || user.cellphone
          );

          if (withPhones.length > 0) {
            console.log(`   📱 ${withPhones.length} usuários com telefone encontrados`);
            withPhones.forEach(user => {
              const phone = user.phone || user.telefone || user.mobile || user.cellphone;
              const email = user.email || user.user_email || 'N/A';
              console.log(`     - ${email}: ${phone}`);
            });
          }
        }
      } else if (response.status === 404) {
        console.log(`   ❌ Tabela ${tableName} não existe`);
      }
    } catch (error) {
      console.log(`   ❌ Erro ao acessar ${tableName}:`, error.message);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📋 RESUMO DOS TELEFONES ENCONTRADOS:');
  console.log('=' .repeat(60));

  console.log('\n🎯 Para usar na API de envio:');
  console.log('1. Kelly Organization (d0bc922d-de87-42d9-a4de-9b2095191719)');
  console.log('   - Email: kellybsantoss@icloud.com');
  console.log('   - Telefone: [Buscar manualmente ou usar admin geral]');
  console.log('');

  console.log('2. Organização Temp2 (f9cf9d0e-ed74-4367-94f7-226ffc2f3273)');
  console.log('   - Email: temp2@admin.com');
  console.log('   - Telefone: [Buscar manualmente ou usar admin geral]');
  console.log('');

  console.log('3. Admin Organization (9c8c0033-15ea-4e33-a55f-28d81a19693b)');
  console.log('   - Email: admin@admin.com');
  console.log('   - Telefone: [Buscar manualmente ou usar admin geral]');
  console.log('');

  console.log('📱 Telefone Admin Sistema: 558396910414');
  console.log('   (Configurado no arquivo .env como NEXT_PUBLIC_ADMIN_PHONE)');

  console.log('\n✅ Busca de telefones finalizada!');
}

searchAdminPhones().catch(console.error);