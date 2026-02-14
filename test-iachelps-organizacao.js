const puppeteer = require('puppeteer');

async function testarOrganizacaoIachelps() {
  console.log('🧪 TESTANDO ORGANIZAÇÃO DO IACHELPS\n');

  try {
    const browser = await puppeteer.launch({ 
      headless: false,
      slowMo: 1000
    });
    
    const page = await browser.newPage();
    
    // Console logs
    page.on('console', msg => {
      console.log('📝 Console:', msg.text());
    });

    // Ir para login principal
    console.log('🔗 Fazendo login como iachelps@gmail.com...');
    await page.goto('http://localhost:3000/login');
    
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'iachelps@gmail.com');
    await page.type('input[type="password"]', 'iache123');
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('🔗 URL após login:', page.url());

    // Navegar para leads
    console.log('📋 Navegando para página de leads...');
    await page.goto('http://localhost:3000/leads');
    await page.waitForSelector('table, .table, [data-testid="leads-table"], h1', { timeout: 10000 });

    // Aguardar carregamento dos dados
    await page.waitForTimeout(3000);

    // Verificar se há leads visíveis
    const pageText = await page.evaluate(() => document.body.textContent);
    
    console.log('\n📊 RESULTADO DO TESTE:');
    
    if (pageText.includes('João Silva - IAC') || 
        pageText.includes('Pedro Costa - IAC') || 
        pageText.includes('Ana Oliveira - IAC')) {
      console.log('✅ SUCCESS: iachelps consegue ver leads da IAC Helps!');
      console.log('✅ Leads encontrados na página');
    } else if (pageText.includes('Nenhum lead encontrado') || 
               pageText.includes('0 leads') ||
               pageText.includes('Sem leads')) {
      console.log('⚠️ INFO: Nenhum lead encontrado - pode estar funcionando mas sem dados');
    } else {
      console.log('❌ PROBLEM: Estado indeterminado da página');
    }

    // Verificar se há indicação de organização
    if (pageText.includes('IAC Helps') || pageText.includes('IAC')) {
      console.log('✅ Organização IAC Helps detectada na página');
    }

    // Capturar screenshot para análise
    await page.screenshot({ path: 'iachelps-leads-test.png', fullPage: true });
    console.log('📸 Screenshot salvo: iachelps-leads-test.png');

    // Aguardar para análise manual
    console.log('⏸️ Pausando por 10 segundos para análise...');
    await page.waitForTimeout(10000);

    await browser.close();

  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

testarOrganizacaoIachelps();