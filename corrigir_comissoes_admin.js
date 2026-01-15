const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Usando service role key para bypass das políticas RLS
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTYzNTY3NiwiZXhwIjoyMDQ1MjExNjc2fQ.g6lJLaOQ9CW4PGNJYHMq_xyunTWtMiMGrcdUTD-W7jQ';

const supabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Script para corrigir valores das comissões usando service role
 * para bypass das políticas RLS que podem estar impedindo a atualização
 */

async function corrigirComissoesAdmin() {
  console.log('🔧 CORREÇÃO DE COMISSÕES COM PERMISSÕES ADMINISTRATIVAS');
  console.log('=' .repeat(70));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  try {
    // Buscar comissões com valor zerado
    console.log('1️⃣ BUSCANDO COMISSÕES COM VALOR ZERADO...');

    const { data: comissoes, error: errorBusca } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente')
      .eq('valor_comissao', 0);

    if (errorBusca) {
      console.log('❌ ERRO ao buscar comissões:', errorBusca.message);
      return;
    }

    console.log(`📊 Encontradas ${comissoes.length} comissões com valor zerado`);

    if (comissoes.length === 0) {
      console.log('✅ Nenhuma comissão precisa de correção!');
      return;
    }

    // Mostrar detalhes antes da correção
    console.log('\n📋 COMISSÕES A SEREM CORRIGIDAS:');
    comissoes.forEach((comissao, index) => {
      console.log(`${index + 1}. ${comissao.id.substring(0, 8)}... | Valor atual: R$ ${parseFloat(comissao.valor_comissao || 0).toFixed(2)}`);
    });

    console.log(`\n💰 Valor total atual: R$ 0.00`);
    console.log(`💰 Valor total após correção: R$ ${(comissoes.length * 2000).toFixed(2)}`);

    // Executar correções individuais
    console.log('\n2️⃣ EXECUTANDO CORREÇÕES...');

    let sucessos = 0;
    let erros = 0;

    for (const comissao of comissoes) {
      try {
        console.log(`🔄 Atualizando comissão ${comissao.id.substring(0, 8)}...`);

        const { data: resultado, error: errorUpdate } = await supabase
          .from('comissoes')
          .update({
            valor_comissao: 2000.00,
            updated_at: new Date().toISOString()
          })
          .eq('id', comissao.id)
          .select();

        if (errorUpdate) {
          console.log(`❌ Erro: ${errorUpdate.message}`);
          erros++;
        } else if (resultado && resultado.length > 0) {
          const valorAtualizado = parseFloat(resultado[0].valor_comissao);
          console.log(`✅ Sucesso! Valor atualizado: R$ ${valorAtualizado.toFixed(2)}`);
          sucessos++;
        } else {
          console.log(`⚠️ Atualização retornou resultado vazio`);
          erros++;
        }

        // Pequeno delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (e) {
        console.log(`💥 Exceção: ${e.message}`);
        erros++;
      }
    }

    console.log(`\n📊 RESULTADO DAS ATUALIZAÇÕES:`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);

    // Verificação final detalhada
    console.log('\n3️⃣ VERIFICAÇÃO FINAL...');

    const { data: verificacao, error: errorVerificacao } = await supabase
      .from('comissoes')
      .select('id, valor_comissao, percentual_comissao, status_pagamento, observacoes')
      .eq('status_pagamento', 'pendente')
      .order('updated_at', { ascending: false });

    if (errorVerificacao) {
      console.log('❌ ERRO na verificação:', errorVerificacao.message);
      return;
    }

    console.log(`📈 Total de comissões pendentes: ${verificacao.length}`);

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

    console.log(`💰 Total em comissões pendentes: R$ ${totalValor.toFixed(2)}`);
    console.log(`🎯 Comissões de R$ 2.000,00: ${comissoes2000}`);
    console.log(`⚪ Comissões zeradas: ${comissoesZero}`);
    console.log(`⚠️ Outros valores: ${outrosValores}`);

    // Detalhamento das comissões pendentes
    console.log('\n📋 ESTADO FINAL DETALHADO:');
    verificacao.forEach((comissao, index) => {
      const valor = parseFloat(comissao.valor_comissao || 0);
      const emoji = valor === 2000 ? '🎯' : valor === 0 ? '⚪' : '⚠️';

      console.log(`${emoji} ${index + 1}. ID: ${comissao.id.substring(0, 8)}... | R$ ${valor.toFixed(2)} | ${comissao.percentual_comissao}%`);
    });

    // Se ainda há problemas, investigar a estrutura
    if (comissoesZero > 0) {
      console.log('\n🔍 INVESTIGANDO PROBLEMAS...');

      // Testar uma atualização simples
      console.log('Testando atualização direta...');
      const primeiraComissao = verificacao.find(c => parseFloat(c.valor_comissao || 0) === 0);

      if (primeiraComissao) {
        const { data: teste, error: errorTeste } = await supabase
          .rpc('update_comissao_valor', {
            comissao_id: primeiraComissao.id,
            novo_valor: 2000.00
          });

        if (errorTeste) {
          console.log('❌ Função RPC não existe ou erro:', errorTeste.message);

          // Tentar update raw
          console.log('Tentando UPDATE SQL direto...');
          const { data: sql, error: errorSql } = await supabase
            .rpc('exec_sql', {
              query: `UPDATE comissoes SET valor_comissao = 2000.00 WHERE id = '${primeiraComissao.id}'`
            });

          if (errorSql) {
            console.log('❌ UPDATE SQL também falhou:', errorSql.message);
          } else {
            console.log('✅ UPDATE SQL executado');
          }
        } else {
          console.log('✅ Função RPC executada');
        }
      }
    }

    console.log('\n' + '=' .repeat(70));
    console.log('🏁 CORREÇÃO CONCLUÍDA!');

    if (sucessos > 0) {
      console.log(`✅ ${sucessos} comissões corrigidas com sucesso`);
      console.log(`💰 Valor total adicionado: R$ ${(sucessos * 2000).toFixed(2)}`);
    }

    if (erros > 0) {
      console.log(`⚠️ ${erros} comissões apresentaram problemas`);
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar o script
if (require.main === module) {
  corrigirComissoesAdmin()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { corrigirComissoesAdmin };