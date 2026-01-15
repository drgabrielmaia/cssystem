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
 * Script para corrigir o sistema de comissões
 *
 * PROBLEMA: As comissões estão sendo calculadas como 10% sobre o valor da venda,
 * mas deveriam usar um valor fixo de R$ 2000 por organização.
 *
 * SOLUÇÃO:
 * 1. Buscar todas as comissões com status_pagamento = 'pendente' E percentual_comissao = 10
 * 2. Atualizar essas comissões para:
 *    - valor_comissao = 2000.00
 *    - percentual_comissao = 0
 *    - observacoes = 'Comissão fixa atualizada para R$ 2.000,00 por indicação'
 *    - updated_at = agora
 */

async function corrigirComissoes() {
  console.log('🔧 INICIANDO CORREÇÃO DO SISTEMA DE COMISSÕES');
  console.log('=' .repeat(60));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  try {
    // Passo 1: Verificar se a tabela de comissões existe
    console.log('1️⃣ VERIFICANDO EXISTÊNCIA DA TABELA DE COMISSÕES...');

    const tabelasPossiveis = ['comissoes', 'commissions', 'comissao', 'commission'];
    let tabelaComissoes = null;

    for (const tabela of tabelasPossiveis) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          tabelaComissoes = tabela;
          console.log(`✅ Tabela encontrada: ${tabela}`);
          break;
        }
      } catch (e) {
        // Continua tentando outras tabelas
      }
    }

    if (!tabelaComissoes) {
      console.log('❌ ERRO: Nenhuma tabela de comissões encontrada!');
      console.log('Tabelas testadas:', tabelasPossiveis.join(', '));
      return;
    }

    // Passo 2: Buscar comissões pendentes com 10% de percentual
    console.log('\n2️⃣ BUSCANDO COMISSÕES PENDENTES COM 10% DE PERCENTUAL...');

    const { data: comissoesPendentes, error: errorBusca } = await supabase
      .from(tabelaComissoes)
      .select('*')
      .eq('status_pagamento', 'pendente')
      .eq('percentual_comissao', 10);

    if (errorBusca) {
      console.log('❌ ERRO ao buscar comissões:', errorBusca.message);
      return;
    }

    console.log(`📊 Encontradas ${comissoesPendentes.length} comissões para correção`);

    if (comissoesPendentes.length === 0) {
      console.log('✅ Nenhuma comissão precisa ser corrigida!');
      return;
    }

    // Mostrar detalhes das comissões encontradas
    console.log('\n📋 DETALHES DAS COMISSÕES ENCONTRADAS:');
    let totalAtual = 0;

    comissoesPendentes.forEach((comissao, index) => {
      const valorAtual = parseFloat(comissao.valor_comissao || 0);
      totalAtual += valorAtual;

      console.log(`${index + 1}. ID: ${comissao.id}`);
      console.log(`   Valor atual: R$ ${valorAtual.toFixed(2)}`);
      console.log(`   Percentual: ${comissao.percentual_comissao}%`);
      console.log(`   Status: ${comissao.status_pagamento}`);
      console.log(`   Data: ${comissao.created_at || 'N/A'}`);
      console.log();
    });

    console.log(`💰 Total atual em comissões: R$ ${totalAtual.toFixed(2)}`);
    console.log(`💰 Total após correção: R$ ${(comissoesPendentes.length * 2000).toFixed(2)}`);
    console.log(`📈 Diferença: R$ ${((comissoesPendentes.length * 2000) - totalAtual).toFixed(2)}`);

    // Passo 3: Confirmar a atualização
    console.log('\n3️⃣ PREPARANDO ATUALIZAÇÃO...');
    console.log('⚠️  ATENÇÃO: Esta operação irá alterar os valores das comissões!');
    console.log(`   ${comissoesPendentes.length} comissões serão atualizadas para R$ 2.000,00 cada`);
    console.log();

    // Passo 4: Executar a atualização
    console.log('4️⃣ EXECUTANDO ATUALIZAÇÃO...');

    const agora = new Date().toISOString();
    let sucessos = 0;
    let erros = 0;

    for (const comissao of comissoesPendentes) {
      try {
        const { error: errorUpdate } = await supabase
          .from(tabelaComissoes)
          .update({
            valor_comissao: 2000.00,
            percentual_comissao: 0,
            observacoes: 'Comissão fixa atualizada para R$ 2.000,00 por indicação',
            updated_at: agora
          })
          .eq('id', comissao.id);

        if (errorUpdate) {
          console.log(`❌ Erro ao atualizar comissão ${comissao.id}:`, errorUpdate.message);
          erros++;
        } else {
          console.log(`✅ Comissão ${comissao.id} atualizada com sucesso`);
          sucessos++;
        }
      } catch (e) {
        console.log(`💥 Exceção ao atualizar comissão ${comissao.id}:`, e.message);
        erros++;
      }
    }

    console.log(`\n📊 RESULTADO DA ATUALIZAÇÃO:`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);

    // Passo 5: Verificar o resultado
    console.log('\n5️⃣ VERIFICANDO RESULTADO...');

    const { data: comissoesAposCorrecao, error: errorVerificacao } = await supabase
      .from(tabelaComissoes)
      .select('*')
      .eq('status_pagamento', 'pendente');

    if (errorVerificacao) {
      console.log('❌ ERRO ao verificar resultado:', errorVerificacao.message);
      return;
    }

    console.log(`📈 Total de comissões pendentes após correção: ${comissoesAposCorrecao.length}`);

    // Calcular totais
    let totalPendente = 0;
    let comissoes2000 = 0;
    let comissoesOutros = 0;

    comissoesAposCorrecao.forEach(comissao => {
      const valor = parseFloat(comissao.valor_comissao || 0);
      totalPendente += valor;

      if (valor === 2000) {
        comissoes2000++;
      } else {
        comissoesOutros++;
      }
    });

    console.log(`💰 Total em comissões pendentes: R$ ${totalPendente.toFixed(2)}`);
    console.log(`🎯 Comissões de R$ 2.000: ${comissoes2000}`);
    console.log(`⚠️  Comissões com outros valores: ${comissoesOutros}`);

    // Mostrar detalhes das comissões pendentes
    if (comissoesAposCorrecao.length > 0) {
      console.log('\n📋 LISTAGEM DAS COMISSÕES PENDENTES:');

      comissoesAposCorrecao.forEach((comissao, index) => {
        const valor = parseFloat(comissao.valor_comissao || 0);
        const status = valor === 2000 ? '✅' : '⚠️';

        console.log(`${status} ${index + 1}. ID: ${comissao.id} | Valor: R$ ${valor.toFixed(2)} | Percentual: ${comissao.percentual_comissao}%`);
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ CORREÇÃO DE COMISSÕES CONCLUÍDA!');
    console.log(`🎯 ${sucessos} comissões foram corrigidas com sucesso`);
    if (erros > 0) {
      console.log(`⚠️  ${erros} comissões apresentaram erros - verifique os logs acima`);
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar o script
if (require.main === module) {
  corrigirComissoes()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { corrigirComissoes };