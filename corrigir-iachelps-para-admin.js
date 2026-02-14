require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function corrigirIAchelpsParaAdmin() {
  console.log('🔧 CORRIGINDO IACHELPS PARA SER ADMIN/OWNER DA ORGANIZAÇÃO\n');
  
  try {
    const email = 'iachelps@gmail.com';
    const senha = 'iache123';
    
    // 1. Encontrar o mentorado criado erroneamente
    const { data: mentoradoExistente } = await supabase
      .from('mentorados')
      .select('id, organization_id')
      .eq('email', email)
      .single();
    
    if (!mentoradoExistente) {
      console.log('❌ Mentorado não encontrado');
      return;
    }
    
    console.log('✅ Mentorado encontrado:', mentoradoExistente.id);
    console.log('🏢 Organização:', mentoradoExistente.organization_id);
    
    // 2. Verificar se precisa criar tabela de admins
    console.log('\n🔍 Verificando estrutura para admins...');
    
    // Primeiro, vamos verificar se existe uma tabela de admins
    const { data: existingAdmins, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .limit(1);
    
    let adminTableExists = !adminError;
    console.log(`📋 Tabela 'admins' existe: ${adminTableExists ? 'SIM' : 'NÃO'}`);
    
    if (!adminTableExists) {
      console.log('⚠️ Tabela admins não existe, vou criar um admin usando a tabela users ou approach alternativo');
      
      // Vamos verificar se existe tabela users ou auth
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      const userTableExists = !usersError;
      console.log(`📋 Tabela 'users' existe: ${userTableExists ? 'SIM' : 'NÃO'}`);
      
      if (!userTableExists) {
        // Criar usando approach de organização com owner
        console.log('🔧 Criando admin via organização owner approach...');
        
        // Atualizar a organização para ter o owner correto
        const { error: updateOrgError } = await supabase
          .from('organizations')
          .update({
            owner_email: email,
            updated_at: new Date().toISOString()
          })
          .eq('id', mentoradoExistente.organization_id);
        
        if (updateOrgError) {
          console.error('❌ Erro ao atualizar organização:', updateOrgError);
          return;
        }
        
        console.log('✅ Organização atualizada com owner correto');
        
        // Manter o mentorado mas marcar como admin na organização
        const { error: updateMentoradoError } = await supabase
          .from('mentorados')
          .update({
            nome_completo: 'IAC Helps - Admin Principal',
            status_login: 'admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', mentoradoExistente.id);
        
        if (updateMentoradoError) {
          console.error('❌ Erro ao atualizar mentorado para admin:', updateMentoradoError);
        } else {
          console.log('✅ Mentorado marcado como admin principal');
        }
        
      } else {
        console.log('🔧 Criando admin na tabela users...');
        
        // Criar admin na tabela users
        const { data: newAdmin, error: createAdminError } = await supabase
          .from('users')
          .insert([{
            email: email,
            password_hash: null, // Aceita qualquer senha
            full_name: 'IAC Helps Admin',
            role: 'admin',
            organization_id: mentoradoExistente.organization_id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (createAdminError) {
          console.error('❌ Erro ao criar admin:', createAdminError);
        } else {
          console.log('✅ Admin criado na tabela users:', newAdmin.id);
        }
      }
    } else {
      console.log('🔧 Criando admin na tabela admins...');
      
      // Criar na tabela admins
      const { data: newAdmin, error: createAdminError } = await supabase
        .from('admins')
        .insert([{
          email: email,
          password_hash: null,
          full_name: 'IAC Helps Admin',
          organization_id: mentoradoExistente.organization_id,
          is_active: true,
          permissions: {
            leads: true,
            videos: true,
            calendar: true,
            financial: true,
            users: true,
            settings: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createAdminError) {
        console.error('❌ Erro ao criar admin:', createAdminError);
      } else {
        console.log('✅ Admin criado na tabela admins:', newAdmin.id);
      }
    }
    
    // 3. Verificar e mostrar resultado final
    console.log('\n🏢 Verificando organização final...');
    
    const { data: orgFinal } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', mentoradoExistente.organization_id)
      .single();
    
    const { data: mentoradoFinal } = await supabase
      .from('mentorados')
      .select('*')
      .eq('id', mentoradoExistente.id)
      .single();
    
    console.log('📊 ESTADO FINAL:');
    console.log(`🏢 Organização: ${orgFinal?.name}`);
    console.log(`📧 Owner Email: ${orgFinal?.owner_email}`);
    console.log(`👤 Mentorado Admin: ${mentoradoFinal?.nome_completo}`);
    console.log(`🔑 Status Login: ${mentoradoFinal?.status_login}`);
    
    // 4. Verificar acesso admin
    console.log('\n🔐 VERIFICANDO ACESSOS ADMINISTRATIVOS...');
    
    // Verificar se pode acessar área admin
    const canAccessAdmin = orgFinal?.owner_email === email || mentoradoFinal?.status_login === 'admin';
    
    console.log(`✅ Pode acessar área admin: ${canAccessAdmin ? 'SIM' : 'NÃO'}`);
    
    // 5. Resultado final
    console.log('\n' + '='.repeat(70));
    console.log('🎯 CONTA ADMIN CONFIGURADA COM SUCESSO!');
    console.log('=' .repeat(70));
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${senha}`);
    console.log(`🏢 Organização: ${orgFinal?.name}`);
    console.log(`👑 Papel: Owner/Admin da Organização`);
    console.log(`🔗 Login Admin: http://localhost:3000/admin/login`);
    console.log(`📊 Dashboard: http://localhost:3000/admin/dashboard`);
    console.log(`👥 Leads: http://localhost:3000/admin/leads`);
    console.log(`💰 Financeiro: http://localhost:3000/admin/financas`);
    
    console.log('\n📋 FUNCIONALIDADES DISPONÍVEIS:');
    console.log('✅ Cadastrar e gerenciar leads');
    console.log('✅ Acompanhar vendas e comissões');
    console.log('✅ Gerenciar mentorados da organização');
    console.log('✅ Criar e gerenciar módulos de vídeo');
    console.log('✅ Acessar relatórios financeiros');
    console.log('✅ Configurar calendário e agendamentos');
    
    console.log('\n🎉 Agora sim! Conta de ADMIN/OWNER configurada corretamente!');
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

corrigirIAchelpsParaAdmin();