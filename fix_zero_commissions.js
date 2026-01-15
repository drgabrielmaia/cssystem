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
 * Script para corrigir comissões zeradas
 *
 * PROBLEMA IDENTIFICADO: Existem 7 comissões pendentes com valor_comissao = 0
 * quando deveriam ter R$ 2.000,00 cada uma
 *
 * SOLUÇÃO: Atualizar todas as comissões pendentes que têm valor_comissao = 0
 * para valor_comissao = 2000.00
 */

async function fixZeroCommissions() {
  console.log('🔧 CORRIGINDO COMISSÕES ZERADAS');
  console.log('='.repeat(60));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  try {
    // Passo 1: Buscar comissões pendentes com valor zerado
    console.log('1️⃣ BUSCANDO COMISSÕES PENDENTES COM VALOR ZERADO...');

    const { data: comissoesZeradas, error: errorBusca } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente')
      .or('valor_comissao.eq.0,valor_comissao.is.null');

    if (errorBusca) {
      console.log('❌ ERRO ao buscar comissões:', errorBusca.message);
      return;
    }

    console.log(`📊 Encontradas ${comissoesZeradas.length} comissões zeradas para correção`);

    if (comissoesZeradas.length === 0) {
      console.log('✅ Nenhuma comissão zerada encontrada!');
      return;
    }

    // Mostrar detalhes das comissões encontradas
    console.log('\n📋 DETALHES DAS COMISSÕES ZERADAS:');
    let totalAtual = 0;

    comissoesZeradas.forEach((comissao, index) => {
      const valorAtual = parseFloat(comissao.valor_comissao || 0);
      totalAtual += valorAtual;

      console.log(`${index + 1}. ID: ${comissao.id}`);
      console.log(`   Valor atual: R$ ${valorAtual.toFixed(2)}`);
      console.log(`   Status: ${comissao.status_pagamento}`);
      console.log(`   Mentorado ID: ${comissao.mentorado_id || 'N/A'}`);
      console.log(`   Data criação: ${comissao.created_at || 'N/A'}`);

      // Mostrar parte das observações para identificação
      const obs = comissao.observacoes || 'N/A';
      const obsResumo = obs.length > 50 ? obs.substring(0, 50) + '...' : obs;
      console.log(`   Observações: ${obsResumo}`);
      console.log();
    });

    console.log(`💰 Total atual: R$ ${totalAtual.toFixed(2)}`);
    console.log(`💰 Total após correção: R$ ${(comissoesZeradas.length * 2000).toFixed(2)}`);
    console.log(`📈 Diferença: R$ ${((comissoesZeradas.length * 2000) - totalAtual).toFixed(2)}`);

    // Passo 2: Executar a correção
    console.log('\n2️⃣ EXECUTANDO CORREÇÃO DAS COMISSÕES ZERADAS...');
    console.log(`⚠️  ATENÇÃO: ${comissoesZeradas.length} comissões serão atualizadas para R$ 2.000,00`);
    console.log();

    const agora = new Date().toISOString();
    let sucessos = 0;
    let erros = 0;

    for (const comissao of comissoesZeradas) {
      try {
        // Atualizar observações para incluir histórico da correção
        const novasObservacoes = (comissao.observacoes || '') +
          ` [CORRIGIDO EM ${new Date().toLocaleString('pt-BR')}] Valor atualizado de R$ 0,00 para R$ 2.000,00`;

        const { error: errorUpdate } = await supabase
          .from('comissoes')
          .update({
            valor_comissao: 2000.00,
            observacoes: novasObservacoes,
            updated_at: agora
          })
          .eq('id', comissao.id);

        if (errorUpdate) {
          console.log(`❌ Erro ao atualizar comissão ${comissao.id}:`, errorUpdate.message);
          erros++;
        } else {
          console.log(`✅ Comissão ${comissao.id} atualizada: R$ 0,00 → R$ 2.000,00`);
          sucessos++;
        }
      } catch (e) {
        console.log(`💥 Exceção ao atualizar comissão ${comissao.id}:`, e.message);
        erros++;
      }
    }

    console.log(`\n📊 RESULTADO DA CORREÇÃO:`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`💰 Valor total adicionado: R$ ${(sucessos * 2000).toFixed(2)}`);

    // Passo 3: Verificar resultado final
    console.log('\n3️⃣ VERIFICANDO RESULTADO FINAL...');

    const { data: comissoesAposCorrecao, error: errorVerificacao } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente');

    if (errorVerificacao) {
      console.log('❌ ERRO ao verificar resultado:', errorVerificacao.message);
      return;
    }

    console.log(`📈 Total de comissões pendentes: ${comissoesAposCorrecao.length}`);

    // Calcular totais finais
    let totalPendente = 0;
    let comissoes2000 = 0;
    let comissoesZeradasRestantes = 0;
    let comissoesOutros = 0;

    const relatorioPorMentorado = {};

    comissoesAposCorrecao.forEach(comissao => {
      const valor = parseFloat(comissao.valor_comissao || 0);
      totalPendente += valor;

      // Agrupar por mentorado para relatório
      const mentoradoId = comissao.mentorado_id || 'sem_id';
      if (!relatorioPorMentorado[mentoradoId]) {
        relatorioPorMentorado[mentoradoId] = { quantidade: 0, valor: 0 };
      }
      relatorioPorMentorado[mentoradoId].quantidade++;
      relatorioPorMentorado[mentoradoId].valor += valor;

      // Classificar valores
      if (valor === 2000) {
        comissoes2000++;
      } else if (valor === 0) {
        comissoesZeradasRestantes++;
      } else {
        comissoesOutros++;
      }
    });

    console.log(`💰 Total em comissões pendentes: R$ ${totalPendente.toFixed(2)}`);
    console.log(`🎯 Comissões de R$ 2.000,00: ${comissoes2000}`);
    console.log(`⚠️  Comissões ainda zeradas: ${comissoesZeradasRestantes}`);
    console.log(`📊 Comissões com outros valores: ${comissoesOutros}`);

    // Relatório por mentorado (se houver múltiplas comissões)
    if (Object.keys(relatorioPorMentorado).length <= 10) {
      console.log('\n👥 RELATÓRIO POR MENTORADO:');
      Object.entries(relatorioPorMentorado).forEach(([mentoradoId, dados]) => {
        console.log(`  ${mentoradoId}: ${dados.quantidade} comissões = R$ ${dados.valor.toFixed(2)}`);
      });
    }

    // Mostrar comissões que ainda estão zeradas (se houver)
    if (comissoesZeradasRestantes > 0) {
      console.log('\n⚠️ COMISSÕES AINDA ZERADAS:');
      comissoesAposCorrecao
        .filter(c => parseFloat(c.valor_comissao || 0) === 0)
        .forEach((comissao, index) => {
          console.log(`${index + 1}. ID: ${comissao.id} | Mentorado: ${comissao.mentorado_id || 'N/A'}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ CORREÇÃO DE COMISSÕES ZERADAS CONCLUÍDA!');
    console.log(`🎯 ${sucessos} comissões foram corrigidas com sucesso`);
    console.log(`💰 Total em comissões pendentes agora: R$ ${totalPendente.toFixed(2)}`);

    if (erros > 0) {
      console.log(`⚠️  ${erros} comissões apresentaram erros - verifique os logs acima`);
    }

    if (comissoesZeradasRestantes === 0 && comissoes2000 === comissoesAposCorrecao.length) {
      console.log('🎉 PERFEITO! Todas as comissões pendentes agora têm o valor correto de R$ 2.000,00!');
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar o script
if (require.main === module) {
  fixZeroCommissions()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { fixZeroCommissions };