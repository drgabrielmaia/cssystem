require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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
      .select('id, email, nome_completo, organization_id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      console.log('⚠️ Usuário já existe:');
      console.log(`   Nome: ${existingUser.nome_completo}`);
      console.log(`   Email: ${email}`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Org ID: ${existingUser.organization_id}\n`);
      
      // Verificar se tem organização própria
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', existingUser.organization_id)
        .single();
      
      if (existingOrg) {
        console.log('✅ Organização já existe:');
        console.log(`   Nome: ${existingOrg.name}`);
        console.log(`   ID: ${existingOrg.id}`);
        console.log(`\n🎉 Conta já está pronta para uso!`);
        
        console.log('\n' + '='.repeat(60));
        console.log('📋 INFORMAÇÕES DE LOGIN:');
        console.log('=' .repeat(60));
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Senha: ${senha}`);
        console.log(`🔗 Login URL: /mentorado/login`);
        
        return;
      }
    }
    
    // 2. Criar organização
    console.log('🏢 Criando organização...');
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert([{
        name: nomeOrganizacao,
        owner_email: email,
        admin_phone: '+55 11 99999-9999',
        comissao_fixa_indicacao: 1000,
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
    
    // 3. Criar usuário mentorado
    console.log('\n👤 Criando usuário mentorado...');
    
    let userId = existingUser?.id;
    
    if (!existingUser) {
      const { data: newUser, error: userError } = await supabase
        .from('mentorados')
        .insert([{
          nome_completo: 'IAC Helps Admin',
          email: email,
          telefone: '+55 11 99999-9999',
          password_hash: null, // Será definido depois
          organization_id: newOrg.id,
          status_login: 'ativo',
          excluido: false,
          porcentagem_comissao: 10,
          pontuacao_total: 0,
          score_engajamento: 0,
          nivel_experiencia: 'iniciante',
          estado_entrada: 'SP',
          estado_atual: 'SP',
          data_entrada: new Date().toISOString().split('T')[0],
          turma: 'IAC-2026-01',
          genero: 'outro',
          especialidade: 'geral',
          status_mentoria: 'ativo',
          faturamento_inicial: 0,
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
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar usuário:', updateError);
        return;
      }
      
      console.log('✅ Usuário existente movido para nova organização');
    }
    
    // 4. Criar módulos de vídeo para a nova organização
    console.log('\n📚 Criando módulos de vídeo...');
    
    const modulosIniciais = [
      {
        title: 'Introdução ao IAC Helps',
        description: 'Módulo introdutório sobre nossa plataforma e como maximizar seus resultados',
        order_index: 1,
        organization_id: newOrg.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Recursos Avançados',
        description: 'Explore funcionalidades avançadas da plataforma para otimizar seu workflow',
        order_index: 2,
        organization_id: newOrg.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'IA e Automação',
        description: 'Como usar inteligência artificial para potencializar seus resultados',
        order_index: 3,
        organization_id: newOrg.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Estratégias de Crescimento',
        description: 'Táticas comprovadas para escalar seu negócio rapidamente',
        order_index: 4,
        organization_id: newOrg.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
      
      // 5. Criar acesso aos módulos (100% liberado)
      if (modulosCriados && modulosCriados.length > 0) {
        console.log('\n🔓 Liberando acesso TOTAL aos módulos...');
        
        const acessos = modulosCriados.map(modulo => ({
          mentorado_id: userId,
          module_id: modulo.id,
          has_access: true,
          granted_at: new Date().toISOString(),
          granted_by: 'account_creation_iachelps',
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
    
    // 6. Definir senha via API call
    console.log('\n🔑 Definindo senha...');
    
    try {
      const response = await fetch('http://localhost:3000/api/mentorados/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          newPassword: senha
        }),
      });
      
      if (response.ok) {
        console.log('✅ Senha definida com sucesso!');
      } else {
        console.log('⚠️ Erro ao definir senha via API, mas conta foi criada');
        console.log('💡 Você pode definir a senha manualmente depois');
      }
    } catch (apiError) {
      console.log('⚠️ Não foi possível conectar à API para definir senha');
      console.log('💡 Você pode definir a senha manualmente depois');
    }
    
    // 7. Resultado final
    console.log('\n' + '='.repeat(70));
    console.log('🎉 CONTA IAC HELPS CRIADA COM SUCESSO!');
    console.log('=' .repeat(70));
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${senha}`);
    console.log(`🏢 Organização: ${nomeOrganizacao} (${newOrg.id})`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`📚 Módulos criados: ${modulosCriados?.length || 0}`);
    console.log(`🔓 Acesso: 100% liberado para todos os módulos`);
    console.log(`🔗 Login URL: http://localhost:3000/mentorado/login`);
    console.log('\n✅ A conta está pronta para uso!');
    
    console.log('\n📋 MÓDULOS CRIADOS:');
    modulosCriados?.forEach((modulo, index) => {
      console.log(`${index + 1}. ${modulo.title}`);
      console.log(`   ${modulo.description}`);
    });
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. ✅ Fazer login com: iachelps@gmail.com / iache123');
    console.log('2. 📚 Acessar /mentorado/videos/netflix para ver os módulos');
    console.log('3. 🎬 Adicionar aulas nos módulos criados');
    console.log('4. 🎨 Personalizar a organização conforme necessário');
    console.log('5. 👥 Adicionar outros mentorados à organização');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

criarContaIAchelps();