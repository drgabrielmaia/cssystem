-- Trigger para criar comissões automaticamente quando um lead de indicação for vendido

-- 1. Função para criar comissão automática para leads de indicação vendidos
CREATE OR REPLACE FUNCTION criar_comissao_indicacao()
RETURNS TRIGGER AS $$
DECLARE
    percentual_configurado DECIMAL(5,2) := 10.00; -- Padrão de 10%
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

        -- Buscar percentual configurado para o tipo de produto (usando padrão de 10%)
        SELECT percentual_padrao INTO percentual_configurado
        FROM comissoes_configuracoes
        WHERE tipo_produto = 'Mentoria Individual'
          AND ativo = true
        LIMIT 1;

        -- Se não encontrou configuração, usa 10% como padrão
        IF percentual_configurado IS NULL THEN
            percentual_configurado := 10.00;
        END IF;

        -- Criar a comissão
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
            percentual_configurado,
            (NEW.valor_vendido * percentual_configurado / 100),
            'pendente',
            COALESCE(NEW.data_venda::timestamp with time zone, NOW()),
            (COALESCE(NEW.data_venda::timestamp with time zone, NOW()) + INTERVAL '30 days')::date,
            'Comissão gerada automaticamente por indicação',
            NOW()
        );

        RAISE NOTICE 'Comissão de indicação criada para mentorado ID % no valor de R$ %',
                     NEW.mentorado_indicador_id,
                     (NEW.valor_vendido * percentual_configurado / 100);

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger para executar após atualização de leads
DROP TRIGGER IF EXISTS trigger_criar_comissao_indicacao ON leads;

CREATE TRIGGER trigger_criar_comissao_indicacao
    AFTER UPDATE ON leads
    FOR EACH ROW
    WHEN (NEW.status = 'vendido' AND OLD.status IS DISTINCT FROM 'vendido')
    EXECUTE FUNCTION criar_comissao_indicacao();

-- 3. Trigger para atualizar valor_arrecadado no lead quando comissão for paga
CREATE OR REPLACE FUNCTION atualizar_lead_valor_arrecadado()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando status da comissão muda para 'pago', podemos assumir que o valor foi arrecadado
    IF NEW.status_pagamento = 'pago' AND OLD.status_pagamento != 'pago' THEN
        UPDATE leads
        SET valor_arrecadado = COALESCE(valor_arrecadado, 0) + NEW.valor_venda,
            updated_at = NOW()
        WHERE id = NEW.lead_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_lead_valor_arrecadado
    AFTER UPDATE ON comissoes
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_lead_valor_arrecadado();

-- 4. View para dashboard de comissões por mentorado
CREATE OR REPLACE VIEW view_dashboard_comissoes_mentorado AS
SELECT
    m.id as mentorado_id,
    m.nome as mentorado_nome,
    m.email as mentorado_email,
    COUNT(c.id) as total_indicacoes,
    COUNT(l.id) FILTER (WHERE l.status = 'vendido') as indicacoes_vendidas,
    SUM(c.valor_comissao) FILTER (WHERE c.status_pagamento = 'pendente') as comissoes_pendentes,
    SUM(c.valor_comissao) FILTER (WHERE c.status_pagamento = 'pago') as comissoes_pagas,
    SUM(c.valor_comissao) as total_comissoes,
    COUNT(c.id) FILTER (WHERE c.data_vencimento < CURRENT_DATE AND c.status_pagamento = 'pendente') as comissoes_vencidas,
    ROUND(AVG(c.valor_comissao), 2) as valor_medio_comissao
FROM mentorados m
LEFT JOIN leads l ON l.mentorado_indicador_id = m.id
LEFT JOIN comissoes c ON c.lead_id = l.id
GROUP BY m.id, m.nome, m.email
HAVING COUNT(l.id) > 0  -- Apenas mentorados que já indicaram
ORDER BY total_comissoes DESC;

SELECT 'Sistema de comissões de indicação configurado com sucesso!' as status;