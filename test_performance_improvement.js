const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'
);

async function testPerformance() {
  console.log('=== TESTE DE PERFORMANCE - ANTES/DEPOIS DOS ÍNDICES ===\n');
  
  const tests = [
    {
      name: 'Filtro por organização (50 leads)',
      query: () => supabase
        .from('leads')
        .select('id, organization_id, status')
        .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
        .limit(50)
    },
    {
      name: 'Filtro por status (50 leads)',
      query: () => supabase
        .from('leads')
        .select('id, status, created_at')
        .eq('status', 'contactado')
        .limit(50)
    },
    {
      name: 'Filtro composto org+status (50 leads)',
      query: () => supabase
        .from('leads')
        .select('id, organization_id, status')
        .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
        .eq('status', 'contactado')
        .limit(50)
    },
    {
      name: 'Ordenação por data (100 leads)',
      query: () => supabase
        .from('leads')
        .select('id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(100)
    },
    {
      name: 'Leads por SDR (30 leads)',
      query: () => supabase
        .from('leads')
        .select('id, sdr_id, status')
        .not('sdr_id', 'is', null)
        .limit(30)
    },
    {
      name: 'Join com organizations (50 leads)',
      query: () => supabase
        .from('leads')
        .select(`
          id,
          status,
          organizations (
            id,
            name
          )
        `)
        .limit(50)
    },
    {
      name: 'Organizations (todas)',
      query: () => supabase
        .from('organizations')
        .select('id, name, owner_email')
    },
    {
      name: 'Closers por organização',
      query: () => supabase
        .from('closers')
        .select('id, nome_completo, organization_id')
        .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
    },
    {
      name: 'Notifications não lidas',
      query: () => supabase
        .from('notifications')
        .select('id, type, read')
        .eq('read', false)
        .limit(20)
    },
    {
      name: 'Form templates por slug',
      query: () => supabase
        .from('form_templates')
        .select('id, name, slug')
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`Testando: ${test.name}...`);
    
    // Executar 3 vezes para média
    const times = [];
    for (let j = 0; j < 3; j++) {
      const start = Date.now();
      const { data, error } = await test.query();
      const end = Date.now();
      
      if (!error) {
        times.push(end - start);
      } else {
        console.log(`  ✗ Erro: ${error.message}`);
        times.push(9999);
        break;
      }
    }
    
    // Calcular média
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    results.push({
      name: test.name,
      avg: Math.round(avgTime),
      min: minTime,
      max: maxTime,
      records: times.length
    });
    
    console.log(`  ✓ Média: ${Math.round(avgTime)}ms (min: ${minTime}ms, max: ${maxTime}ms)\n`);
  }
  
  // Ordenar por tempo médio
  results.sort((a, b) => b.avg - a.avg);
  
  console.log('=== RESULTADOS ORDENADOS POR TEMPO (MAIS LENTOS PRIMEIRO) ===\n');
  
  results.forEach((result, index) => {
    const status = result.avg > 500 ? '🔴 LENTO' : result.avg > 200 ? '🟡 MÉDIO' : '🟢 RÁPIDO';
    console.log(`${index + 1}. ${status} ${result.name}`);
    console.log(`   Média: ${result.avg}ms | Min: ${result.min}ms | Max: ${result.max}ms\n`);
  });
  
  // Análise
  console.log('=== ANÁLISE DE PERFORMANCE ===\n');
  
  const slowTests = results.filter(r => r.avg > 500);
  const fastTests = results.filter(r => r.avg <= 200);
  
  console.log(`Total de testes: ${results.length}`);
  console.log(`Testes lentos (>500ms): ${slowTests.length}`);
  console.log(`Testes rápidos (≤200ms): ${fastTests.length}`);
  
  if (slowTests.length > 0) {
    console.log(`\n⚠️  TESTES QUE PRECISAM DE OTIMIZAÇÃO:`);
    slowTests.forEach(test => {
      console.log(`  • ${test.name} (${test.avg}ms)`);
    });
  }
  
  console.log(`\n=== PRÓXIMOS PASSOS ===`);
  console.log('1. Aplicar os índices conforme instruções acima');
  console.log('2. Rodar este teste novamente para comparar');
  console.log('3. Monitorar melhorias no dashboard');
  console.log('4. Ajustar índices conforme necessário');
}

testPerformance().catch(console.error);