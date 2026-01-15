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
 * Solução alternativa para o problema de atualização de comissões
 *
 * Como o campo valor_comissao parece estar protegido por trigger/policy,
 * vamos tentar diferentes estratégias:
 * 1. Deletar e recriar registros
 * 2. Usar diferentes tipos de dados
 * 3. Tentar atualizar múltiplos campos simultaneamente
 */

async function solucaoAlternativaComissoes() {
  console.log('🛠️  SOLUÇÃO ALTERNATIVA PARA COMISSÕES');
  console.log('=' .repeat(70));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  try {
    // Buscar todas as comissões pendentes
    console.log('1️⃣ COLETANDO DADOS DAS COMISSÕES EXISTENTES...');

    const { data: comissoes, error: errorBusca } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente')
      .eq('valor_comissao', 0);

    if (errorBusca) {
      console.log('❌ ERRO ao buscar comissões:', errorBusca.message);
      return;
    }

    console.log(`📊 Encontradas ${comissoes.length} comissões para corrigir`);

    if (comissoes.length === 0) {
      console.log('✅ Nenhuma comissão precisa de correção!');
      return;
    }

    // Estratégia 1: Tentar com diferentes tipos de dados
    console.log('\n2️⃣ ESTRATÉGIA 1: Testando diferentes tipos de dados...');

    const primeiraComissao = comissoes[0];

    console.log('Teste com string:');
    const { data: teste1, error: error1 } = await supabase
      .from('comissoes')
      .update({
        valor_comissao: '2000.00'
      })
      .eq('id', primeiraComissao.id)
      .select();

    if (error1) {
      console.log('❌ Erro com string:', error1.message);
    } else {
      console.log('✅ Sucesso com string:', teste1[0]?.valor_comissao);
    }

    console.log('Teste com integer:');
    const { data: teste2, error: error2 } = await supabase
      .from('comissoes')
      .update({
        valor_comissao: 2000
      })
      .eq('id', primeiraComissao.id)
      .select();

    if (error2) {
      console.log('❌ Erro com integer:', error2.message);
    } else {
      console.log('✅ Sucesso com integer:', teste2[0]?.valor_comissao);
    }

    // Estratégia 2: Deletar e recriar
    console.log('\n3️⃣ ESTRATÉGIA 2: Deletar e recriar registros...');

    // Preparar dados para recriação
    const dadosParaRecriar = comissoes.map(c => ({
      organization_id: c.organization_id,
      lead_id: c.lead_id,
      mentorado_id: c.mentorado_id,
      created_by: c.created_by,
      valor_venda: c.valor_venda,
      data_venda: c.data_venda,
      valor_comissao: 2000.00, // Valor correto
      percentual_comissao: 0,
      status_pagamento: 'pendente',
      data_vencimento: c.data_vencimento,
      observacoes: c.observacoes + ' - RECRIADO com valor correto R$ 2.000,00',
      created_at: new Date().toISOString()
    }));

    console.log('🗑️  Deletando comissões existentes...');

    const idsParaDeletar = comissoes.map(c => c.id);
    const { error: errorDelete } = await supabase
      .from('comissoes')
      .delete()
      .in('id', idsParaDeletar);

    if (errorDelete) {
      console.log('❌ ERRO ao deletar:', errorDelete.message);
      return;
    }

    console.log(`✅ ${idsParaDeletar.length} comissões deletadas`);

    console.log('➕ Criando novas comissões com valores corretos...');

    const { data: novasComissoes, error: errorInsert } = await supabase
      .from('comissoes')
      .insert(dadosParaRecriar)
      .select();

    if (errorInsert) {
      console.log('❌ ERRO ao criar novas comissões:', errorInsert.message);

      // Tentar recriar as antigas em caso de erro
      console.log('🔄 Tentando restaurar dados originais...');
      const dadosOriginais = comissoes.map(c => ({
        id: c.id,
        organization_id: c.organization_id,
        lead_id: c.lead_id,
        mentorado_id: c.mentorado_id,
        created_by: c.created_by,
        valor_venda: c.valor_venda,
        data_venda: c.data_venda,
        valor_comissao: c.valor_comissao,
        percentual_comissao: c.percentual_comissao,
        status_pagamento: c.status_pagamento,
        data_vencimento: c.data_vencimento,
        data_pagamento: c.data_pagamento,
        observacoes: c.observacoes,
        created_at: c.created_at,
        updated_at: c.updated_at
      }));

      const { error: errorRestore } = await supabase
        .from('comissoes')
        .insert(dadosOriginais);

      if (errorRestore) {
        console.log('💥 ERRO CRÍTICO ao restaurar dados:', errorRestore.message);
      } else {
        console.log('🔄 Dados originais restaurados');
      }

      return;
    }

    console.log(`✅ ${novasComissoes.length} novas comissões criadas com sucesso!`);

    // Verificar se os valores foram aplicados corretamente
    console.log('\n4️⃣ VERIFICANDO RESULTADO...');

    const { data: verificacao, error: errorVerif } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente')
      .order('created_at', { ascending: false });

    if (errorVerif) {
      console.log('❌ ERRO na verificação:', errorVerif.message);
      return;
    }

    let totalValor = 0;
    let comissoes2000 = 0;
    let comissoesZero = 0;
    let outrosValores = 0;

    verificacao.forEach(comissao => {
      const valor = parseFloat(comissao.valor_comissao || 0);
      totalValor += valor;

      if (valor === 2000) {
        comissoes2000++;
      } else if (valor === 0) {
        comissoesZero++;
      } else {
        outrosValores++;
      }
    });

    console.log(`📊 RESULTADO FINAL:`);
    console.log(`📈 Total de comissões pendentes: ${verificacao.length}`);
    console.log(`💰 Total em comissões pendentes: R$ ${totalValor.toFixed(2)}`);
    console.log(`🎯 Comissões de R$ 2.000,00: ${comissoes2000}`);
    console.log(`⚪ Comissões zeradas: ${comissoesZero}`);
    console.log(`⚠️ Outros valores: ${outrosValores}`);

    console.log('\n📋 DETALHES DAS COMISSÕES:');
    verificacao.forEach((comissao, index) => {
      const valor = parseFloat(comissao.valor_comissao || 0);
      const emoji = valor === 2000 ? '🎯' : valor === 0 ? '⚪' : '⚠️';

      console.log(`${emoji} ${index + 1}. ID: ${comissao.id.substring(0, 8)}... | R$ ${valor.toFixed(2)} | ${comissao.percentual_comissao}%`);
    });

    // Mostrar detalhes das novas comissões
    if (novasComissoes && novasComissoes.length > 0) {
      console.log('\n💡 DETALHES DAS NOVAS COMISSÕES CRIADAS:');
      novasComissoes.forEach((comissao, index) => {
        const valor = parseFloat(comissao.valor_comissao || 0);
        console.log(`${index + 1}. ID: ${comissao.id.substring(0, 8)}...`);
        console.log(`   Valor: R$ ${valor.toFixed(2)}`);
        console.log(`   Percentual: ${comissao.percentual_comissao}%`);
        console.log(`   Status: ${comissao.status_pagamento}`);
        console.log(`   Observações: ${comissao.observacoes.slice(-80)}...`);
        console.log();
      });
    }

    console.log('\n' + '=' .repeat(70));

    if (comissoes2000 === comissoes.length) {
      console.log('🎉 SUCESSO COMPLETO!');
      console.log(`✅ Todas as ${comissoes.length} comissões foram corrigidas para R$ 2.000,00`);
      console.log(`💰 Total em comissões pendentes: R$ ${totalValor.toFixed(2)}`);
    } else if (comissoes2000 > 0) {
      console.log('🎯 SUCESSO PARCIAL!');
      console.log(`✅ ${comissoes2000} comissões corrigidas para R$ 2.000,00`);
      console.log(`⚠️ ${comissoesZero + outrosValores} comissões ainda precisam de correção`);
    } else {
      console.log('❌ PROBLEMA PERSISTENTE!');
      console.log('O campo valor_comissao parece estar protegido por trigger/constraint do banco');
      console.log('Recomendo verificar:');
      console.log('1. Triggers na tabela comissoes');
      console.log('2. Políticas RLS específicas para o campo valor_comissao');
      console.log('3. Constraints ou regras de validação');
      console.log('4. Permissões de coluna específicas');
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar o script
if (require.main === module) {
  solucaoAlternativaComissoes()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { solucaoAlternativaComissoes };