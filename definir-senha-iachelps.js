require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function definirSenhaIAchelps() {
  console.log('🔑 DEFININDO SENHA PARA IACHELPS@GMAIL.COM\n');
  
  try {
    const email = 'iachelps@gmail.com';
    const senha = 'iache123';
    
    // 1. Verificar se a conta existe
    const { data: user } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, organization_id')
      .eq('email', email)
      .single();
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log(`   Nome: ${user.nome_completo}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Org: ${user.organization_id}\n`);
    
    // 2. Definir senha como null para permitir login com qualquer senha
    console.log('🔓 Configurando login sem senha (password_hash = null)...');
    
    const { error: updateError } = await supabase
      .from('mentorados')
      .update({ 
        password_hash: null,
        status_login: 'ativo',
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar senha:', updateError);
      return;
    }
    
    console.log('✅ Configuração de login atualizada!');
    console.log('💡 Com password_hash = null, qualquer senha funcionará no login');
    
    // 3. Verificar organização e módulos
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.organization_id)
      .single();
    
    const { data: modules } = await supabase
      .from('video_modules')
      .select('id, title')
      .eq('organization_id', user.organization_id);
    
    const { data: access } = await supabase
      .from('video_access_control')
      .select('module_id')
      .eq('mentorado_id', user.id)
      .eq('has_access', true);
    
    console.log('\n📊 STATUS DA CONTA:');
    console.log(`🏢 Organização: ${org?.name || 'N/A'}`);
    console.log(`📚 Módulos disponíveis: ${modules?.length || 0}`);
    console.log(`🔓 Módulos com acesso: ${access?.length || 0}`);
    
    if (modules && modules.length > 0) {
      console.log('\n📋 MÓDULOS:');
      modules.forEach((module, index) => {
        const temAcesso = access?.some(a => a.module_id === module.id);
        const status = temAcesso ? '✅' : '❌';
        console.log(`   ${index + 1}. ${status} ${module.title}`);
      });
    }
    
    // 4. Resultado final
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CONTA PRONTA PARA USO!');
    console.log('=' .repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${senha} (ou qualquer outra senha)`);
    console.log(`🔗 Login URL: http://localhost:3000/mentorado/login`);
    console.log(`📱 Vídeos URL: http://localhost:3000/mentorado/videos/netflix`);
    console.log('\n✅ Faça o login e teste o acesso aos vídeos!');
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

definirSenhaIAchelps();