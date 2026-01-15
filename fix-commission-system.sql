-- Corrigir sistema de comissões para usar valor fixo por organização

-- 1. Atualizar função para usar valor fixo da organização ao invés de percentual
CREATE OR REPLACE FUNCTION criar_comissao_indicacao()
RETURNS TRIGGER AS $$
DECLARE
    valor_comissao_fixo DECIMAL(10,2) := 2000.00; -- Valor padrão se não encontrar configuração
    org_id UUID;
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

        -- Buscar valor fixo configurado para a organização
        SELECT comissao_fixa_indicacao INTO valor_comissao_fixo
        FROM organizations
        WHERE id = NEW.organization_id
          AND comissao_fixa_indicacao IS NOT NULL;

        -- Se não encontrou configuração na organização, usar padrão de R$ 2000
        IF valor_comissao_fixo IS NULL THEN
            valor_comissao_fixo := 2000.00;
        END IF;

        -- Criar a comissão com valor fixo
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
            organization_id,
            created_at
        ) VALUES (
            NEW.mentorado_indicador_id,
            NEW.id,
            NEW.valor_vendido,
            0, -- Zero porque agora é valor fixo
            valor_comissao_fixo, -- Valor fixo da organização
            'pendente',
            COALESCE(NEW.data_venda::timestamp with time zone, NOW()),
            (COALESCE(NEW.data_venda::timestamp with time zone, NOW()) + INTERVAL '30 days')::date,
            'Comissão fixa gerada automaticamente por indicação',
            NEW.organization_id,
            NOW()
        );

        RAISE NOTICE 'Comissão fixa criada para mentorado ID % no valor de R$ %',
                     NEW.mentorado_indicador_id,
                     valor_comissao_fixo;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Atualizar comissões existentes para usar valor fixo
UPDATE comissoes
SET
    valor_comissao = 2000.00,
    percentual_comissao = 0,
    observacoes = 'Comissão fixa atualizada para R$ 2.000,00 por indicação',
    updated_at = NOW()
WHERE status_pagamento = 'pendente'
  AND percentual_comissao = 10;

-- 3. Verificar resultado
SELECT
    c.id,
    m.nome AS mentorado_nome,
    c.valor_venda,
    c.valor_comissao,
    c.percentual_comissao,
    c.status_pagamento,
    c.observacoes
FROM comissoes c
JOIN mentorados m ON c.mentorado_id = m.id
WHERE c.status_pagamento = 'pendente'
ORDER BY c.created_at DESC;

SELECT 'Sistema de comissões atualizado para valor fixo!' as status;