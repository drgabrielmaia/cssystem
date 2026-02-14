require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function explicarSistemaSenha() {
  console.log('🔍 EXPLICANDO O SISTEMA DE SENHAS DO PROJETO\n');
  
  try {
    const email = 'iachelps@gmail.com';
    
    // 1. Verificar como está a senha atual
    const { data: user } = await supabase
      .from('mentorados')
      .select('email, password_hash, status_login')
      .eq('email', email)
      .single();
    
    console.log('👤 ESTADO ATUAL DA CONTA:');
    console.log(`📧 Email: ${user?.email}`);
    console.log(`🔐 password_hash: ${user?.password_hash || 'NULL'}`);
    console.log(`📊 Status: ${user?.status_login}`);
    
    // 2. Verificar outros exemplos no sistema
    console.log('\n📋 EXEMPLOS DE OUTROS USUÁRIOS:');
    const { data: otherUsers } = await supabase
      .from('mentorados')
      .select('nome_completo, email, password_hash')
      .not('password_hash', 'is', null)
      .limit(3);
    
    console.log('👥 Usuários COM senha definida:');
    otherUsers?.forEach(u => {
      console.log(`   ${u.nome_completo}: password_hash = ${u.password_hash ? 'DEFINIDO' : 'NULL'}`);
    });
    
    const { data: nullUsers } = await supabase
      .from('mentorados')
      .select('nome_completo, email, password_hash')
      .is('password_hash', null)
      .limit(3);
    
    console.log('\n👥 Usuários SEM senha definida (NULL):');
    nullUsers?.forEach(u => {
      console.log(`   ${u.nome_completo}: password_hash = NULL`);
    });
    
    // 3. Explicar a lógica do sistema
    console.log('\n🔧 COMO FUNCIONA O SISTEMA DE LOGIN:');
    console.log('');
    
    console.log('📖 No arquivo: src/contexts/mentorado-auth.tsx');
    console.log('   Linha ~45-55: Lógica de verificação de senha');
    console.log('');
    console.log('🔍 LÓGICA IMPLEMENTADA:');
    console.log('   if (password_hash === null) {');
    console.log('     → Aceita QUALQUER senha digitada');
    console.log('     → Usado para contas temporárias/teste');
    console.log('   } else {');
    console.log('     → Verifica senha com bcrypt');
    console.log('     → Sistema de segurança normal');
    console.log('   }');
    
    // 4. Demonstrar como corrigir
    console.log('\n🛠️ COMO DEFINIR UMA SENHA REAL:');
    console.log('');
    console.log('Opção 1 - Via API:');
    console.log('POST /api/mentorados/update-password');
    console.log('Body: { "email": "iachelps@gmail.com", "newPassword": "iache123" }');
    console.log('');
    console.log('Opção 2 - Via script:');
    console.log('const bcrypt = require("bcrypt");');
    console.log('const hash = await bcrypt.hash("iache123", 10);');
    console.log('// Depois UPDATE na tabela');
    
    // 5. Verificar se API está funcionando
    console.log('\n🧪 TESTANDO DEFINIÇÃO DE SENHA VIA API...');
    
    try {
      const response = await fetch('http://localhost:3000/api/mentorados/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          newPassword: 'iache123'
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API funcionou! Senha definida com sucesso');
        console.log('Resultado:', result);
        
        // Verificar se mudou
        const { data: updatedUser } = await supabase
          .from('mentorados')
          .select('password_hash')
          .eq('email', email)
          .single();
        
        console.log(`🔐 Novo password_hash: ${updatedUser?.password_hash ? 'DEFINIDO (hash real)' : 'AINDA NULL'}`);
        
      } else {
        console.log('❌ API não funcionou');
        const error = await response.json();
        console.log('Erro:', error);
      }
    } catch (apiError) {
      console.log('❌ Erro ao conectar com API:', apiError.message);
      console.log('💡 O servidor pode não estar rodando na porta 3000');
    }
    
    // 6. Resultado final
    console.log('\n' + '='.repeat(60));
    console.log('🎯 RESUMO DO SISTEMA DE SENHAS');
    console.log('=' .repeat(60));
    console.log('');
    console.log('🔒 ATUAL: password_hash = NULL');
    console.log('   → Aceita qualquer senha (menos seguro)');
    console.log('   → Funciona para testes rápidos');
    console.log('');
    console.log('🔐 RECOMENDADO: password_hash com bcrypt');
    console.log('   → Aceita apenas a senha correta');
    console.log('   → Sistema seguro para produção');
    console.log('');
    console.log('✅ Para usar em produção, defina uma senha real!');
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

explicarSistemaSenha();