import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function fixExistingCommissions() {
  console.log('🔧 CORRIGINDO COMISSÕES EXISTENTES PARA VALOR FIXO');
  console.log('='.repeat(70));

  try {
    // 1. Buscar todas as comissões existentes com percentual 10%
    console.log('📊 1. BUSCANDO COMISSÕES COM PERCENTUAL 10%...');

    const comissoesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/comissoes?select=*&percentual_comissao=eq.10&order=created_at.desc`,
      { headers }
    );

    if (!comissoesResponse.ok) {
      console.error('❌ Erro ao buscar comissões:', comissoesResponse.status);
      return;
    }

    const comissoes = await comissoesResponse.json();
    console.log(`✅ ${comissoes.length} comissões encontradas com 10%`);

    if (comissoes.length === 0) {
      console.log('ℹ️ Nenhuma comissão para corrigir');
      return;
    }

    // 2. Buscar valor fixo padrão das organizações
    console.log('\\n💰 2. BUSCANDO VALOR FIXO CONFIGURADO...');

    const orgsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=id,name,comissao_fixa_indicacao`,
      { headers }
    );

    let valorFixoPadrao = 2000; // Padrão

    if (orgsResponse.ok) {
      const organizations = await orgsResponse.json();

      if (organizations.length > 0 && organizations[0].comissao_fixa_indicacao) {
        valorFixoPadrao = organizations[0].comissao_fixa_indicacao;
      }
    }

    console.log(`✅ Valor fixo configurado: R$ ${valorFixoPadrao.toFixed(2)}`);

    // 3. Atualizar cada comissão
    console.log('\\n🔄 3. ATUALIZANDO COMISSÕES...');

    let updated = 0;
    let errors = 0;

    for (const comissao of comissoes) {
      try {
        // Buscar dados do mentorado para gerar observação personalizada
        const mentoradoResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/mentorados?select=nome_completo&id=eq.${comissao.mentorado_id}`,
          { headers }
        );

        let mentoradoNome = 'Mentorado';
        if (mentoradoResponse.ok) {
          const mentoradoData = await mentoradoResponse.json();
          if (mentoradoData.length > 0) {
            mentoradoNome = mentoradoData[0].nome_completo;
          }
        }

        // Atualizar comissão para valor fixo
        const updateData = {
          valor_comissao: valorFixoPadrao,
          percentual_comissao: 0, // Zerar percentual já que agora é valor fixo
          observacoes: `Comissão fixa corrigida: ${mentoradoNome} (R$ ${valorFixoPadrao.toFixed(2)} por indicação) - Era ${comissao.percentual_comissao}% sobre R$ ${comissao.valor_venda}`
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
          console.log(`✅ ${mentoradoNome}: R$ ${comissao.valor_comissao} → R$ ${valorFixoPadrao.toFixed(2)}`);
          updated++;
        } else {
          const errorText = await updateResponse.text();
          console.log(`❌ Erro para ${comissao.id}: ${updateResponse.status} - ${errorText}`);
          errors++;
        }

        // Pausa pequena entre requests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`❌ Erro processando comissão ${comissao.id}: ${error.message}`);
        errors++;
      }
    }

    // 4. Resultado final
    console.log('\\n📊 RESULTADO DA CORREÇÃO:');
    console.log(`✅ Comissões atualizadas: ${updated}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processado: ${updated + errors}`);

    // Calcular diferença no total
    const valorAnteriorTotal = comissoes.reduce((sum, c) => sum + c.valor_comissao, 0);
    const valorNovoTotal = updated * valorFixoPadrao;
    const diferenca = valorNovoTotal - valorAnteriorTotal;

    console.log(`\\n💰 IMPACTO FINANCEIRO:`);
    console.log(`   Valor anterior total: R$ ${valorAnteriorTotal.toFixed(2)}`);
    console.log(`   Valor novo total: R$ ${valorNovoTotal.toFixed(2)}`);
    console.log(`   Diferença: ${diferenca >= 0 ? '+' : ''}R$ ${diferenca.toFixed(2)}`);

    if (updated > 0) {
      console.log('\\n🎉 SUCESSO! Comissões corrigidas para valor fixo.');
      console.log('🏆 Sistema agora está consistente com comissão fixa por indicação.');

      // Verificar resultado final
      console.log('\\n🔍 VERIFICANDO RESULTADO...');
      const verificacaoResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/comissoes?select=percentual_comissao,valor_comissao&percentual_comissao=eq.0&valor_comissao=eq.${valorFixoPadrao}`,
        { headers }
      );

      if (verificacaoResponse.ok) {
        const verificacao = await verificacaoResponse.json();
        console.log(`📈 ${verificacao.length} comissões agora estão com valor fixo de R$ ${valorFixoPadrao}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }

  console.log('\\n' + '='.repeat(70));
}

// Executar correção
fixExistingCommissions();