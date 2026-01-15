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
 * Script para debuggar o problema de atualização de comissões
 */

async function debugComissoes() {
  console.log('🔍 DEBUG DO PROBLEMA DE ATUALIZAÇÃO DE COMISSÕES');
  console.log('=' .repeat(70));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  try {
    // Buscar uma comissão específica para teste
    console.log('1️⃣ BUSCANDO UMA COMISSÃO PARA TESTE...');

    const { data: comissoes, error: errorBusca } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente')
      .limit(1);

    if (errorBusca) {
      console.log('❌ ERRO ao buscar comissões:', errorBusca.message);
      return;
    }

    if (comissoes.length === 0) {
      console.log('❌ Nenhuma comissão encontrada!');
      return;
    }

    const comissao = comissoes[0];
    console.log(`✅ Comissão encontrada: ${comissao.id}`);
    console.log(`   Valor atual: R$ ${parseFloat(comissao.valor_comissao || 0).toFixed(2)}`);
    console.log(`   Status: ${comissao.status_pagamento}`);

    // Teste 1: Tentar atualizar apenas observações
    console.log('\n2️⃣ TESTE 1: Atualizando apenas observações...');

    const { data: teste1, error: error1 } = await supabase
      .from('comissoes')
      .update({
        observacoes: comissao.observacoes + ' [TESTE DEBUG]',
        updated_at: new Date().toISOString()
      })
      .eq('id', comissao.id)
      .select();

    if (error1) {
      console.log('❌ ERRO no teste 1:', error1.message);
    } else {
      console.log('✅ SUCESSO no teste 1 - observações atualizadas');
      if (teste1 && teste1.length > 0) {
        console.log(`   Observações: ${teste1[0].observacoes.slice(-50)}...`);
      }
    }

    // Teste 2: Tentar atualizar valor diretamente
    console.log('\n3️⃣ TESTE 2: Tentando atualizar valor para 1999...');

    const { data: teste2, error: error2 } = await supabase
      .from('comissoes')
      .update({
        valor_comissao: 1999.00
      })
      .eq('id', comissao.id)
      .select();

    if (error2) {
      console.log('❌ ERRO no teste 2:', error2.message);
      console.log('   Código:', error2.code);
      console.log('   Detalhes:', error2.details);
      console.log('   Hint:', error2.hint);
    } else {
      console.log('✅ SUCESSO no teste 2');
      if (teste2 && teste2.length > 0) {
        console.log(`   Novo valor: R$ ${parseFloat(teste2[0].valor_comissao || 0).toFixed(2)}`);
      }
    }

    // Teste 3: Verificar se a atualização realmente aconteceu
    console.log('\n4️⃣ TESTE 3: Verificando se a atualização persistiu...');

    const { data: verificacao, error: errorVerif } = await supabase
      .from('comissoes')
      .select('valor_comissao, observacoes, updated_at')
      .eq('id', comissao.id)
      .single();

    if (errorVerif) {
      console.log('❌ ERRO na verificação:', errorVerif.message);
    } else {
      console.log('✅ Verificação realizada:');
      console.log(`   Valor atual: R$ ${parseFloat(verificacao.valor_comissao || 0).toFixed(2)}`);
      console.log(`   Última atualização: ${verificacao.updated_at}`);
      console.log(`   Observações contêm [TESTE DEBUG]: ${verificacao.observacoes.includes('[TESTE DEBUG]')}`);
    }

    // Teste 4: Tentar atualizar com valor exato 2000.00
    console.log('\n5️⃣ TESTE 4: Tentando atualizar para exatos R$ 2000.00...');

    const { data: teste4, error: error4 } = await supabase
      .from('comissoes')
      .update({
        valor_comissao: 2000.00,
        observacoes: comissao.observacoes + ' [VALOR 2000 APLICADO]',
        updated_at: new Date().toISOString()
      })
      .eq('id', comissao.id)
      .select('*');

    if (error4) {
      console.log('❌ ERRO no teste 4:', error4.message);
    } else {
      console.log('✅ SUCESSO no teste 4!');
      if (teste4 && teste4.length > 0) {
        const resultado = teste4[0];
        console.log(`   ID: ${resultado.id}`);
        console.log(`   Valor retornado: R$ ${parseFloat(resultado.valor_comissao || 0).toFixed(2)}`);
        console.log(`   Status: ${resultado.status_pagamento}`);
        console.log(`   Última atualização: ${resultado.updated_at}`);
      }
    }

    // Verificação final para confirmar persistência
    console.log('\n6️⃣ VERIFICAÇÃO FINAL...');

    await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo

    const { data: final, error: errorFinal } = await supabase
      .from('comissoes')
      .select('*')
      .eq('id', comissao.id)
      .single();

    if (errorFinal) {
      console.log('❌ ERRO na verificação final:', errorFinal.message);
    } else {
      console.log('🔎 ESTADO FINAL DA COMISSÃO:');
      console.log(`   ID: ${final.id}`);
      console.log(`   Valor: R$ ${parseFloat(final.valor_comissao || 0).toFixed(2)}`);
      console.log(`   Percentual: ${final.percentual_comissao}%`);
      console.log(`   Status: ${final.status_pagamento}`);
      console.log(`   Criado em: ${final.created_at}`);
      console.log(`   Atualizado em: ${final.updated_at}`);
      console.log(`   Observações: ${final.observacoes.slice(-100)}...`);

      // Analisar se houve mudança
      const valorFinal = parseFloat(final.valor_comissao || 0);
      if (valorFinal === 2000) {
        console.log('✅ SUCESSO! O valor foi atualizado para R$ 2.000,00');
      } else if (valorFinal === 1999) {
        console.log('⚠️ Valor ficou em R$ 1.999,00 (do teste 2)');
      } else {
        console.log(`❌ Valor não foi alterado: R$ ${valorFinal.toFixed(2)}`);
      }
    }

    // Teste 5: Verificar se existe algum trigger ou constraint
    console.log('\n7️⃣ DIAGNÓSTICO ADICIONAL...');

    // Verificar quantidade total de comissões e seus valores
    const { data: todas, error: errorTodas } = await supabase
      .from('comissoes')
      .select('id, valor_comissao, status_pagamento');

    if (!errorTodas && todas) {
      console.log(`📊 Total de comissões: ${todas.length}`);

      const valores = {};
      todas.forEach(c => {
        const valor = parseFloat(c.valor_comissao || 0);
        const chave = valor === 0 ? 'Zero' : valor === 2000 ? 'R$ 2.000' : `R$ ${valor.toFixed(2)}`;
        valores[chave] = (valores[chave] || 0) + 1;
      });

      console.log('📈 Distribuição de valores:');
      Object.entries(valores).forEach(([valor, count]) => {
        console.log(`   ${valor}: ${count} comissões`);
      });
    }

    console.log('\n' + '=' .repeat(70));
    console.log('🏁 DEBUG CONCLUÍDO!');

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar o script
if (require.main === module) {
  debugComissoes()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { debugComissoes };