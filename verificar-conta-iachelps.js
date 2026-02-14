require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarContaIAchelps() {
  console.log('🔍 VERIFICANDO SE A CONTA IACHELPS@GMAIL.COM FOI CRIADA\n');
  
  try {
    const email = 'iachelps@gmail.com';
    
    // 1. Verificar se o usuário existe
    console.log('👤 VERIFICANDO USUÁRIO...');
    const { data: user, error: userError } = await supabase
      .from('mentorados')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      console.log('❌ USUÁRIO NÃO ENCONTRADO!');
      console.log('Error:', userError?.message);
      return;
    }
    
    console.log('✅ USUÁRIO ENCONTRADO:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.nome_completo}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Organization ID: ${user.organization_id}`);
    console.log(`   Status Login: ${user.status_login}`);
    console.log(`   Password Hash: ${user.password_hash ? 'DEFINIDO' : 'NULL (aceita qualquer senha)'}`);
    console.log(`   Excluído: ${user.excluido ? 'SIM' : 'NÃO'}`);
    console.log(`   Criado em: ${user.created_at}`);
    
    // 2. Verificar se a organização existe
    console.log('\n🏢 VERIFICANDO ORGANIZAÇÃO...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.organization_id)
      .single();
    
    if (orgError || !org) {
      console.log('❌ ORGANIZAÇÃO NÃO ENCONTRADA!');
      console.log('Error:', orgError?.message);
      return;
    }
    
    console.log('✅ ORGANIZAÇÃO ENCONTRADA:');
    console.log(`   ID: ${org.id}`);
    console.log(`   Nome: ${org.name}`);
    console.log(`   Owner Email: ${org.owner_email}`);
    console.log(`   Admin Phone: ${org.admin_phone}`);
    console.log(`   Criado em: ${org.created_at}`);
    
    // 3. Verificar módulos da organização
    console.log('\n📚 VERIFICANDO MÓDULOS...');
    const { data: modules, error: modulesError } = await supabase
      .from('video_modules')
      .select('*')
      .eq('organization_id', user.organization_id)
      .order('order_index');
    
    if (modulesError) {
      console.log('❌ ERRO AO BUSCAR MÓDULOS:', modulesError.message);
    } else {
      console.log(`✅ MÓDULOS ENCONTRADOS: ${modules?.length || 0}`);
      if (modules && modules.length > 0) {
        modules.forEach((module, index) => {
          console.log(`   ${index + 1}. ${module.title} (${module.is_active ? 'ATIVO' : 'INATIVO'})`);
          console.log(`      Descrição: ${module.description}`);
          console.log(`      ID: ${module.id}`);
        });
      }
    }
    
    // 4. Verificar acessos do usuário
    console.log('\n🔓 VERIFICANDO ACESSOS AOS MÓDULOS...');
    const { data: access, error: accessError } = await supabase
      .from('video_access_control')
      .select(`
        *,
        video_modules(title)
      `)
      .eq('mentorado_id', user.id)
      .eq('has_access', true);
    
    if (accessError) {
      console.log('❌ ERRO AO BUSCAR ACESSOS:', accessError.message);
    } else {
      console.log(`✅ ACESSOS ENCONTRADOS: ${access?.length || 0}`);
      if (access && access.length > 0) {
        access.forEach((acc, index) => {
          console.log(`   ${index + 1}. ${acc.video_modules?.title || 'Módulo N/A'}`);
          console.log(`      Has Access: ${acc.has_access}`);
          console.log(`      Granted By: ${acc.granted_by}`);
          console.log(`      Granted At: ${acc.granted_at}`);
        });
      }
    }
    
    // 5. Verificar se pode fazer login simulando consulta da página Netflix
    console.log('\n🎭 SIMULANDO LOGIN E ACESSO À PÁGINA DE VÍDEOS...');
    
    // Simular exatamente o que a página Netflix faz (linha 96-100)
    const { data: accessData, error: netflixError } = await supabase
      .from('video_access_control')
      .select('module_id')
      .eq('mentorado_id', user.id)
      .eq('has_access', true);
    
    console.log(`   Query Netflix Success: ${!netflixError}`);
    console.log(`   Módulos acessíveis: ${accessData?.length || 0}`);
    
    if (accessData && accessData.length > 0) {
      // Buscar módulos acessíveis
      const { data: accessibleModules } = await supabase
        .from('video_modules')
        .select('id, title, is_active')
        .in('id', accessData.map(a => a.module_id))
        .eq('is_active', true);
      
      console.log('   📋 Módulos que aparecerão na Netflix:');
      accessibleModules?.forEach((module, index) => {
        console.log(`      ${index + 1}. ${module.title}`);
      });
    } else {
      console.log('   ❌ NENHUM MÓDULO ACESSÍVEL - Página Netflix estará vazia!');
    }
    
    // 6. Resultado final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTADO DA VERIFICAÇÃO');
    console.log('=' .repeat(80));
    
    const statusUser = user ? '✅ CRIADO' : '❌ NÃO ENCONTRADO';
    const statusOrg = org ? '✅ CRIADA' : '❌ NÃO ENCONTRADA';
    const statusModules = (modules?.length || 0) > 0 ? `✅ ${modules.length} CRIADOS` : '❌ NENHUM ENCONTRADO';
    const statusAccess = (access?.length || 0) > 0 ? `✅ ${access.length} ACESSOS` : '❌ NENHUM ACESSO';
    const statusLogin = user?.password_hash === null ? '✅ LOGIN LIBERADO' : '❓ SENHA NECESSÁRIA';
    
    console.log(`👤 Usuário: ${statusUser}`);
    console.log(`🏢 Organização: ${statusOrg}`);
    console.log(`📚 Módulos: ${statusModules}`);
    console.log(`🔓 Acessos: ${statusAccess}`);
    console.log(`🔑 Login: ${statusLogin}`);
    
    const tudoOk = user && org && (modules?.length || 0) > 0 && (access?.length || 0) > 0;
    
    if (tudoOk) {
      console.log('\n🎉 CONTA ESTÁ FUNCIONANDO PERFEITAMENTE!');
      console.log('✅ Todos os componentes estão no lugar');
      console.log('🔗 Pode fazer login em: http://localhost:3000/mentorado/login');
      console.log('📧 Email: iachelps@gmail.com');
      console.log('🔑 Senha: iache123 (ou qualquer senha)');
    } else {
      console.log('\n⚠️ PROBLEMAS ENCONTRADOS NA CONTA');
      console.log('❌ Alguns componentes estão faltando');
    }
    
  } catch (error) {
    console.error('💥 Erro na verificação:', error);
  }
}

verificarContaIAchelps();