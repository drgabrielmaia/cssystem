// Script para testar login do iachelps@gmail.com via Puppeteer ou navegador
const puppeteer = require('puppeteer');

async function testarLoginCompleto() {
  console.log('🎮 TESTANDO LOGIN COMPLETO NO NAVEGADOR\n');

  try {
    // Lançar navegador
    const browser = await puppeteer.launch({ 
      headless: true, // false para ver o navegador
      slowMo: 500 // Slow down by 500ms
    });
    
    const page = await browser.newPage();
    
    // Interceptar requisições de rede para debug
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log('📡 Request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log('📥 Response:', response.status(), response.url());
      }
    });

    // Ir para página de login
    console.log('🔗 Navegando para: http://localhost:3000/mentorado/login');
    await page.goto('http://localhost:3000/mentorado/login', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    // Aguardar página carregar
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('✅ Página de login carregada');

    // Preencher formulário
    console.log('📝 Preenchendo credenciais...');
    await page.type('input[type="email"]', 'iachelps@gmail.com');
    await page.type('input[type="password"]', 'iache123');

    // Clicar no botão de login
    console.log('🔘 Clicando em login...');
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2', 
        timeout: 10000 
      });
      console.log('🔄 Redirecionamento detectado');
    } catch (e) {
      console.log('⏱️ Timeout no redirecionamento, verificando URL atual...');
    }

    // Verificar URL atual
    const currentUrl = page.url();
    console.log('📍 URL atual:', currentUrl);

    // Verificar se há mensagem de erro
    const errorElement = await page.$('.text-red-600, .bg-red-50');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent, errorElement);
      console.log('❌ Erro encontrado:', errorText);
    } else {
      console.log('✅ Nenhum erro visível na tela');
    }

    // Se redirecionou para área admin
    if (currentUrl.includes('/admin') || currentUrl.includes('/dashboard')) {
      console.log('🎉 LOGIN BEM-SUCEDIDO! Redirecionou para área admin');
    } else if (currentUrl.includes('/mentorado') && !currentUrl.includes('/login')) {
      console.log('✅ Login realizado - Na área do mentorado');
    } else {
      console.log('⚠️ Login pode ter falhado - ainda na página de login ou em página inesperada');
    }

    // Capturar screenshot
    await page.screenshot({ path: 'login-test-result.png', fullPage: true });
    console.log('📸 Screenshot salvo como login-test-result.png');

    await browser.close();

  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

// Se Puppeteer não estiver instalado, usar fetch para testar API diretamente
async function testarAPIDirectamente() {
  console.log('🧪 TESTANDO API DIRETAMENTE\n');
  
  try {
    // Testar login API
    const response = await fetch('http://localhost:3000/api/mentorados/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'iachelps@gmail.com',
        password: 'iache123'
      })
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok && result.success) {
      console.log('✅ API de login funcionando!');
      
      // Testar API de admin status
      const adminResponse = await fetch('http://localhost:3000/api/check-admin-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'iachelps@gmail.com'
        })
      });
      
      const adminResult = await adminResponse.json();
      console.log('\nAdmin Status:', adminResult);
      
      if (adminResult.isOwner) {
        console.log('✅ Usuário é owner - deve redirecionar para admin');
      }
    } else {
      console.log('❌ API de login falhou');
    }
    
  } catch (error) {
    console.error('💥 Erro no teste da API:', error);
  }
}

// Verificar se Puppeteer está disponível
async function executarTeste() {
  try {
    await testarLoginCompleto();
  } catch (error) {
    if (error.message.includes('puppeteer')) {
      console.log('⚠️ Puppeteer não instalado, testando API diretamente...\n');
      await testarAPIDirectamente();
    } else {
      throw error;
    }
  }
}

executarTeste();