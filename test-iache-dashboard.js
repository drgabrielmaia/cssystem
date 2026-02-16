const puppeteer = require('puppeteer');

async function testarDashboardIache() {
  console.log('🧪 TESTANDO DASHBOARD DO IACHE - ISOLAMENTO DE DADOS\n');

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

    // Fazer login como Iache
    console.log('🔗 Fazendo login como iachelps@gmail.com...');
    await page.goto('http://localhost:3000/login');
    
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'iachelps@gmail.com');
    await page.type('input[type="password"]', 'iache123');
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('🔗 URL após login:', page.url());

    // Navegar para dashboard
    console.log('📊 Navegando para dashboard...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForSelector('main', { timeout: 10000 });

    // Aguardar carregamento dos dados
    await page.waitForTimeout(5000);

    // Verificar se há dados de organização visíveis
    const pageText = await page.evaluate(() => document.body.textContent);
    
    console.log('\n📊 ANÁLISE DO DASHBOARD:');
    
    // Verificar se mostra a organização correta
    if (pageText.includes('IAC Helps')) {
      console.log('✅ Organização IAC Helps detectada no dashboard');
    } else {
      console.log('❌ Organização IAC Helps NÃO detectada');
    }
    
    // Verificar se há dados de faturamento
    if (pageText.includes('FATURAMENTO') || pageText.includes('Valor Total Vendido')) {
      console.log('✅ Seção de faturamento encontrada');
    } else {
      console.log('⚠️ Seção de faturamento não encontrada');
    }
    
    // Verificar se há métricas de leads
    if (pageText.includes('leads') || pageText.includes('vendas')) {
      console.log('✅ Métricas de leads/vendas encontradas');
    } else {
      console.log('⚠️ Métricas de leads/vendas não encontradas');
    }

    // Navegar para página de leads
    console.log('\n📋 Testando página de leads...');
    await page.goto('http://localhost:3000/leads');
    await page.waitForSelector('main', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const leadsPageText = await page.evaluate(() => document.body.textContent);
    
    // Verificar se há leads específicos do Iache
    const iacheEmails = [
      'dudaolivfilms@gmail.com',
      'eloimobiliariapb@gmail.com', 
      'kimgomes@gmail.com',
      'decolarimob1205@email.com'
    ];
    
    let leadsEncontrados = 0;
    iacheEmails.forEach(email => {
      if (leadsPageText.includes(email)) {
        leadsEncontrados++;
        console.log(`✅ Lead encontrado: ${email}`);
      }
    });
    
    console.log(`\n📈 RESULTADO: ${leadsEncontrados}/${iacheEmails.length} leads do Iache encontrados`);
    
    if (leadsEncontrados > 0) {
      console.log('✅ SUCCESS: Dashboard está mostrando dados da organização do Iache!');
    } else {
      console.log('❌ PROBLEM: Nenhum lead específico do Iache foi encontrado');
    }

    // Navegar para pendências
    console.log('\n💰 Testando página de pendências...');
    await page.goto('http://localhost:3000/pendencias');
    await page.waitForSelector('main', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const pendenciasPageText = await page.evaluate(() => document.body.textContent);
    
    if (pendenciasPageText.includes('Pendências') || pendenciasPageText.includes('Dívidas')) {
      console.log('✅ Página de pendências carregou');
    } else {
      console.log('⚠️ Problema ao carregar página de pendências');
    }

    // Capturar screenshots
    await page.screenshot({ path: 'iache-dashboard-test.png', fullPage: true });
    console.log('\n📸 Screenshot salvo: iache-dashboard-test.png');

    // Aguardar para análise manual
    console.log('⏸️ Pausando por 10 segundos para análise...');
    await page.waitForTimeout(10000);

    await browser.close();

  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

testarDashboardIache();