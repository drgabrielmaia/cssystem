import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function checkComissoesSchema() {
  console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA comissoes');
  console.log('='.repeat(50));

  try {
    // Tentar inserir uma comissão simples para ver campos obrigatórios
    const testResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/comissoes?select=*&limit=1`,
      { headers }
    );

    if (testResponse.ok) {
      const testData = await testResponse.json();

      if (testData.length > 0) {
        console.log('✅ ESTRUTURA DA TABELA (baseado em registro existente):');
        const sample = testData[0];
        Object.keys(sample).forEach(key => {
          console.log(`   • ${key}: ${sample[key]} (${typeof sample[key]})`);
        });
      } else {
        console.log('❌ Tabela comissoes está vazia');
      }
    }

    // Testar inserção simples para descobrir campos obrigatórios
    console.log('\\n🧪 TESTANDO INSERÇÃO SIMPLES...');

    const testInsert = await fetch(
      `${SUPABASE_URL}/rest/v1/comissoes`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mentorado_id: 'test-id',
          valor_comissao: 100,
          observacoes: 'teste de estrutura'
        })
      }
    );

    const insertError = await testInsert.text();
    console.log(`Resposta do teste: ${testInsert.status}`);
    console.log(`Detalhes: ${insertError}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\\n' + '='.repeat(50));
}

checkComissoesSchema();