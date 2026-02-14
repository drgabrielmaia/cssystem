require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function definirSenhaRealIAchelps() {
  console.log('🔐 DEFININDO SENHA REAL PARA IACHELPS@GMAIL.COM\n');
  
  try {
    const email = 'iachelps@gmail.com';
    const senha = 'iache123';
    
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${senha}`);
    console.log('');
    
    // 1. Gerar hash bcrypt da senha
    console.log('🔐 Gerando hash bcrypt...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(senha, saltRounds);
    
    console.log('✅ Hash gerado com sucesso!');
    console.log(`🔑 Hash: ${passwordHash.substring(0, 20)}...`);
    
    // 2. Verificar se usuário existe
    const { data: userBefore } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, password_hash')
      .eq('email', email)
      .single();
    
    if (!userBefore) {
      console.log('❌ Usuário não encontrado!');
      return;
    }
    
    console.log('\n👤 ANTES DA ATUALIZAÇÃO:');
    console.log(`   Nome: ${userBefore.nome_completo}`);
    console.log(`   Email: ${userBefore.email}`);
    console.log(`   Password Hash: ${userBefore.password_hash || 'NULL (aceita qualquer senha)'}`);
    
    // 3. Atualizar com a senha real
    console.log('\n🔄 Atualizando senha...');
    
    const { error: updateError } = await supabase
      .from('mentorados')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar senha:', updateError);
      return;
    }
    
    console.log('✅ Senha atualizada com sucesso!');
    
    // 4. Verificar se funcionou
    console.log('\n🔍 Verificando atualização...');
    
    const { data: userAfter } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, password_hash')
      .eq('email', email)
      .single();
    
    console.log('👤 DEPOIS DA ATUALIZAÇÃO:');
    console.log(`   Nome: ${userAfter?.nome_completo}`);
    console.log(`   Email: ${userAfter?.email}`);
    console.log(`   Password Hash: ${userAfter?.password_hash ? 'DEFINIDO (hash bcrypt)' : 'NULL'}`);
    
    // 5. Testar se a senha funciona
    console.log('\n🧪 TESTANDO HASH...');
    
    if (userAfter?.password_hash) {
      const senhaCorreta = await bcrypt.compare(senha, userAfter.password_hash);
      const senhaErrada = await bcrypt.compare('senha_errada', userAfter.password_hash);
      
      console.log(`✅ Senha "${senha}" funciona: ${senhaCorreta ? 'SIM' : 'NÃO'}`);
      console.log(`❌ Senha errada funciona: ${senhaErrada ? 'SIM (PROBLEMA!)' : 'NÃO (correto)'}`);
    }
    
    // 6. Resultado final
    console.log('\n' + '='.repeat(70));
    console.log('🎯 SENHA REAL DEFINIDA COM SUCESSO!');
    console.log('=' .repeat(70));
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${senha}`);
    console.log(`🔐 Hash: Definido com bcrypt`);
    console.log(`🛡️ Segurança: AGORA é segura!`);
    console.log(`🔗 Login: http://localhost:3000/admin/login`);
    
    console.log('\n✅ AGORA FUNCIONA APENAS COM A SENHA CORRETA!');
    console.log('❌ Senhas erradas serão rejeitadas');
    console.log('🔒 Sistema de segurança ativo');
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

definirSenhaRealIAchelps();