const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis de ambiente do Supabase');
  process.exit(1);
}

/**
 * Script para corrigir comissões usando REST API diretamente
 *
 * Tentativa de contornar possíveis problemas com RLS/triggers
 */

async function fixCommissionsRestAPI() {
  console.log('🌐 CORRIGINDO COMISSÕES VIA REST API');
  console.log('='.repeat(60));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    // 1. Buscar comissões pendentes zeradas
    console.log('1️⃣ BUSCANDO COMISSÕES PENDENTES ZERADAS...');

    const fetchResponse = await fetch(
      `${supabaseUrl}/rest/v1/comissoes?status_pagamento=eq.pendente&or=(valor_comissao.eq.0,valor_comissao.is.null)`,
      { headers }
    );

    if (!fetchResponse.ok) {
      throw new Error(`Erro ao buscar comissões: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }

    const comissoes = await fetchResponse.json();
    console.log(`📊 Encontradas ${comissoes.length} comissões zeradas`);

    if (comissoes.length === 0) {
      console.log('✅ Nenhuma comissão zerada encontrada!');
      return;
    }

    // Mostrar detalhes
    console.log('\n📋 DETALHES DAS COMISSÕES ZERADAS:');
    comissoes.forEach((comissao, index) => {
      console.log(`${index + 1}. ID: ${comissao.id}`);
      console.log(`   Valor atual: R$ ${parseFloat(comissao.valor_comissao || 0).toFixed(2)}`);
      console.log(`   Mentorado: ${comissao.mentorado_id}`);
      console.log();
    });

    // 2. Tentar atualizar cada comissão individualmente
    console.log('2️⃣ ATUALIZANDO COMISSÕES INDIVIDUALMENTE...');

    let sucessos = 0;
    let erros = 0;

    for (const comissao of comissoes) {
      try {
        console.log(`🔄 Atualizando comissão ${comissao.id}...`);

        // Preparar dados para atualização
        const updateData = {
          valor_comissao: 2000.00,
          updated_at: new Date().toISOString(),
          observacoes: (comissao.observacoes || '') + ` [REST API ${new Date().toLocaleString('pt-BR')}] Valor corrigido para R$ 2.000,00`
        };

        // Fazer a requisição PUT
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/comissoes?id=eq.${comissao.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateData)
          }
        );

        if (updateResponse.ok) {
          const updated = await updateResponse.json();
          console.log(`✅ Sucesso: ${updated.length} registro(s) atualizado(s)`);
          sucessos++;
        } else {
          const errorText = await updateResponse.text();
          console.log(`❌ Erro HTTP ${updateResponse.status}: ${errorText}`);
          erros++;
        }

      } catch (e) {
        console.log(`💥 Exceção: ${e.message}`);
        erros++;
      }
    }

    console.log(`\n📊 RESULTADO: ${sucessos} sucessos, ${erros} erros`);

    // 3. Verificação final
    console.log('\n3️⃣ VERIFICAÇÃO FINAL...');

    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/comissoes?status_pagamento=eq.pendente&select=id,valor_comissao,mentorado_id,updated_at`,
      { headers }
    );

    if (!checkResponse.ok) {
      throw new Error(`Erro na verificação: ${checkResponse.status}`);
    }

    const finalComissoes = await checkResponse.json();
    console.log(`📊 Total de comissões pendentes: ${finalComissoes.length}`);

    let total = 0;
    let corrigidas = 0;
    let zeradas = 0;

    finalComissoes.forEach((c, i) => {
      const valor = parseFloat(c.valor_comissao || 0);
      total += valor;

      if (valor === 2000) {
        corrigidas++;
        console.log(`✅ ${i + 1}. ${c.id}: R$ ${valor.toFixed(2)}`);
      } else if (valor === 0) {
        zeradas++;
        console.log(`❌ ${i + 1}. ${c.id}: R$ ${valor.toFixed(2)} (ainda zerada)`);
      } else {
        console.log(`⚠️ ${i + 1}. ${c.id}: R$ ${valor.toFixed(2)} (valor diferente)`);
      }
    });

    console.log(`\n📈 RESUMO FINAL:`);
    console.log(`💰 Total em comissões: R$ ${total.toFixed(2)}`);
    console.log(`✅ Comissões corrigidas (R$ 2.000): ${corrigidas}`);
    console.log(`❌ Comissões ainda zeradas: ${zeradas}`);
    console.log(`📊 Outras: ${finalComissoes.length - corrigidas - zeradas}`);

    if (zeradas === 0 && corrigidas === finalComissoes.length) {
      console.log('\n🎉 SUCESSO! Todas as comissões pendentes agora têm R$ 2.000,00!');
    } else if (zeradas > 0) {
      console.log('\n⚠️ Ainda há comissões zeradas. Pode haver políticas RLS ou triggers bloqueando a atualização.');

      // Tentar descobrir mais sobre o problema
      console.log('\n🔍 DIAGNÓSTICO ADICIONAL...');

      // Verificar se consegue inserir uma nova comissão de teste
      try {
        const testData = {
          mentorado_id: comissoes[0].mentorado_id,
          valor_comissao: 2000.00,
          status_pagamento: 'teste',
          observacoes: 'TESTE - pode deletar'
        };

        const testResponse = await fetch(
          `${supabaseUrl}/rest/v1/comissoes`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(testData)
          }
        );

        if (testResponse.ok) {
          console.log('✅ Consegue inserir comissões normalmente');

          // Deletar o teste
          const testResult = await testResponse.json();
          if (testResult.length > 0) {
            await fetch(
              `${supabaseUrl}/rest/v1/comissoes?id=eq.${testResult[0].id}`,
              { method: 'DELETE', headers }
            );
            console.log('🗑️ Comissão de teste removida');
          }
        } else {
          console.log('❌ Não consegue inserir comissões - problema de permissões');
        }
      } catch (e) {
        console.log('❌ Erro no teste de inserção:', e.message);
      }
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 CORREÇÃO VIA REST API FINALIZADA');
}

// Executar o script
if (require.main === module) {
  fixCommissionsRestAPI()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { fixCommissionsRestAPI };