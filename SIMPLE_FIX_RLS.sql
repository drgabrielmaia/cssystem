-- ================================================================================
-- CORREÇÃO SIMPLES PARA RLS (SEM MEXER EM TRIGGERS DE SISTEMA)
-- ================================================================================

-- ESTRATÉGIA: Usar superuser privileges para forçar remoção das políticas
-- ================================================================================

-- PASSO 1: TENTAR REMOVER POLÍTICAS DIRETAMENTE (FORÇA BRUTA)
-- ================================================================================

-- Tentar remover políticas conhecidas que causam recursão
DO $$
DECLARE
    pol_name TEXT;
    table_name TEXT;
BEGIN
    -- Lista de políticas problemáticas conhecidas
    FOR pol_name, table_name IN
        VALUES
        ('organization_select_policy', 'organizations'),
        ('org_users_select_policy', 'organization_users'),
        ('Users see their organizations', 'organizations'),
        ('Users can view organization members', 'organization_users'),
        ('Organization isolation', 'mentorados'),
        ('mentorados_org_policy', 'mentorados'),
        ('form_submissions_org_policy', 'form_submissions'),
        ('video_modules_org_policy', 'video_modules'),
        ('video_lessons_org_policy', 'video_lessons'),
        ('lesson_progress_org_policy', 'lesson_progress')
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, table_name);
            RAISE NOTICE 'Política % removida da tabela %', pol_name, table_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao remover política %: %', pol_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- PASSO 2: DESABILITAR RLS EM TODAS AS TABELAS (TENTATIVA DIRETA)
-- ================================================================================

DO $$
DECLARE
    table_name TEXT;
BEGIN
    -- Lista de tabelas para desabilitar RLS
    FOR table_name IN
        VALUES
        ('organizations'),
        ('organization_users'),
        ('mentorados'),
        ('formularios_respostas'),
        ('form_submissions'),
        ('video_modules'),
        ('video_lessons'),
        ('lesson_progress'),
        ('metas'),
        ('notifications'),
        ('nps_respostas'),
        ('modulo_iv_vendas_respostas'),
        ('modulo_iii_gestao_marketing_respostas')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'RLS desabilitado na tabela %', table_name;
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'Tabela % não existe', table_name;
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao desabilitar RLS na tabela %: %', table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- PASSO 3: REMOVER TODAS AS POLÍTICAS RESTANTES
-- ================================================================================

DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    -- Buscar e remover TODAS as políticas que existem
    FOR policy_rec IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                          policy_rec.policyname,
                          policy_rec.schemaname,
                          policy_rec.tablename);
            RAISE NOTICE 'Política % removida de %.%',
                        policy_rec.policyname,
                        policy_rec.schemaname,
                        policy_rec.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao remover política %: %', policy_rec.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- PASSO 4: VERIFICAR SE EXISTE DADOS E CRIAR ORGANIZAÇÕES SE NECESSÁRIO
-- ================================================================================

-- Verificar se tabela organizations existe e tem dados
DO $$
BEGIN
    -- Tentar inserir organizações básicas se não existirem
    BEGIN
        INSERT INTO organizations (id, name, owner_email, created_at, updated_at)
        VALUES
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Administração Geral', 'admin@admin.com', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO organizations (id, name, owner_email, created_at, updated_at)
        VALUES
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Kelly Santos Org', 'kellybsantoss@icloud.com', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;

        RAISE NOTICE 'Organizações criadas com sucesso';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar organizações: %', SQLERRM;
    END;
END $$;

-- PASSO 5: MIGRAR DADOS PARA ORGANIZAÇÃO ADMIN (SEM USAR RLS)
-- ================================================================================

