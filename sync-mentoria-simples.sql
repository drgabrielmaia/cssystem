-- ========================================
-- SINCRONIZAÇÃO SIMPLES - MENTORIAS NO FINANCEIRO
-- ========================================
-- Puxar receitas diretamente dos mentorados por organização

-- 1. Garantir que mentorados têm organization_id
UPDATE mentorados
SET organization_id = '9c8c0033-15ea-4e33-a55f-28d81a19693b'
WHERE organization_id IS NULL;

-- 2. Função para sincronizar mentorados como receitas no financeiro
CREATE OR REPLACE FUNCTION sync_mentorados_to_financeiro()
RETURNS TEXT AS $$
DECLARE
    mentorado_record RECORD;
    vendas_sincronizadas INTEGER := 0;
    transacao_existente UUID;
    valor_mentoria DECIMAL(10,2);
BEGIN
    -- Buscar mentorados ativos que ainda não foram sincronizados
    FOR mentorado_record IN
        SELECT
            id,
            nome_completo,
            organization_id,
            turma,
            estado_atual,
            data_entrada,
            created_at
        FROM mentorados
        WHERE estado_atual IN ('ativo', 'engajado', 'pausado')
          AND organization_id IS NOT NULL
    LOOP
        -- Verificar se já existe transação financeira para este mentorado
        SELECT id INTO transacao_existente
        FROM transacoes_financeiras
        WHERE referencia_id = mentorado_record.id::text
          AND referencia_tipo = 'mentorado_receita'
        LIMIT 1;

        -- Se não existe, criar a transação
        IF transacao_existente IS NULL THEN
            -- Definir valor baseado na turma
            valor_mentoria := CASE
                WHEN mentorado_record.turma LIKE '%VIP%' OR mentorado_record.turma LIKE '%Premium%' THEN 15000.00
                WHEN mentorado_record.turma LIKE '%Grupo%' THEN 8000.00
                ELSE 12000.00  -- Valor padrão mentoria individual
            END;

            INSERT INTO transacoes_financeiras (
                organization_id,
                tipo,
                valor,
                descricao,
                categoria,
                data_transacao,
                status,
                fornecedor,
                referencia_id,
                referencia_tipo,
                created_at
            ) VALUES (
                mentorado_record.organization_id,
                'entrada',
                valor_mentoria,
                CONCAT('Mentoria - ', COALESCE(mentorado_record.turma, 'Individual'), ' - ', mentorado_record.nome_completo),
                'Mentoria',
                COALESCE(mentorado_record.data_entrada::date, mentorado_record.created_at::date),
                'pago',
                mentorado_record.nome_completo,
                mentorado_record.id::text,
                'mentorado_receita',
                mentorado_record.created_at
            );

            vendas_sincronizadas := vendas_sincronizadas + 1;
        END IF;
    END LOOP;

    RETURN format('✅ %s mentorados sincronizados como receitas no financeiro', vendas_sincronizadas);
END;
$$ LANGUAGE plpgsql;

-- 3. Executar sincronização inicial
SELECT sync_mentorados_to_financeiro();

-- 4. Verificação do resultado
SELECT
    'SINCRONIZAÇÃO SIMPLES CONCLUÍDA' as status,
    (SELECT COUNT(*) FROM mentorados WHERE estado_atual IN ('ativo', 'engajado', 'pausado')) as mentorados_ativos,
    (SELECT COUNT(*) FROM transacoes_financeiras WHERE referencia_tipo = 'mentorado_receita') as receitas_sincronizadas,
    (SELECT SUM(valor) FROM transacoes_financeiras WHERE referencia_tipo = 'mentorado_receita') as valor_total_receitas;

-- ========================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase
-- 2. Use a função sync_mentorados_to_financeiro() sempre que precisar
-- 3. Não precisa de tabela extra - usa os dados que já existem!
-- ========================================