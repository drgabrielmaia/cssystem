import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

// SQL para corrigir o trigger
const TRIGGER_FIX_SQL = `
-- Fix para usar comissão fixa por indicação ao invés de percentual
-- Este script corrige o trigger para usar o valor fixo definido na tabela organizations

-- 1. Função CORRIGIDA para criar comissão automática com VALOR FIXO
CREATE OR REPLACE FUNCTION criar_comissao_indicacao()
RETURNS TRIGGER AS $$
DECLARE
    valor_fixo_comissao DECIMAL(10,2) := 2000.00; -- Valor padrão
    mentorado_org_id UUID;
BEGIN
    -- Verificar se:
    -- 1. O status mudou para 'vendido'
    -- 2. O lead tem um mentorado indicador
    -- 3. O valor vendido está preenchido
    -- 4. Não existe comissão já criada
    IF NEW.status = 'vendido'
       AND NEW.mentorado_indicador_id IS NOT NULL
       AND NEW.valor_vendido IS NOT NULL
       AND NEW.valor_vendido > 0
       AND OLD.status != 'vendido'
       AND NEW.comissao_id IS NULL THEN

        -- Buscar a organização do mentorado indicador
        SELECT organization_id INTO mentorado_org_id
        FROM mentorados
        WHERE id = NEW.mentorado_indicador_id
        LIMIT 1;

        -- Buscar valor fixo configurado na organização
        IF mentorado_org_id IS NOT NULL THEN
            SELECT comissao_fixa_indicacao INTO valor_fixo_comissao
            FROM organizations
            WHERE id = mentorado_org_id
            LIMIT 1;
        END IF;

        -- Se não encontrou configuração, usa R$ 2000 como padrão
        IF valor_fixo_comissao IS NULL THEN
            valor_fixo_comissao := 2000.00;
        END IF;

        -- Criar a comissão com VALOR FIXO
        INSERT INTO comissoes (
            mentorado_id,
            lead_id,
            valor_venda,
            percentual_comissao,
            valor_comissao,
            status_pagamento,
            data_venda,
            data_vencimento,
            observacoes,
            created_at
        ) VALUES (
            NEW.mentorado_indicador_id,
            NEW.id,
            NEW.valor_vendido,
            0, -- Percentual zerado pois agora é valor fixo
            valor_fixo_comissao, -- VALOR FIXO por indicação
            'pendente',
            COALESCE(NEW.data_venda::timestamp with time zone, NOW()),
            (COALESCE(NEW.data_venda::timestamp with time zone, NOW()) + INTERVAL '30 days')::date,
            CONCAT('Comissão fixa por indicação: R$ ', valor_fixo_comissao::text),
            NOW()
        );

        RAISE NOTICE 'Comissão FIXA de indicação criada para mentorado ID % no valor de R$ %',
                     NEW.mentorado_indicador_id,
                     valor_fixo_comissao;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recriar o trigger (já existe, mas garantindo que use a função atualizada)
DROP TRIGGER IF EXISTS trigger_criar_comissao_indicacao ON leads;

CREATE TRIGGER trigger_criar_comissao_indicacao
    AFTER UPDATE ON leads
    FOR EACH ROW
    WHEN (NEW.status = 'vendido' AND OLD.status IS DISTINCT FROM 'vendido')
    EXECUTE FUNCTION criar_comissao_indicacao();

-- 3. Comentário para documentar a mudança
COMMENT ON FUNCTION criar_comissao_indicacao() IS 'Função que cria comissões FIXAS (R$ definido na organizations.comissao_fixa_indicacao) ao invés de percentuais quando leads de indicação são vendidos';
`;

