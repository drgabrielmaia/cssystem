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
 * Script para corrigir os valores das comissões que foram zeradas
 *
 * PROBLEMA: As comissões foram corrigidas antes mas os valores ficaram em R$ 0,00
 * em vez de R$ 2.000,00
 *
 * SOLUÇÃO:
 * 1. Buscar comissões pendentes com valor_comissao = 0 e observações contendo "CORRIGIDO"
 * 2. Atualizar para valor_comissao = 2000.00
 */

async function corrigirValoresComissoes() {
  console.log('🔧 CORREÇÃO DOS VALORES DAS COMISSÕES');
  console.log('=' .repeat(60));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  try {
    // Buscar comissões com valor zerado e observações indicando correção anterior
    console.log('1️⃣ BUSCANDO COMISSÕES COM VALORES ZERADOS...');

    const { data: comissoesZeradas, error: errorBusca } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente')
      .eq('valor_comissao', 0)
      .ilike('observacoes', '%CORRIGIDO%');

    if (errorBusca) {
      console.log('❌ ERRO ao buscar comissões:', errorBusca.message);
      return;
    }

    console.log(`📊 Encontradas ${comissoesZeradas.length} comissões com valores zerados`);

    if (comissoesZeradas.length === 0) {
      console.log('✅ Nenhuma comissão precisa de correção de valor!');
      return;
    }

    // Mostrar detalhes das comissões encontradas
    console.log('\n📋 DETALHES DAS COMISSÕES ENCONTRADAS:');

    comissoesZeradas.forEach((comissao, index) => {
      console.log(`${index + 1}. ID: ${comissao.id}`);
      console.log(`   Valor atual: R$ ${parseFloat(comissao.valor_comissao || 0).toFixed(2)}`);
      console.log(`   Percentual: ${comissao.percentual_comissao}%`);
      console.log(`   Status: ${comissao.status_pagamento}`);
      console.log(`   Observações: ${comissao.observacoes}`);
      console.log(`   Data: ${comissao.created_at || 'N/A'}`);
      console.log();
    });

    console.log(`💰 Total atual: R$ 0.00`);
    console.log(`💰 Total após correção: R$ ${(comissoesZeradas.length * 2000).toFixed(2)}`);

    // Executar a atualização
    console.log('\n2️⃣ EXECUTANDO CORREÇÃO DOS VALORES...');

    const agora = new Date().toISOString();
    let sucessos = 0;
    let erros = 0;

    for (const comissao of comissoesZeradas) {
      try {
        // Atualizar apenas o valor, mantendo as observações anteriores
        const novaObservacao = comissao.observacoes + ' - Valor corrigido para R$ 2.000,00';

        const { error: errorUpdate } = await supabase
          .from('comissoes')
          .update({
            valor_comissao: 2000.00,
            observacoes: novaObservacao,
            updated_at: agora
          })
          .eq('id', comissao.id);

        if (errorUpdate) {
          console.log(`❌ Erro ao atualizar comissão ${comissao.id}:`, errorUpdate.message);
          erros++;
        } else {
          console.log(`✅ Comissão ${comissao.id} atualizada: R$ 0.00 → R$ 2.000,00`);
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

    // Verificar o resultado final
    console.log('\n3️⃣ VERIFICANDO RESULTADO FINAL...');

    const { data: comissoesFinais, error: errorVerificacao } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente');

    if (errorVerificacao) {
      console.log('❌ ERRO ao verificar resultado:', errorVerificacao.message);
      return;
    }

    console.log(`📈 Total de comissões pendentes: ${comissoesFinais.length}`);

    let totalPendente = 0;
    let comissoes2000 = 0;
    let comissoesZero = 0;
    let comissoesOutros = 0;

    comissoesFinais.forEach(comissao => {
      const valor = parseFloat(comissao.valor_comissao || 0);
      totalPendente += valor;

      if (valor === 2000) {
        comissoes2000++;
      } else if (valor === 0) {
        comissoesZero++;
      } else {
        comissoesOutros++;
      }
    });

    console.log(`💰 Total em comissões pendentes: R$ ${totalPendente.toFixed(2)}`);
    console.log(`🎯 Comissões de R$ 2.000,00: ${comissoes2000}`);
    console.log(`⚪ Comissões zeradas: ${comissoesZero}`);
    console.log(`⚠️  Comissões com outros valores: ${comissoesOutros}`);

    // Listar comissões finais
    console.log('\n📋 ESTADO FINAL DAS COMISSÕES PENDENTES:');
    comissoesFinais.forEach((comissao, index) => {
      const valor = parseFloat(comissao.valor_comissao || 0);
      const status = valor === 2000 ? '🎯' : valor === 0 ? '⚪' : '⚠️';

      console.log(`${status} ${index + 1}. ID: ${comissao.id.substring(0, 8)}... | Valor: R$ ${valor.toFixed(2)} | Percentual: ${comissao.percentual_comissao}%`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('✅ CORREÇÃO DE VALORES CONCLUÍDA!');
    console.log(`🎯 ${sucessos} valores foram corrigidos para R$ 2.000,00`);
    if (erros > 0) {
      console.log(`⚠️  ${erros} comissões apresentaram erros`);
    }
    console.log(`💰 Total de comissões corrigidas: R$ ${(sucessos * 2000).toFixed(2)}`);

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar o script
if (require.main === module) {
  corrigirValoresComissoes()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { corrigirValoresComissoes };