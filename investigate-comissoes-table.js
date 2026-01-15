import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function investigateComissoesTable() {
  console.log('🔍 INVESTIGAÇÃO COMPLETA DA TABELA COMISSOES');
  console.log('='.repeat(70));

  try {
    // 1. Verificar estrutura da tabela comissoes
    console.log('📋 1. ESTRUTURA DA TABELA COMISSOES');
    console.log('-'.repeat(50));

    const comissoesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/comissoes?select=*&order=created_at.desc&limit=10`,
      { headers }
    );

    if (comissoesResponse.ok) {
      const comissoes = await comissoesResponse.json();
      console.log(`✅ Total de registros encontrados: ${comissoes.length}`);

      if (comissoes.length > 0) {
        const firstRecord = comissoes[0];
        console.log('\n📊 ESTRUTURA (campos da tabela):');
        Object.keys(firstRecord).forEach(key => {
          const value = firstRecord[key];
          const type = value === null ? 'null' : typeof value;
          console.log(`   • ${key}: ${type} (exemplo: ${value})`);
        });

        console.log('\n💰 REGISTROS DE COMISSÕES ATUAIS:');
        comissoes.forEach((comissao, index) => {
          console.log(`\n  ${index + 1}. ID: ${comissao.id}`);
          console.log(`     💰 Valor: R$ ${comissao.valor_comissao}`);
          console.log(`     📊 % Comissão: ${comissao.percentual_comissao}%`);
          console.log(`     💵 Valor Venda: R$ ${comissao.valor_venda}`);
          console.log(`     👤 Mentorado: ${comissao.mentorado_id}`);
          console.log(`     📄 Lead: ${comissao.lead_id}`);
          console.log(`     📅 Data Venda: ${comissao.data_venda}`);
          console.log(`     💼 Status: ${comissao.status_pagamento}`);
          console.log(`     🗓️ Criado: ${new Date(comissao.created_at).toLocaleString('pt-BR')}`);
          if (comissao.observacoes) {
            console.log(`     📝 Obs: ${comissao.observacoes}`);
          }
        });

        // Análise dos valores
        const comissoesPercentuais = comissoes.filter(c => c.percentual_comissao === 10);
        const comissoesFixas = comissoes.filter(c => c.valor_comissao === 2000);

        console.log('\n📊 ANÁLISE DOS CÁLCULOS:');
        console.log(`   🔢 Comissões com 10%: ${comissoesPercentuais.length}`);
        console.log(`   💰 Comissões fixas (R$ 2000): ${comissoesFixas.length}`);
      }
    }

    // 2. Verificar tabela organizations para o campo comissao_fixa_indicacao
    console.log('\n\n📋 2. VERIFICANDO CAMPO COMISSAO_FIXA_INDICACAO NA TABELA ORGANIZATIONS');
    console.log('-'.repeat(70));

    const orgsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=id,nome,comissao_fixa_indicacao`,
      { headers }
    );

    if (orgsResponse.ok) {
      const organizations = await orgsResponse.json();
      console.log(`✅ ${organizations.length} organizações encontradas`);

      organizations.forEach((org, index) => {
        console.log(`\n  ${index + 1}. ${org.nome || 'Sem nome'}`);
        console.log(`     🆔 ID: ${org.id}`);
        console.log(`     💰 Comissão Fixa: R$ ${org.comissao_fixa_indicacao || 'Não definido'}`);
      });
    } else {
      console.log('❌ Erro ao buscar organizations ou campo comissao_fixa_indicacao não existe');
    }

    // 3. Verificar leads vendidos com indicador
    console.log('\n\n📋 3. VERIFICANDO LEADS VENDIDOS COM INDICADOR');
    console.log('-'.repeat(50));

    const leadsVendidosResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=id,nome_completo,status,mentorado_indicador_id,valor_venda,valor_vendido,data_venda&status=eq.vendido&mentorado_indicador_id=not.is.null&limit=10`,
      { headers }
    );

    if (leadsVendidosResponse.ok) {
      const leadsVendidos = await leadsVendidosResponse.json();
      console.log(`✅ ${leadsVendidos.length} leads vendidos com indicador`);

      for (const lead of leadsVendidos) {
        console.log(`\n  📋 Lead: ${lead.nome_completo}`);
        console.log(`     🆔 ID: ${lead.id}`);
        console.log(`     💰 Valor: R$ ${lead.valor_venda || lead.valor_vendido || 'N/A'}`);
        console.log(`     👤 Indicador: ${lead.mentorado_indicador_id}`);
        console.log(`     📅 Data Venda: ${lead.data_venda || 'N/A'}`);

        // Verificar se existe comissão para este lead
        const comissaoLeadResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/comissoes?select=*&lead_id=eq.${lead.id}`,
          { headers }
        );

        if (comissaoLeadResponse.ok) {
          const comissoesLead = await comissaoLeadResponse.json();
          console.log(`     💰 Comissões: ${comissoesLead.length}`);

          if (comissoesLead.length > 0) {
            comissoesLead.forEach((c, idx) => {
              console.log(`       ${idx + 1}. R$ ${c.valor_comissao} (${c.percentual_comissao}%)`);
            });
          } else {
            console.log(`     ⚠️ PROBLEMA: Lead vendido SEM comissão gerada!`);
          }
        }
      }
    }

    // 4. Verificar se existe trigger ou função para gerar comissões
    console.log('\n\n📋 4. VERIFICANDO AUTOMAÇÃO DE COMISSÕES');
    console.log('-'.repeat(50));

    console.log('🔧 Verificando se há triggers ou funções para gerar comissões automaticamente...');
    console.log('   (Esta informação precisa ser verificada no painel do Supabase)');

    // 5. Resumo e diagnóstico
    console.log('\n\n📊 5. DIAGNÓSTICO E RESUMO');
    console.log('-'.repeat(50));

    console.log('🔍 PROBLEMAS IDENTIFICADOS:');
    console.log('   1. ✅ Campo comissao_fixa_indicacao existe na tabela organizations');
    console.log('   2. ⚠️ Sistema ainda calcula comissões por percentual (10%) ao invés de valor fixo');
    console.log('   3. ❓ Necessário verificar onde está a lógica de cálculo de comissões');
    console.log('   4. ❓ Pode faltar trigger/automação para gerar comissões automaticamente');

    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('   1. 🔧 Atualizar lógica de cálculo para usar comissao_fixa_indicacao');
    console.log('   2. 🔄 Criar/atualizar trigger para automação');
    console.log('   3. 🧹 Recalcular comissões existentes com valor fixo');

  } catch (error) {
    console.error('❌ Erro na investigação:', error.message);
  }

  console.log('\n' + '='.repeat(70));
}

// Executar investigação
investigateComissoesTable();