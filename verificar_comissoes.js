const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Script para verificar o estado atual das comissões
 */

async function verificarComissoes() {
  console.log('🔍 VERIFICANDO ESTADO ATUAL DAS COMISSÕES');
  console.log('=' .repeat(60));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  try {
    // Verificar se a tabela existe
    const { data: todasComissoes, error: errorTotal } = await supabase
      .from('comissoes')
      .select('*');

    if (errorTotal) {
      console.log('❌ ERRO ao acessar tabela de comissões:', errorTotal.message);
      return;
    }

    console.log(`📊 Total de comissões na tabela: ${todasComissoes.length}`);
    console.log();

    if (todasComissoes.length === 0) {
      console.log('⚠️ Nenhuma comissão encontrada na tabela!');
      return;
    }

    // Analisar por status
    const statusGroups = {};
    const percentualGroups = {};
    const valorGroups = {};

    todasComissoes.forEach(comissao => {
      // Agrupar por status
      const status = comissao.status_pagamento || 'sem_status';
      statusGroups[status] = (statusGroups[status] || 0) + 1;

      // Agrupar por percentual
      const percentual = comissao.percentual_comissao || 0;
      percentualGroups[percentual] = (percentualGroups[percentual] || 0) + 1;

      // Agrupar por valor
      const valor = parseFloat(comissao.valor_comissao || 0);
      if (valor === 2000) {
        valorGroups['R$ 2.000,00'] = (valorGroups['R$ 2.000,00'] || 0) + 1;
      } else if (valor > 0) {
        valorGroups['Outros valores'] = (valorGroups['Outros valores'] || 0) + 1;
      } else {
        valorGroups['Zero/Nulo'] = (valorGroups['Zero/Nulo'] || 0) + 1;
      }
    });

    console.log('📈 ANÁLISE POR STATUS DE PAGAMENTO:');
    Object.entries(statusGroups).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} comissões`);
    });

    console.log('\n📊 ANÁLISE POR PERCENTUAL DE COMISSÃO:');
    Object.entries(percentualGroups).forEach(([percentual, count]) => {
      console.log(`  ${percentual}%: ${count} comissões`);
    });

    console.log('\n💰 ANÁLISE POR VALOR DE COMISSÃO:');
    Object.entries(valorGroups).forEach(([grupo, count]) => {
      console.log(`  ${grupo}: ${count} comissões`);
    });

    // Mostrar detalhes das comissões pendentes
    const pendentes = todasComissoes.filter(c => c.status_pagamento === 'pendente');

    if (pendentes.length > 0) {
      console.log(`\n📋 DETALHES DAS ${pendentes.length} COMISSÕES PENDENTES:`);

      pendentes.forEach((comissao, index) => {
        const valor = parseFloat(comissao.valor_comissao || 0);
        console.log(`${index + 1}. ID: ${comissao.id}`);
        console.log(`   Valor: R$ ${valor.toFixed(2)}`);
        console.log(`   Percentual: ${comissao.percentual_comissao}%`);
        console.log(`   Data criação: ${comissao.created_at || 'N/A'}`);
        console.log(`   Última atualização: ${comissao.updated_at || 'N/A'}`);
        console.log(`   Observações: ${comissao.observacoes || 'N/A'}`);
        console.log();
      });

      const totalPendente = pendentes.reduce((sum, c) => sum + parseFloat(c.valor_comissao || 0), 0);
      console.log(`💰 Total em comissões pendentes: R$ ${totalPendente.toFixed(2)}`);
    }

    // Buscar especificamente comissões com percentual 10 (independente do status)
    const comissoes10pct = todasComissoes.filter(c => parseFloat(c.percentual_comissao) === 10);

    if (comissoes10pct.length > 0) {
      console.log(`\n🎯 COMISSÕES COM 10% DE PERCENTUAL (${comissoes10pct.length} encontradas):`);

      comissoes10pct.forEach((comissao, index) => {
        const valor = parseFloat(comissao.valor_comissao || 0);
        console.log(`${index + 1}. ID: ${comissao.id} | Status: ${comissao.status_pagamento} | Valor: R$ ${valor.toFixed(2)}`);
      });
    } else {
      console.log('\n✅ Nenhuma comissão com percentual de 10% encontrada');
    }

    // Verificar campos disponíveis
    if (todasComissoes.length > 0) {
      console.log('\n🔧 ESTRUTURA DA TABELA (campos disponíveis):');
      const campos = Object.keys(todasComissoes[0]).sort();
      console.log(`  ${campos.join(', ')}`);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ VERIFICAÇÃO CONCLUÍDA!');

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar o script
if (require.main === module) {
  verificarComissoes()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { verificarComissoes };