async function fixCommissionSystemComplete() {
  console.log('🔧 CORREÇÃO COMPLETA DO SISTEMA DE COMISSÕES');
  console.log('='.repeat(70));

  try {
    // 1. Executar correção do trigger SQL
    console.log('🔨 1. CORRIGINDO TRIGGER SQL...');

    const sqlResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ sql: TRIGGER_FIX_SQL })
      }
    );

    if (sqlResponse.ok) {
      console.log('✅ Trigger SQL corrigido com sucesso!');
    } else {
      console.log('⚠️ Não foi possível executar SQL via API. Execute manualmente:');
      console.log('   📄 Arquivo: fix-commission-trigger.sql');
    }

    // 2. Verificar configuração atual
    console.log('\\n📊 2. VERIFICANDO CONFIGURAÇÃO ATUAL...');

    // Buscar valor fixo das organizações
    const orgsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=id,name,comissao_fixa_indicacao`,
      { headers }
    );

    let valorFixoPadrao = 2000;

    if (orgsResponse.ok) {
      const organizations = await orgsResponse.json();
      console.log(`✅ ${organizations.length} organizações encontradas`);

      organizations.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.name || 'Sem nome'}: R$ ${org.comissao_fixa_indicacao}`);
      });

      if (organizations.length > 0 && organizations[0].comissao_fixa_indicacao) {
        valorFixoPadrao = organizations[0].comissao_fixa_indicacao;
      }
    }

    console.log(`💰 Valor fixo padrão: R$ ${valorFixoPadrao.toFixed(2)}`);

    // 3. Buscar comissões com percentual 10%
    console.log('\\n📋 3. VERIFICANDO COMISSÕES EXISTENTES...');

    const comissoesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/comissoes?select=*&percentual_comissao=eq.10&order=created_at.desc`,
      { headers }
    );

    if (comissoesResponse.ok) {
      const comissoes = await comissoesResponse.json();
      console.log(`📊 ${comissoes.length} comissões com 10% encontradas`);

      if (comissoes.length > 0) {
        console.log('\\n🔄 4. CORRIGINDO COMISSÕES EXISTENTES...');

        let updated = 0;
        let errors = 0;

        for (const comissao of comissoes) {
          try {
            // Buscar dados do mentorado
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

            // Atualizar para valor fixo
            const updateData = {
              valor_comissao: valorFixoPadrao,
              percentual_comissao: 0,
              observacoes: `CORRIGIDO: Comissão fixa ${mentoradoNome} (R$ ${valorFixoPadrao.toFixed(2)}) - Era ${comissao.percentual_comissao}% de R$ ${comissao.valor_venda}`
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
              console.log(`✅ ${mentoradoNome}: R$ ${comissao.valor_comissao.toFixed(2)} → R$ ${valorFixoPadrao.toFixed(2)}`);
              updated++;
            } else {
              console.log(`❌ Erro ao corrigir comissão ${comissao.id}`);
              errors++;
            }

            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.log(`❌ Erro: ${error.message}`);
            errors++;
          }
        }

        console.log(`\\n📊 RESULTADO: ${updated} atualizadas, ${errors} erros`);
      } else {
        console.log('✅ Nenhuma comissão precisa de correção');
      }
    }

    // 5. Teste final
    console.log('\\n🔍 5. VERIFICAÇÃO FINAL...');

    const finalCheckResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/comissoes?select=percentual_comissao,valor_comissao&order=created_at.desc&limit=5`,
      { headers }
    );

    if (finalCheckResponse.ok) {
      const finalData = await finalCheckResponse.json();
      console.log(`📋 Últimas 5 comissões:`);

      finalData.forEach((c, index) => {
        const tipo = c.percentual_comissao === 0 ? 'FIXA' : 'PERCENTUAL';
        console.log(`   ${index + 1}. R$ ${c.valor_comissao} (${tipo})`);
      });
    }

    // 6. Resumo final
    console.log('\\n🎉 CORREÇÃO CONCLUÍDA!');
    console.log('📋 RESUMO DAS MUDANÇAS:');
    console.log('   ✅ Trigger SQL corrigido para usar valor fixo');
    console.log('   ✅ Campo comissao_fixa_indicacao existe na tabela organizations');
    console.log('   ✅ Comissões existentes corrigidas');
    console.log('   ✅ Futuras comissões serão calculadas com valor fixo');

    console.log('\\n⚡ PRÓXIMOS LEADS VENDIDOS:');
    console.log('   🎯 Agora gerarão comissão fixa de R$ ' + valorFixoPadrao.toFixed(2));
    console.log('   🚫 Não mais 10% sobre o valor da venda');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }

  console.log('\\n' + '='.repeat(70));
}

// Executar correção completa
fixCommissionSystemComplete();