import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function generateRetroactiveCommissions() {
  console.log('🔄 GERANDO COMISSÕES RETROATIVAS');
  console.log('='.repeat(60));

  try {
    // 1. Buscar todos os leads vendidos com indicador e valor
    console.log('🔍 1. BUSCANDO LEADS VENDIDOS COM INDICADOR...');

    const leadsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=*&status=eq.vendido&mentorado_indicador_id=not.is.null&valor_vendido=not.is.null`,
      { headers }
    );

    if (!leadsResponse.ok) {
      console.error('❌ Erro ao buscar leads:', leadsResponse.status);
      return;
    }

    const leads = await leadsResponse.json();
    console.log(`✅ ${leads.length} leads vendidos encontrados com indicador e valor`);

    if (leads.length === 0) {
      console.log('ℹ️ Nenhum lead elegível para comissão retroativa');
      return;
    }

    // 2. Verificar quais já têm comissão
    console.log('\\n🔍 2. VERIFICANDO COMISSÕES EXISTENTES...');

    const existingCommissions = new Set();
    for (const lead of leads) {
      const commissionResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/comissoes?select=lead_id&lead_id=eq.${lead.id}`,
        { headers }
      );

      if (commissionResponse.ok) {
        const commissions = await commissionResponse.json();
        if (commissions.length > 0) {
          existingCommissions.add(lead.id);
        }
      }
    }

    const leadsWithoutCommission = leads.filter(lead => !existingCommissions.has(lead.id));
    console.log(`📊 ${existingCommissions.size} leads já têm comissão`);
    console.log(`📊 ${leadsWithoutCommission.length} leads precisam de comissão`);

    if (leadsWithoutCommission.length === 0) {
      console.log('✅ Todas as comissões já foram geradas!');
      return;
    }

    // 3. Buscar dados dos mentorados indicadores
    console.log('\\n👥 3. CARREGANDO DADOS DOS MENTORADOS...');

    const mentoradosResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email,porcentagem_comissao`,
      { headers }
    );

    if (!mentoradosResponse.ok) {
      console.error('❌ Erro ao carregar mentorados');
      return;
    }

    const mentorados = await mentoradosResponse.json();
    const mentoradosMap = new Map(mentorados.map(m => [m.id, m]));
    console.log(`✅ ${mentorados.length} mentorados carregados`);

    // 4. Gerar comissões retroativas
    console.log('\\n💰 4. GERANDO COMISSÕES RETROATIVAS...');

    let created = 0;
    let errors = 0;
    let skipped = 0;

    for (const lead of leadsWithoutCommission) {
      try {
        const mentorado = mentoradosMap.get(lead.mentorado_indicador_id);

        if (!mentorado) {
          console.log(`⚠️ Mentorado não encontrado: ${lead.mentorado_indicador_id} (Lead: ${lead.nome_completo})`);
          skipped++;
          continue;
        }

        if (!mentorado.porcentagem_comissao || mentorado.porcentagem_comissao <= 0) {
          console.log(`⚠️ Mentorado ${mentorado.nome_completo} sem % comissão (Lead: ${lead.nome_completo})`);
          skipped++;
          continue;
        }

        if (!lead.valor_vendido || lead.valor_vendido <= 0) {
          console.log(`⚠️ Lead ${lead.nome_completo} sem valor de venda válido`);
          skipped++;
          continue;
        }

        // Calcular comissão
        const valorComissao = (lead.valor_vendido * mentorado.porcentagem_comissao) / 100;

        // Criar comissão (com valor_venda obrigatório)
        const comissaoData = {
          mentorado_id: lead.mentorado_indicador_id,
          lead_id: lead.id,
          valor_comissao: valorComissao,
          valor_venda: lead.valor_vendido,
          data_venda: lead.data_venda || lead.created_at || new Date().toISOString(),
          observacoes: `Comissão retroativa: ${mentorado.nome_completo} (${mentorado.porcentagem_comissao}%)`
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
          console.log(`✅ ${mentorado.nome_completo}: R$ ${valorComissao.toFixed(2)} (Lead: ${lead.nome_completo})`);
          created++;
        } else {
          const errorText = await createResponse.text();
          console.log(`❌ Erro para ${lead.nome_completo}: ${createResponse.status} - ${errorText}`);
          errors++;
        }

        // Pausa pequena para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`❌ Erro processando lead ${lead.nome_completo}: ${error.message}`);
        errors++;
      }
    }

    // 5. Resultado final
    console.log('\\n📊 RESULTADO DA GERAÇÃO RETROATIVA:');
    console.log(`✅ Comissões criadas: ${created}`);
    console.log(`⚠️ Ignorados (sem dados): ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processado: ${created + skipped + errors}`);

    if (created > 0) {
      console.log('\\n🎉 SUCESSO! Comissões retroativas geradas.');
      console.log('🏆 Agora o ranking será atualizado automaticamente.');

      // Verificar atualização do ranking
      console.log('\\n🔍 VERIFICANDO ATUALIZAÇÃO DO RANKING...');
      const rankingResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/view_dashboard_comissoes_mentorado?select=*&total_indicacoes=gte.1&limit=5`,
        { headers }
      );

      if (rankingResponse.ok) {
        const rankingData = await rankingResponse.json();
        console.log(`📈 ${rankingData.length} mentorados agora aparecem no ranking com indicações`);

        rankingData.forEach((item, index) => {
          console.log(`  ${index + 1}º lugar: ${item.total_indicacoes} indicações, R$ ${item.total_comissoes || 0} comissões`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }

  console.log('\\n' + '='.repeat(60));
}

// Executar geração retroativa
generateRetroactiveCommissions();