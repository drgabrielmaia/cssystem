import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function fixCommissionValues() {
  console.log('💰 CORRIGINDO VALORES DAS COMISSÕES');
  console.log('='.repeat(60));

  try {
    // 1. Buscar todas as comissões com valor 0
    console.log('📊 1. BUSCANDO COMISSÕES COM VALOR R$ 0...');

    const comissoesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/comissoes?select=*&valor_comissao=eq.0&percentual_comissao=eq.0`,
      { headers }
    );

    if (!comissoesResponse.ok) {
      console.error('❌ Erro ao buscar comissões:', comissoesResponse.status);
      return;
    }

    const comissoes = await comissoesResponse.json();
    console.log(`✅ ${comissoes.length} comissões com valor R$ 0 encontradas`);

    if (comissoes.length === 0) {
      console.log('ℹ️ Nenhuma comissão para corrigir');
      return;
    }

    // 2. Definir valor fixo correto
    const VALOR_FIXO = 2000.00;
    console.log(`💵 Valor fixo a ser aplicado: R$ ${VALOR_FIXO.toFixed(2)}`);

    // 3. Corrigir cada comissão
    console.log('\\n🔄 2. CORRIGINDO VALORES...');

    let updated = 0;
    let errors = 0;

    for (const comissao of comissoes) {
      try {
        const updateData = {
          valor_comissao: VALOR_FIXO
        };

        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/comissoes?id=eq.${comissao.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateData)
          }
        );

        if (updateResponse.ok) {
          console.log(`✅ ID ${comissao.id.substring(0, 8)}: R$ 0 → R$ ${VALOR_FIXO.toFixed(2)}`);
          updated++;
        } else {
          const errorText = await updateResponse.text();
          console.log(`❌ Erro ID ${comissao.id}: ${updateResponse.status}`);
          errors++;
        }

        // Pausa pequena
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`❌ Erro processando comissão ${comissao.id}: ${error.message}`);
        errors++;
      }
    }

    // 4. Resultado
    console.log('\\n📊 RESULTADO:');
    console.log(`✅ Comissões corrigidas: ${updated}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`💰 Valor total em comissões: R$ ${(updated * VALOR_FIXO).toFixed(2)}`);

    // 5. Verificação final
    if (updated > 0) {
      console.log('\\n🔍 VERIFICAÇÃO FINAL...');

      const verificacaoResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/comissoes?select=id,valor_comissao&valor_comissao=eq.${VALOR_FIXO}&limit=5`,
        { headers }
      );

      if (verificacaoResponse.ok) {
        const verificacao = await verificacaoResponse.json();
        console.log(`✅ ${verificacao.length} comissões agora têm valor R$ ${VALOR_FIXO.toFixed(2)}`);

        verificacao.forEach((c, index) => {
          console.log(`   ${index + 1}. ${c.id.substring(0, 8)}: R$ ${c.valor_comissao}`);
        });
      }

      console.log('\\n🎉 SUCESSO! Valores das comissões corrigidos para R$ 2000,00');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }

  console.log('\\n' + '='.repeat(60));
}

// Executar correção
fixCommissionValues();