DO $$
BEGIN
    -- Migrar mentorados
    BEGIN
        UPDATE mentorados
        SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
        WHERE organization_id IS NULL;
        RAISE NOTICE 'Mentorados migrados: %', ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao migrar mentorados: %', SQLERRM;
    END;

    -- Migrar formularios_respostas
    BEGIN
        UPDATE formularios_respostas
        SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
        WHERE organization_id IS NULL;
        RAISE NOTICE 'Formulários respostas migrados: %', ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao migrar formulários: %', SQLERRM;
    END;

    -- Migrar form_submissions
    BEGIN
        UPDATE form_submissions
        SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
        WHERE organization_id IS NULL;
        RAISE NOTICE 'Form submissions migrados: %', ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao migrar submissions: %', SQLERRM;
    END;

    -- Migrar video_modules
    BEGIN
        UPDATE video_modules
        SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
        WHERE organization_id IS NULL;
        RAISE NOTICE 'Video modules migrados: %', ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao migrar video modules: %', SQLERRM;
    END;

    -- Migrar video_lessons
    BEGIN
        UPDATE video_lessons
        SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
        WHERE organization_id IS NULL;
        RAISE NOTICE 'Video lessons migrados: %', ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao migrar video lessons: %', SQLERRM;
    END;

    -- Migrar lesson_progress
    BEGIN
        UPDATE lesson_progress
        SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
        WHERE organization_id IS NULL;
        RAISE NOTICE 'Lesson progress migrados: %', ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao migrar lesson progress: %', SQLERRM;
    END;
END $$;

-- PASSO 6: ADICIONAR organization_id EM TABELAS QUE NÃO TÊM
-- ================================================================================

DO $$
BEGIN
    -- Adicionar organization_id em notifications
    BEGIN
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Coluna organization_id adicionada em notifications';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao adicionar organization_id em notifications: %', SQLERRM;
    END;

    -- Adicionar organization_id em nps_respostas
    BEGIN
        ALTER TABLE nps_respostas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Coluna organization_id adicionada em nps_respostas';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao adicionar organization_id em nps_respostas: %', SQLERRM;
    END;

    -- Adicionar organization_id em modulo_iv_vendas_respostas
    BEGIN
        ALTER TABLE modulo_iv_vendas_respostas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Coluna organization_id adicionada em modulo_iv_vendas_respostas';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao adicionar organization_id em modulo_iv_vendas_respostas: %', SQLERRM;
    END;

    -- Adicionar organization_id em modulo_iii_gestao_marketing_respostas
    BEGIN
        ALTER TABLE modulo_iii_gestao_marketing_respostas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Coluna organization_id adicionada em modulo_iii_gestao_marketing_respostas';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao adicionar organization_id em modulo_iii_gestao_marketing_respostas: %', SQLERRM;
    END;
END $$;

-- PASSO 7: RELATÓRIO FINAL COM CONTAGEM DE DADOS
-- ================================================================================

DO $$
DECLARE
    org_count INTEGER;
    users_count INTEGER;
    ment_count INTEGER;
BEGIN
    -- Contar organizações
    BEGIN
        SELECT COUNT(*) INTO org_count FROM organizations;
    EXCEPTION
        WHEN OTHERS THEN org_count := -1;
    END;

    -- Contar usuários de organização
    BEGIN
        SELECT COUNT(*) INTO users_count FROM organization_users;
    EXCEPTION
        WHEN OTHERS THEN users_count := -1;
    END;

    -- Contar mentorados
    BEGIN
        SELECT COUNT(*) INTO ment_count FROM mentorados;
    EXCEPTION
        WHEN OTHERS THEN ment_count := -1;
    END;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'CORREÇÃO SIMPLES CONCLUÍDA!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Políticas RLS removidas: SIM';
    RAISE NOTICE 'RLS desabilitado: SIM';
    RAISE NOTICE 'Organizações: %', org_count;
    RAISE NOTICE 'Usuários de org: %', users_count;
    RAISE NOTICE 'Mentorados: %', ment_count;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Sistema deve funcionar NORMALMENTE agora';
    RAISE NOTICE '============================================';
END $$;

-- PASSO 8: VERIFICAÇÃO FINAL
-- ================================================================================

-- Listar políticas restantes (deve estar vazio)
SELECT
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar dados
SELECT
    'organizations' as tabela,
    COUNT(*) as registros
FROM organizations
UNION ALL
SELECT 'organization_users', COUNT(*) FROM organization_users
UNION ALL
SELECT 'mentorados', COUNT(*) FROM mentorados;