import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function inspectTable(tableName, limit = 5) {
  try {
    console.log(`\n🔍 INSPEÇÃO DETALHADA: ${tableName.toUpperCase()}`);
    console.log('='.repeat(50));

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=${limit}`,
      { headers }
    );

    if (response.status === 200) {
      const data = await response.json();
      console.log(`✅ Status: ACESSÍVEL`);
      console.log(`📊 Registros encontrados: ${data.length}`);

      if (data.length > 0) {
        console.log(`\n📋 ESTRUTURA DA TABELA:`);
        const firstRecord = data[0];
        const columns = Object.keys(firstRecord);

        columns.forEach(column => {
          const value = firstRecord[column];
          const type = typeof value;
          const displayValue = value === null ? 'NULL' :
                              type === 'string' ? `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"` :
                              String(value);

          console.log(`  📌 ${column}: ${type} = ${displayValue}`);
        });

        console.log(`\n📄 DADOS DE EXEMPLO:`);
        data.forEach((record, index) => {
          console.log(`\n  📝 Registro ${index + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            const displayValue = value === null ? 'NULL' :
                                type === 'string' && value.length > 100 ? value.substring(0, 100) + '...' :
                                String(value);
            console.log(`     ${key}: ${displayValue}`);
          });
        });
      } else {
        console.log(`📝 Tabela existe mas está vazia`);
      }

      return { exists: true, data, count: data.length };

    } else {
      console.log(`❌ Status: ${response.status}`);
      return { exists: false, status: response.status };
    }

  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return { exists: false, error: error.message };
  }
}

async function checkTableStructure() {
  console.log('🎯 INSPEÇÃO DETALHADA DAS TABELAS DE COMISSÃO');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);

  // Inspecionar tabelas principais do sistema de ranking
  const tables = [
    { name: 'comissoes', description: 'Tabela principal de comissões' },
    { name: 'comissoes_configuracoes', description: 'Configurações do sistema de comissões' },
    { name: 'leads', description: 'Tabela de leads (sample para verificar campos)' },
    { name: 'mentorados', description: 'Tabela de mentorados (para entender relações)' }
  ];

  const report = {};

  for (const table of tables) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 ${table.description.toUpperCase()}`);
    console.log(`🗃️ Tabela: ${table.name}`);

    const result = await inspectTable(table.name, table.name === 'leads' ? 2 : 10);
    report[table.name] = result;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('📈 RESUMO DA INSPEÇÃO');
  console.log(`{'='.repeat(80)}`);

  console.log('\n✅ TABELAS ENCONTRADAS:');
  Object.entries(report).forEach(([tableName, result]) => {
    if (result.exists) {
      console.log(`  🗃️ ${tableName}: ${result.count} registros`);
    } else {
      console.log(`  ❌ ${tableName}: Não acessível (${result.status || result.error})`);
    }
  });

  console.log('\n🔍 ANÁLISE DO SISTEMA DE COMISSÕES:');

  if (report.comissoes?.exists) {
    console.log(`  ✅ Tabela 'comissoes' existe (${report.comissoes.count} registros)`);
    if (report.comissoes.count === 0) {
      console.log(`     ⚠️ Está vazia - pode precisar de dados iniciais`);
    }
  } else {
    console.log(`  ❌ Tabela 'comissoes' não acessível`);
  }

  if (report.comissoes_configuracoes?.exists) {
    console.log(`  ✅ Tabela 'comissoes_configuracoes' existe (${report.comissoes_configuracoes.count} registros)`);
    if (report.comissoes_configuracoes.count > 0) {
      console.log(`     ✅ Contém configurações - sistema pode estar funcional`);
    }
  } else {
    console.log(`  ❌ Tabela 'comissoes_configuracoes' não acessível`);
  }

  if (report.leads?.exists) {
    console.log(`  ✅ Tabela 'leads' tem campos necessários para comissões`);
    console.log(`     - mentorado_indicador_id: Para rastreamento de indicações`);
    console.log(`     - data_venda: Para cálculo de comissões`);
    console.log(`     - comissao_id: Para vinculação com comissões`);
    console.log(`     - valor_venda: Para cálculo de valores`);
  } else {
    console.log(`  ❌ Tabela 'leads' não acessível`);
  }

  console.log('\n🚨 COMPONENTES FALTANDO:');
  console.log(`  ❌ View 'view_dashboard_comissoes_mentorado' - Necessária para dashboard`);

  console.log('\n📋 PRÓXIMOS PASSOS RECOMENDADOS:');
  console.log(`  1. 🔧 Criar a view 'view_dashboard_comissoes_mentorado'`);
  console.log(`  2. 📊 Povoar a tabela 'comissoes' se necessário`);
  console.log(`  3. 🧪 Testar o fluxo completo de comissões`);
  console.log(`  4. 📈 Verificar se as configurações em 'comissoes_configuracoes' estão corretas`);

  return report;
}

// Executar a inspeção
checkTableStructure()
  .then(report => {
    console.log('\n✨ Inspeção detalhada concluída!');
  })
  .catch(error => {
    console.error('❌ Erro na inspeção:', error.message);
  });