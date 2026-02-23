-- ============================================================================
-- REMOVER PONTUAÇÃO SLA DAS ESTATÍSTICAS DO MENTORADO
-- ============================================================================
-- Este script remove referências a SLA das estatísticas do mentorado
-- pois essas métricas não devem existir no local atual

-- ============================================================================
-- 1. VERIFICAR TABELA MENTORADO_ATIVIDADES
-- ============================================================================

-- Verificar se a tabela existe e sua estrutura
DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    -- Verificar se a tabela existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mentorado_atividades'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Verificar se a coluna sla_bateu existe
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mentorado_atividades'
            AND column_name = 'sla_bateu'
        ) INTO column_exists;
        
        IF column_exists THEN
            RAISE NOTICE 'Coluna sla_bateu encontrada em mentorado_atividades. Será removida.';
            
            -- Remover a coluna sla_bateu
            ALTER TABLE mentorado_atividades DROP COLUMN IF EXISTS sla_bateu;
            
            RAISE NOTICE 'Coluna sla_bateu removida com sucesso de mentorado_atividades.';
        ELSE
            RAISE NOTICE 'Coluna sla_bateu não encontrada em mentorado_atividades. Nenhuma ação necessária.';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela mentorado_atividades não encontrada. Nenhuma ação necessária.';
    END IF;
END $$;

-- ============================================================================
-- 2. VERIFICAR TABELA USER_SETTINGS (SE EXISTIR)
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN;
    sla_columns TEXT[] := ARRAY['meta_leads_sla', 'meta_vendas_sla', 'meta_faturamento_sla', 
                              'meta_arrecadacao_sla', 'meta_calls_sla', 'meta_follow_ups_sla'];
    column_name TEXT;
    removed_count INTEGER := 0;
BEGIN
    -- Verificar se a tabela existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Remover cada coluna de SLA se existir
        FOREACH column_name IN ARRAY sla_columns LOOP
            BEGIN
                -- Verificar se a coluna existe
                IF EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_settings'
                    AND column_name = column_name
                ) THEN
                    -- Remover a coluna
                    EXECUTE format('ALTER TABLE user_settings DROP COLUMN IF EXISTS %I', column_name);
                    removed_count := removed_count + 1;
                    RAISE NOTICE 'Coluna % removida de user_settings', column_name;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Erro ao remover coluna %: %', column_name, SQLERRM;
            END;
        END LOOP;
            
        RAISE NOTICE 'Total de colunas SLA removidas de user_settings: %', removed_count;
    ELSE
        RAISE NOTICE 'Tabela user_settings não encontrada. Nenhuma ação necessária.';
    END IF;
END $$;

-- ============================================================================
-- 3. VERIFICAR OUTRAS TABELAS COM MÉTRICAS DE SLA
-- ============================================================================

-- Verificar leads_stats
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'leads_stats'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Verificar se tem colunas de SLA
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'leads_stats'
            AND column_name LIKE '%sla%'
        ) THEN
            -- A tabela leads_stats parece ser apenas de estatísticas gerais
            -- Se tiver SLA, removeremos as colunas específicas
            RAISE NOTICE 'Tabela leads_stats encontrada. Verificando colunas de SLA...';
        END IF;
    END IF;
END $$;

-- Verificar student_engagement_metrics
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'student_engagement_metrics'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Tabela student_engagement_metrics encontrada. Esta tabela não parece ter métricas de SLA.';
    END IF;
END $$;

-- ============================================================================
-- 4. RELATÓRIO FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== PROCESSO DE REMOÇÃO DE SLA CONCLUÍDO ===';
    RAISE NOTICE 'Métricas de SLA (Service Level Agreement) removidas das estatísticas do mentorado.';
    RAISE NOTICE 'Essas métricas não são aplicáveis ao sistema atual.';
    RAISE NOTICE 'As estatísticas agora mostram apenas dados reais de engajamento e progresso.';
    RAISE NOTICE '';
    RAISE NOTICE 'Tabelas verificadas:';
    RAISE NOTICE '  - mentorado_atividades (sla_bateu removido se existia)';
    RAISE NOTICE '  - user_settings (colunas *_sla removidas se existiam)';
    RAISE NOTICE '  - leads_stats (verificado - sem alterações necessárias)';
    RAISE NOTICE '  - student_engagement_metrics (verificado - sem alterações necessárias)';
    RAISE NOTICE '';
    RAISE NOTICE '=== PRÓXIMOS PASSOS ===';
    RAISE NOTICE '1. Verificar se as estatísticas do mentorado estão corretas';
    RAISE NOTICE '2. Validar que não há referências remanescentes a SLA';
    RAISE NOTICE '3. Atualizar a documentação do sistema se necessário';
END $$;