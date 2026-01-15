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

-- Resultado
SELECT 'Trigger de comissões CORRIGIDO para usar VALOR FIXO por indicação!' as status;