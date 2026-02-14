require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function criarContaIAchelps() {
  console.log('🚀 CRIANDO CONTA E ORGANIZAÇÃO PARA IACHELPS@GMAIL.COM\n');
  
  try {
    const email = 'iachelps@gmail.com';
    const senha = 'iache123';
    const nomeOrganizacao = 'IAC Helps';
    
    // 1. Verificar se já existe
    const { data: existingUser } = await supabase
      .from('mentorados')
      .select('id, email, nome_completo')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      console.log('⚠️ Usuário já existe:');
      console.log(`   Nome: ${existingUser.nome_completo}`);
      console.log(`   Email: ${email}`);
      console.log(`   ID: ${existingUser.id}\n`);
      
      // Verificar se tem organização
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('created_by', existingUser.id)
        .single();
      
      if (existingOrg) {
        console.log('✅ Organização já existe:');
        console.log(`   Nome: ${existingOrg.name}`);
        console.log(`   ID: ${existingOrg.id}`);
        console.log(`\n🎉 Conta já está pronta para uso!`);
        return;
      }
    }
    
    // 2. Criar hash da senha
    console.log('🔐 Gerando hash da senha...');
    const passwordHash = await bcrypt.hash(senha, 10);
    
    // 3. Criar organização primeiro
    console.log('🏢 Criando organização...');
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert([{
        name: nomeOrganizacao,
        domain: 'iachelps.com',
        settings: {
          theme: 'default',
          features: {
            videos: true,
            leads: true,
            calendar: true,
            financial: true
          }
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (orgError) {
      console.error('❌ Erro ao criar organização:', orgError);
      return;
    }
    
    console.log('✅ Organização criada:');
    console.log(`   Nome: ${newOrg.name}`);
    console.log(`   ID: ${newOrg.id}`);
    
    // 4. Criar usuário mentorado
    console.log('\n👤 Criando usuário mentorado...');
    
    let userId = existingUser?.id;
    
    if (!existingUser) {
      const { data: newUser, error: userError } = await supabase
        .from('mentorados')
        .insert([{
          nome_completo: 'IAC Helps Admin',
          email: email,
          password_hash: passwordHash,
          organization_id: newOrg.id,
          telefone: '+55 11 99999-9999',
          status: 'ativo',
          nivel_interesse: 'alto',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (userError) {
        console.error('❌ Erro ao criar usuário:', userError);
        return;
      }
      
      userId = newUser.id;
      console.log('✅ Usuário criado:');
      console.log(`   Nome: ${newUser.nome_completo}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   ID: ${newUser.id}`);
    } else {
      // Atualizar usuário existente para nova organização
      const { error: updateError } = await supabase
        .from('mentorados')
        .update({ 
          organization_id: newOrg.id,
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar usuário:', updateError);
        return;
      }
      
      console.log('✅ Usuário existente atualizado para nova organização');
    }
    
    // 5. Atualizar organização com created_by
    const { error: updateOrgError } = await supabase
      .from('organizations')
      .update({ created_by: userId })
      .eq('id', newOrg.id);
    
    if (updateOrgError) {
      console.error('❌ Erro ao atualizar organização com created_by:', updateOrgError);
    }
    
    // 6. Criar módulos de vídeo para a nova organização
    console.log('\n📚 Criando módulos de vídeo...');
    
    const modulosIniciais = [
      {
        title: 'Introdução ao IAC Helps',
        description: 'Módulo introdutório sobre nossa plataforma',
        order_index: 1,
        organization_id: newOrg.id,
        is_active: true
      },
      {
        title: 'Recursos Avançados',
        description: 'Explore funcionalidades avançadas da plataforma',
        order_index: 2,
        organization_id: newOrg.id,
        is_active: true
      }
    ];
    
    const { data: modulosCriados, error: modulosError } = await supabase
      .from('video_modules')
      .insert(modulosIniciais)
      .select();
    
    if (modulosError) {
      console.error('❌ Erro ao criar módulos:', modulosError);
    } else {
      console.log(`✅ ${modulosCriados?.length || 0} módulos criados`);
      
      // 7. Criar acesso aos módulos
      if (modulosCriados && modulosCriados.length > 0) {
        console.log('\n🔓 Liberando acesso aos módulos...');
        
        const acessos = modulosCriados.map(modulo => ({
          mentorado_id: userId,
          module_id: modulo.id,
          has_access: true,
          granted_at: new Date().toISOString(),
          granted_by: 'account_creation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { error: acessoError } = await supabase
          .from('video_access_control')
          .insert(acessos);
        
        if (acessoError) {
          console.error('❌ Erro ao criar acessos:', acessoError);
        } else {
          console.log(`✅ Acessos criados para ${acessos.length} módulos`);
        }
      }
    }
    
    // 8. Resultado final
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CONTA CRIADA COM SUCESSO!');
    console.log('=' .repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${senha}`);
    console.log(`🏢 Organização: ${nomeOrganizacao} (${newOrg.id})`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`🔗 Login URL: /mentorado/login`);
    console.log('\n✅ A conta está pronta para uso!');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

criarContaIAchelps();