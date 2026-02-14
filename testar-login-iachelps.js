require('dotenv').config({ path: '.env.local' });

async function testarLoginIAchelps() {
  console.log('🧪 TESTANDO LOGIN PARA IACHELPS@GMAIL.COM\n');
  
  try {
    const email = 'iachelps@gmail.com';
    const senha = 'iache123';
    
    console.log('📧 Email:', email);
    console.log('🔑 Senha:', senha);
    
    // 1. Testar API de login de mentorados
    console.log('\n🔍 Testando API de login mentorados...');
    
    try {
      const response = await fetch('http://localhost:3000/api/mentorados/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: senha
        }),
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API de login funcionou!');
        console.log('Resultado:', result);
      } else {
        const error = await response.json();
        console.log('❌ API de login falhou:');
        console.log('Erro:', error);
      }
    } catch (apiError) {
      console.log('❌ Erro ao conectar com API de login:', apiError.message);
    }
    
    // 2. Testar se existe rota admin
    console.log('\n🔍 Testando rotas administrativas...');
    
    const rotasParaTestar = [
      'http://localhost:3000/admin',
      'http://localhost:3000/admin/login',
      'http://localhost:3000/admin/dashboard',
      'http://localhost:3000/mentorado/login',
      'http://localhost:3000/login'
    ];
    
    for (const rota of rotasParaTestar) {
      try {
        const response = await fetch(rota, { method: 'GET' });
        console.log(`${rota}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`${rota}: Erro de conexão`);
      }
    }
    
    // 3. Sugestões de como testar
    console.log('\n📋 COMO TESTAR O LOGIN:');
    console.log('');
    console.log('1. 🌐 Via Navegador:');
    console.log('   - Abra: http://localhost:3000/login');
    console.log('   - Digite: iachelps@gmail.com');
    console.log('   - Senha: iache123');
    console.log('   - Veja se redireciona para área admin');
    console.log('');
    console.log('2. 🧪 Via DevTools (Console):');
    console.log('   - Abra F12 > Console');
    console.log('   - Execute:');
    console.log('   fetch("/api/mentorados/login", {');
    console.log('     method: "POST",');
    console.log('     headers: {"Content-Type": "application/json"},');
    console.log('     body: JSON.stringify({');
    console.log('       email: "iachelps@gmail.com",');
    console.log('       password: "iache123"');
    console.log('     })');
    console.log('   }).then(r => r.json()).then(console.log)');
    console.log('');
    console.log('3. 📱 URLs para testar diretamente:');
    console.log('   http://localhost:3000/admin/dashboard');
    console.log('   http://localhost:3000/admin/leads');
    console.log('   http://localhost:3000/admin/videos');
    console.log('   http://localhost:3000/mentorado (se for mentorado)');
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. Testar login no navegador');
    console.log('2. Verificar se redireciona corretamente');
    console.log('3. Testar acesso às páginas admin');
    console.log('4. Verificar se cookies são setados');
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

testarLoginIAchelps();