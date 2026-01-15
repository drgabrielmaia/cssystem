import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function fixTestLead() {
  console.log('🔧 CORRIGINDO LEAD "TESTE" PARA GERAR COMISSÃO');
  console.log('='.repeat(60));

  try {
    // 1. Encontrar o lead "Teste" mais recente
    const leadsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=*&nome_completo=eq.Teste&order=created_at.desc&limit=1`,
      { headers }
    );

    if (leadsResponse.ok) {
      const leads = await leadsResponse.json();

      if (leads.length > 0) {
        const testLead = leads[0];
        console.log('✅ Lead "Teste" encontrado:');
        console.log(`   🆔 ID: ${testLead.id}`);
        console.log(`   📧 Email: ${testLead.email}`);
        console.log(`   📊 Status: ${testLead.status}`);
        console.log(`   👤 Indicador: ${testLead.mentorado_indicador_id}`);
        console.log(`   💰 Valor atual: ${testLead.valor_vendido || 'Nenhum'}`);

        // 2. Atualizar com valor de venda para testar a comissão
        console.log('\\n💰 Adicionando valor de venda de R$ 5000...');

        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/leads?id=eq.${testLead.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              valor_vendido: 5000.00,
              data_venda: new Date().toISOString()
            })
          }
        );

        if (updateResponse.ok) {
          console.log('✅ Lead atualizado com sucesso!');

          // 3. Verificar se existe comissão
          console.log('\\n🔍 Verificando se comissão foi gerada automaticamente...');

          const comissaoResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/comissoes?select=*&lead_id=eq.${testLead.id}`,
            { headers }
          );

          if (comissaoResponse.ok) {
            const comissoes = await comissaoResponse.json();

            if (comissoes.length > 0) {
              console.log(`✅ ${comissoes.length} comissão(ões) encontrada(s):`);
              comissoes.forEach((comissao, idx) => {
                console.log(`   ${idx + 1}. Valor: R$ ${comissao.valor_comissao}`);
                console.log(`      Status: ${comissao.status_comissao}`);
                console.log(`      Mentorado: ${comissao.mentorado_id}`);
              });
            } else {
              console.log('❌ Nenhuma comissão encontrada');
              console.log('💡 A comissão será gerada quando o lead for editado pelo frontend');

              // 4. Criar comissão manualmente para demonstrar
              console.log('\\n🛠️ Criando comissão manualmente...');

              const emersonId = 'c97fae5f-20e2-4c13-8dde-4ace778be2cd';
              const valorComissao = 5000 * 0.10; // 10% de comissão

              const comissaoData = {
                mentorado_id: emersonId,
                lead_id: testLead.id,
                valor_comissao: valorComissao,
                valor_venda: 5000,
                porcentagem_aplicada: 10,
                status_comissao: 'pendente',
                data_venda: new Date().toISOString(),
                observacoes: 'Comissão criada para teste - lead Teste',
                created_at: new Date().toISOString()
              };

              const createComissaoResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/comissoes`,
                {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(comissaoData)
                }
              );

              if (createComissaoResponse.ok) {
                console.log(`✅ Comissão de R$ ${valorComissao} criada manualmente!`);
              } else {
                console.log('❌ Erro ao criar comissão:', createComissaoResponse.status);
              }
            }
          }

          console.log('\\n🎯 PRÓXIMO TESTE:');
          console.log('   1. Acesse a tela de Leads no frontend');
          console.log('   2. Edite o lead "Teste" (mude algum campo)');
          console.log('   3. Salve - a comissão deve ser gerada automaticamente');
          console.log('   4. Verifique se aparece alerta de confirmação');

        } else {
          console.log('❌ Erro ao atualizar lead:', updateResponse.status);
        }

      } else {
        console.log('❌ Lead "Teste" não encontrado');
      }

    } else {
      console.log('❌ Erro ao buscar leads:', leadsResponse.status);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\\n' + '='.repeat(60));
}

// Executar correção
fixTestLead();