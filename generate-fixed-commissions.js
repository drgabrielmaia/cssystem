import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function generateFixedCommissions() {
  console.log('💰 GERANDO COMISSÕES FIXAS POR INDICAÇÃO');
  console.log('='.repeat(60));

  try {
    // 1. Primeiro, limpar comissões existentes
    console.log('🧹 1. LIMPANDO COMISSÕES EXISTENTES...');

    const deleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/comissoes?observacoes=like.*retroativa*`,
      {
        method: 'DELETE',
        headers
      }
    );

    console.log('✅ Comissões antigas removidas');

    // 2. Buscar leads vendidos com indicador
    console.log('\\n🔍 2. BUSCANDO LEADS VENDIDOS COM INDICADOR...');

    const leadsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=*&status=eq.vendido&mentorado_indicador_id=not.is.null`,
      { headers }
    );

    if (!leadsResponse.ok) {
      console.error('❌ Erro ao buscar leads:', leadsResponse.status);
      return;
    }

    const leads = await leadsResponse.json();
    console.log(`✅ ${leads.length} leads vendidos encontrados com indicador`);

    if (leads.length === 0) {
      console.log('ℹ️ Nenhum lead elegível para comissão');
      return;
    }

    // 3. Configurar valor fixo padrão (R$ 2.000)
    const COMISSAO_FIXA = 2000.00;

    // 4. Gerar comissões fixas
    console.log('\\n💰 3. GERANDO COMISSÕES FIXAS...');
    console.log(`💵 Valor fixo por indicação: R$ ${COMISSAO_FIXA.toFixed(2)}`);

    let created = 0;
    let errors = 0;
    let skipped = 0;

    for (const lead of leads) {
      try {
        // Verificar se já existe comissão
        const existingResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/comissoes?select=id&lead_id=eq.${lead.id}`,
          { headers }
        );

        if (existingResponse.ok) {
          const existing = await existingResponse.json();
          if (existing.length > 0) {
            console.log(`⚠️ Lead ${lead.nome_completo} já tem comissão`);
            skipped++;
            continue;
          }
        }

        // Buscar dados do mentorado
        const mentoradoResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/mentorados?select=nome_completo&id=eq.${lead.mentorado_indicador_id}`,
          { headers }
        );

        let mentoradoNome = 'Mentorado não encontrado';
        if (mentoradoResponse.ok) {
          const mentoradoData = await mentoradoResponse.json();
          if (mentoradoData.length > 0) {
            mentoradoNome = mentoradoData[0].nome_completo;
          }
        }

        // Criar comissão fixa
        const comissaoData = {
          mentorado_id: lead.mentorado_indicador_id,
          lead_id: lead.id,
          valor_comissao: COMISSAO_FIXA,
          valor_venda: lead.valor_vendido || 0,
          data_venda: lead.data_venda || lead.created_at || new Date().toISOString(),
          observacoes: `Comissão fixa retroativa: ${mentoradoNome} (R$ ${COMISSAO_FIXA.toFixed(2)} por indicação)`
        };

        const createResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/comissoes`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(comissaoData)
          }
        );

        if (createResponse.ok) {
          console.log(`✅ ${mentoradoNome}: R$ ${COMISSAO_FIXA.toFixed(2)} (Lead: ${lead.nome_completo})`);
          created++;
        } else {
          const errorText = await createResponse.text();
          console.log(`❌ Erro para ${lead.nome_completo}: ${createResponse.status} - ${errorText}`);
          errors++;
        }

        // Pausa pequena
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`❌ Erro processando lead ${lead.nome_completo}: ${error.message}`);
        errors++;
      }
    }

    // 5. Resultado final
    console.log('\\n📊 RESULTADO DA GERAÇÃO:');
    console.log(`✅ Comissões criadas: ${created}`);
    console.log(`⚠️ Ignorados (já existiam): ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processado: ${created + skipped + errors}`);
    console.log(`💰 Total em comissões: R$ ${(created * COMISSAO_FIXA).toFixed(2)}`);

    if (created > 0) {
      console.log('\\n🎉 SUCESSO! Comissões fixas geradas.');
      console.log('🏆 Sistema agora usa valor fixo por indicação.');

      // Verificar ranking
      console.log('\\n🔍 VERIFICANDO RANKING...');
      const rankingResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/view_dashboard_comissoes_mentorado?select=*&total_indicacoes=gte.1&limit=5`,
        { headers }
      );

      if (rankingResponse.ok) {
        const rankingData = await rankingResponse.json();
        console.log(`📈 ${rankingData.length} mentorados no ranking`);

        rankingData.forEach((item, index) => {
          console.log(`  ${index + 1}º lugar: ${item.total_indicacoes} indicações`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }

  console.log('\\n' + '='.repeat(60));
}

// Executar geração
generateFixedCommissions();