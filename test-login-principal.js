// Script para testar login do iachelps@gmail.com no /login principal
const puppeteer = require('puppeteer');

async function testarLoginPrincipal() {
  console.log('🎮 TESTANDO LOGIN NO /LOGIN PRINCIPAL\n');

  try {
    const browser = await puppeteer.launch({ 
      headless: false, // Vamos ver o navegador
      slowMo: 500
    });
    
    const page = await browser.newPage();
    
    // Interceptar todas as requisições para debug
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('/auth')) {
        console.log('📡 Request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes('/auth')) {
        console.log('📥 Response:', response.status(), response.url());
      }
    });

    // Console logs da página
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      } else if (msg.text().includes('error') || msg.text().includes('Error')) {
        console.log('⚠️ Console:', msg.text());
      }
    });

    // Ir para página de login principal
    console.log('🔗 Navegando para: http://localhost:3000/login');
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    // Aguardar página carregar
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('✅ Página de login principal carregada');

    // Preencher formulário
    console.log('📝 Preenchendo credenciais...');
    await page.type('input[type="email"]', 'iachelps@gmail.com');
    await page.type('input[type="password"]', 'iache123');

    // Aguardar um pouco para garantir que os valores foram preenchidos
    await page.waitForTimeout(1000);

    // Clicar no botão de login
    console.log('🔘 Clicando em login...');
    await page.click('button[type="submit"]');

    // Aguardar alguns segundos para ver o que acontece
    console.log('⏳ Aguardando resposta...');
    await page.waitForTimeout(5000);

    // Verificar URL atual
    const currentUrl = page.url();
    console.log('📍 URL atual:', currentUrl);

    // Verificar se há mensagem de erro
    const errorElements = await page.$$('.text-red-600, .bg-red-50, .text-red-600');
    if (errorElements.length > 0) {
      for (const element of errorElements) {
        const errorText = await page.evaluate(el => el.textContent, element);
        if (errorText && errorText.trim()) {
          console.log('❌ Erro encontrado:', errorText.trim());
        }
      }
    } else {
      console.log('✅ Nenhum erro visível na tela');
    }

    // Verificar se redirecionou
    if (currentUrl !== 'http://localhost:3000/login') {
      console.log('✅ Redirecionou para:', currentUrl);
      
      if (currentUrl.includes('/admin') || currentUrl.includes('/dashboard') || currentUrl.includes('/lista-mentorados')) {
        console.log('🎉 LOGIN BEM-SUCEDIDO! Acessou área administrativa');
      } else {
        console.log('🤔 Redirecionou para uma página inesperada');
      }
    } else {
      console.log('⚠️ Permanece na página de login - pode indicar erro');
    }

    // Capturar screenshot
    await page.screenshot({ path: 'login-principal-test.png', fullPage: true });
    console.log('📸 Screenshot salvo como login-principal-test.png');

    // Aguardar um pouco mais para análise manual
    console.log('⏸️ Pausando por 10 segundos para análise...');
    await page.waitForTimeout(10000);

    await browser.close();

  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

// Executar teste
testarLoginPrincipal();