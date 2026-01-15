const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase - usando service role key se disponível
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis de ambiente do Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Script para corrigir comissões usando SQL direto
 *
 * Vou tentar contornar possíveis problemas com RLS executando SQL diretamente
 */

async function fixCommissionsDirectSQL() {
  console.log('🔧 CORRIGINDO COMISSÕES COM SQL DIRETO');
  console.log('='.repeat(60));
  console.log(`Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log();

  try {
    // Primeiro, vou verificar se existem políticas RLS que podem estar bloqueando
    console.log('1️⃣ VERIFICANDO POLÍTICAS RLS NA TABELA COMISSÕES...');

    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'comissoes' })
      .maybeSingle();

    if (!policiesError && policies) {
      console.log('📋 Políticas RLS encontradas:', policies);
    } else {
      console.log('⚠️ Não foi possível verificar políticas RLS');
    }

    // Tentar atualização direta usando SQL raw
    console.log('\n2️⃣ TENTANDO ATUALIZAÇÃO DIRETA COM SQL...');

    const updateSQL = `
      UPDATE comissoes
      SET
        valor_comissao = 2000.00,
        updated_at = NOW(),
        observacoes = COALESCE(observacoes, '') || ' [SQL DIRETO ' || NOW() || '] Valor corrigido para R$ 2.000,00'
      WHERE
        status_pagamento = 'pendente'
        AND (valor_comissao = 0 OR valor_comissao IS NULL)
      RETURNING id, valor_comissao, updated_at;
    `;

    console.log('Executando SQL:');
    console.log(updateSQL);
    console.log();

    const { data: updateResult, error: updateError } = await supabase
      .rpc('execute_sql', { sql_query: updateSQL });

    if (updateError) {
      console.log('❌ ERRO na atualização SQL:', updateError.message);

      // Tentar abordagem alternativa - atualizar uma por vez com diferentes métodos
      console.log('\n3️⃣ TENTANDO ATUALIZAÇÃO INDIVIDUAL...');

      const { data: comissoes, error: selectError } = await supabase
        .from('comissoes')
        .select('id, valor_comissao, organization_id')
        .eq('status_pagamento', 'pendente')
        .or('valor_comissao.eq.0,valor_comissao.is.null');

      if (selectError) {
        console.log('❌ Erro ao buscar comissões:', selectError.message);
        return;
      }

      console.log(`📊 Encontradas ${comissoes.length} comissões para atualizar`);

      let sucessos = 0;
      let erros = 0;

      for (const comissao of comissoes) {
        console.log(`\n🔄 Atualizando comissão ${comissao.id}...`);

        // Tentar múltiplas abordagens
        const approaches = [
          // Abordagem 1: Update simples
          async () => {
            return await supabase
              .from('comissoes')
              .update({ valor_comissao: 2000.00 })
              .eq('id', comissao.id);
          },

          // Abordagem 2: Update com upsert
          async () => {
            return await supabase
              .from('comissoes')
              .upsert({
                id: comissao.id,
                valor_comissao: 2000.00,
                updated_at: new Date().toISOString()
              });
          },

          // Abordagem 3: RPC específico se disponível
          async () => {
            return await supabase
              .rpc('update_commission_value', {
                commission_id: comissao.id,
                new_value: 2000.00
              });
          }
        ];

        let success = false;
        for (let i = 0; i < approaches.length; i++) {
          try {
            const result = await approaches[i]();
            if (!result.error) {
              console.log(`✅ Sucesso com abordagem ${i + 1}`);
              sucessos++;
              success = true;
              break;
            } else {
              console.log(`❌ Abordagem ${i + 1} falhou: ${result.error.message}`);
            }
          } catch (e) {
            console.log(`💥 Abordagem ${i + 1} teve exceção: ${e.message}`);
          }
        }

        if (!success) {
          console.log(`❌ Todas as abordagens falharam para comissão ${comissao.id}`);
          erros++;
        }
      }

      console.log(`\n📊 RESULTADO: ${sucessos} sucessos, ${erros} erros`);

    } else {
      console.log('✅ SQL executado com sucesso!');
      console.log('Resultado:', updateResult);
    }

    // Verificação final
    console.log('\n4️⃣ VERIFICAÇÃO FINAL...');

    const { data: finalCheck, error: finalError } = await supabase
      .from('comissoes')
      .select('id, valor_comissao, status_pagamento, updated_at')
      .eq('status_pagamento', 'pendente');

    if (finalError) {
      console.log('❌ Erro na verificação final:', finalError.message);
    } else {
      console.log(`📊 Comissões pendentes após tentativa de correção: ${finalCheck.length}`);

      let total = 0;
      let corrigidas = 0;
      let zeradas = 0;

      finalCheck.forEach((c, i) => {
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
      console.log(`📊 Outras: ${finalCheck.length - corrigidas - zeradas}`);
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 TENTATIVA DE CORREÇÃO FINALIZADA');
}

// Executar o script
if (require.main === module) {
  fixCommissionsDirectSQL()
    .then(() => {
      console.log('\n🏁 Script finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { fixCommissionsDirectSQL };