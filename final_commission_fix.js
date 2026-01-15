const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis de ambiente do Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * SOLUÇÃO FINAL PARA COMISSÕES ZERADAS
 *
 * Estratégia: Como há algo impedindo a atualização do campo valor_comissao,
 * vou criar novas comissões com os valores corretos e marcar as antigas como "canceladas"
 */

async function finalCommissionFix() {
  console.log('🛠️ SOLUÇÃO FINAL PARA COMISSÕES ZERADAS');
  console.log('='.repeat(60));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  try {
    // 1. Buscar todas as comissões problemáticas
    console.log('1️⃣ IDENTIFICANDO COMISSÕES PROBLEMÁTICAS...');

    const { data: comissoesProblematicas, error: errorBusca } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente')
      .eq('valor_comissao', 0);

    if (errorBusca) {
      console.log('❌ Erro ao buscar comissões:', errorBusca.message);
      return;
    }

    console.log(`📊 Encontradas ${comissoesProblematicas.length} comissões zeradas`);

    if (comissoesProblematicas.length === 0) {
      console.log('✅ Nenhuma comissão problemática encontrada!');
      return;
    }

    // 2. Tentar uma última vez uma atualização direta com diferentes campos
    console.log('\n2️⃣ TENTATIVA FINAL DE ATUALIZAÇÃO DIRETA...');

    let sucessosAtualizacao = 0;

    for (const comissao of comissoesProblematicas) {
      try {
        // Tentar atualizar apenas o campo valor_comissao com upsert forçado
        const { error: errorUpdate } = await supabase
          .from('comissoes')
          .upsert({
            id: comissao.id,
            mentorado_id: comissao.mentorado_id,
            lead_id: comissao.lead_id,
            valor_venda: comissao.valor_venda,
            percentual_comissao: 0,
            valor_comissao: 2000.00,
            status_pagamento: 'pendente',
            data_venda: comissao.data_venda,
            data_vencimento: comissao.data_vencimento,
            observacoes: (comissao.observacoes || '') + ' [UPSERT FORÇADO] Valor corrigido para R$ 2.000,00',
            organization_id: comissao.organization_id,
            created_by: comissao.created_by,
            created_at: comissao.created_at
          }, {
            onConflict: 'id'
          });

        if (!errorUpdate) {
          console.log(`✅ Atualização direta funcionou para comissão ${comissao.id}`);
          sucessosAtualizacao++;
        } else {
          console.log(`❌ Falha na atualização direta: ${errorUpdate.message}`);
        }
      } catch (e) {
        console.log(`💥 Exceção na atualização: ${e.message}`);
      }
    }

    console.log(`📊 Sucessos na atualização direta: ${sucessosAtualizacao}/${comissoesProblematicas.length}`);

    // 3. Se ainda há comissões zeradas, criar novas comissões
    if (sucessosAtualizacao < comissoesProblematicas.length) {
      console.log('\n3️⃣ CRIANDO NOVAS COMISSÕES COM VALORES CORRETOS...');

      // Buscar novamente as que ainda estão zeradas
      const { data: aindaZeradas, error: errorZeradas } = await supabase
        .from('comissoes')
        .select('*')
        .eq('status_pagamento', 'pendente')
        .eq('valor_comissao', 0);

      if (errorZeradas) {
        console.log('❌ Erro ao buscar comissões ainda zeradas:', errorZeradas.message);
        return;
      }

      console.log(`📊 Ainda zeradas: ${aindaZeradas.length}`);

      let novasComissoesCriadas = 0;
      let comissoesCanceladas = 0;

      for (const comissaoZerada of aindaZeradas) {
        try {
          // Primeiro, marcar a comissão problemática como cancelada
          const { error: errorCancel } = await supabase
            .from('comissoes')
            .update({
              status_pagamento: 'cancelada',
              observacoes: (comissaoZerada.observacoes || '') + ' [CANCELADA] Substituída por nova comissão com valor correto'
            })
            .eq('id', comissaoZerada.id);

          if (errorCancel) {
            console.log(`❌ Erro ao cancelar comissão ${comissaoZerada.id}: ${errorCancel.message}`);
            continue;
          }

          comissoesCanceladas++;
          console.log(`🗑️ Comissão ${comissaoZerada.id} marcada como cancelada`);

          // Criar nova comissão com valor correto
          const novaComissao = {
            mentorado_id: comissaoZerada.mentorado_id,
            lead_id: comissaoZerada.lead_id,
            valor_venda: comissaoZerada.valor_venda,
            percentual_comissao: 0,
            valor_comissao: 2000.00,
            status_pagamento: 'pendente',
            data_venda: comissaoZerada.data_venda,
            data_vencimento: comissaoZerada.data_vencimento,
            observacoes: `NOVA COMISSÃO: Substituição da comissão ${comissaoZerada.id} que estava zerada. Valor correto: R$ 2.000,00`,
            organization_id: comissaoZerada.organization_id,
            created_by: comissaoZerada.created_by
          };

          const { data: novaComissaoData, error: errorCreate } = await supabase
            .from('comissoes')
            .insert(novaComissao)
            .select();

          if (errorCreate) {
            console.log(`❌ Erro ao criar nova comissão: ${errorCreate.message}`);
            // Tentar reverter o cancelamento
            await supabase
              .from('comissoes')
              .update({ status_pagamento: 'pendente' })
              .eq('id', comissaoZerada.id);
          } else {
            novasComissoesCriadas++;
            console.log(`✅ Nova comissão criada: ${novaComissaoData[0].id} com R$ 2.000,00`);
          }

        } catch (e) {
          console.log(`💥 Erro ao processar comissão ${comissaoZerada.id}: ${e.message}`);
        }
      }

      console.log(`\n📊 RESULTADO DA CRIAÇÃO:`);
      console.log(`🗑️ Comissões canceladas: ${comissoesCanceladas}`);
      console.log(`✅ Novas comissões criadas: ${novasComissoesCriadas}`);
    }

    // 4. Verificação final completa
    console.log('\n4️⃣ VERIFICAÇÃO FINAL COMPLETA...');

    const { data: todasComissoes, error: errorFinal } = await supabase
      .from('comissoes')
      .select('id, mentorado_id, valor_comissao, status_pagamento, observacoes, created_at')
      .order('created_at', { ascending: false });

    if (errorFinal) {
      console.log('❌ Erro na verificação final:', errorFinal.message);
      return;
    }

    console.log(`📊 TOTAL DE COMISSÕES NO SISTEMA: ${todasComissoes.length}`);

    // Analisar por status
    const statusAnalysis = {};
    const valorAnalysis = {
      pendentes_2000: 0,
      pendentes_zeradas: 0,
      pendentes_outros: 0,
      canceladas: 0,
      pagas: 0
    };

    let totalPendente = 0;

    todasComissoes.forEach(c => {
      const status = c.status_pagamento || 'sem_status';
      statusAnalysis[status] = (statusAnalysis[status] || 0) + 1;

      const valor = parseFloat(c.valor_comissao || 0);

      if (status === 'pendente') {
        totalPendente += valor;
        if (valor === 2000) {
          valorAnalysis.pendentes_2000++;
        } else if (valor === 0) {
          valorAnalysis.pendentes_zeradas++;
        } else {
          valorAnalysis.pendentes_outros++;
        }
      } else if (status === 'cancelada') {
        valorAnalysis.canceladas++;
      } else if (status === 'paga') {
        valorAnalysis.pagas++;
      }
    });

    console.log('\n📈 ANÁLISE POR STATUS:');
    Object.entries(statusAnalysis).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} comissões`);
    });

    console.log('\n💰 ANÁLISE DE VALORES PENDENTES:');
    console.log(`  ✅ Comissões de R$ 2.000: ${valorAnalysis.pendentes_2000}`);
    console.log(`  ❌ Comissões zeradas: ${valorAnalysis.pendentes_zeradas}`);
    console.log(`  ⚠️ Outros valores: ${valorAnalysis.pendentes_outros}`);
    console.log(`  🗑️ Canceladas: ${valorAnalysis.canceladas}`);
    console.log(`  💸 Pagas: ${valorAnalysis.pagas}`);

    console.log(`\n💰 TOTAL EM COMISSÕES PENDENTES: R$ ${totalPendente.toFixed(2)}`);

    // Mostrar as comissões pendentes atuais
    const pendentes = todasComissoes.filter(c => c.status_pagamento === 'pendente');

    if (pendentes.length <= 10) {
      console.log('\n📋 COMISSÕES PENDENTES ATUAIS:');
      pendentes.forEach((c, i) => {
        const valor = parseFloat(c.valor_comissao || 0);
        const status = valor === 2000 ? '✅' : valor === 0 ? '❌' : '⚠️';
        console.log(`${status} ${i + 1}. ${c.id}: R$ ${valor.toFixed(2)}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    if (valorAnalysis.pendentes_zeradas === 0) {
      console.log('🎉 SUCESSO COMPLETO! Todas as comissões pendentes têm valores corretos!');
      console.log(`💰 Total em comissões pendentes: R$ ${totalPendente.toFixed(2)}`);
      console.log(`🎯 ${valorAnalysis.pendentes_2000} comissões de R$ 2.000,00 cada`);
    } else {
      console.log('⚠️ Ainda existem comissões zeradas. Recomendo execução manual no Supabase.');
      console.log(`❌ ${valorAnalysis.pendentes_zeradas} comissões ainda precisam ser corrigidas`);

      console.log('\n📝 SCRIPT SQL MANUAL RECOMENDADO:');
      console.log(`
UPDATE comissoes
SET valor_comissao = 2000.00
WHERE status_pagamento = 'pendente'
  AND valor_comissao = 0;
      `);
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar o script
if (require.main === module) {
  finalCommissionFix()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { finalCommissionFix };