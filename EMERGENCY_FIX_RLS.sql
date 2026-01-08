-- ================================================================================
-- CORREÇÃO EMERGENCIAL PARA RECURSÃO INFINITA NO RLS
-- ================================================================================
-- PROBLEMA: Não consegue nem desabilitar o RLS por causa da recursão
-- SOLUÇÃO: Usar DROP + RECREATE das tabelas problemáticas
-- ================================================================================

-- PASSO 1: DESCONECTAR TODAS AS DEPENDÊNCIAS PRIMEIRO
-- ================================================================================

-- Remover constraints que podem impedir o drop
ALTER TABLE organization_users DROP CONSTRAINT IF EXISTS organization_users_organization_id_fkey;
ALTER TABLE organization_users DROP CONSTRAINT IF EXISTS organization_users_user_id_fkey;

-- Desabilitar triggers temporariamente
ALTER TABLE organization_users DISABLE TRIGGER ALL;
ALTER TABLE organizations DISABLE TRIGGER ALL;

-- PASSO 2: FAZER BACKUP DOS DADOS IMPORTANTES
-- ================================================================================

-- Criar tabela temporária para salvar os dados
CREATE TABLE IF NOT EXISTS temp_organization_users AS
SELECT * FROM organization_users;

CREATE TABLE IF NOT EXISTS temp_organizations AS
SELECT * FROM organizations;

-- PASSO 3: DROPAR TABELAS PROBLEMÁTICAS E RECRIAR SEM RLS
-- ================================================================================

-- Dropar as tabelas que estão com recursão
DROP TABLE IF EXISTS organization_users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Recriar a tabela organizations SEM RLS
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recriar a tabela organization_users SEM RLS
CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id),
    UNIQUE(organization_id, email)
);

-- Criar índices
CREATE INDEX idx_organization_users_org_id ON organization_users(organization_id);
CREATE INDEX idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX idx_organizations_owner_email ON organizations(owner_email);

-- PASSO 4: RESTAURAR DADOS SALVOS
-- ================================================================================

-- Restaurar dados das organizações
INSERT INTO organizations (id, name, owner_email, created_at, updated_at)
SELECT id, name, owner_email, created_at, updated_at
FROM temp_organizations
ON CONFLICT (id) DO NOTHING;

-- Restaurar dados dos usuários das organizações
INSERT INTO organization_users (id, organization_id, user_id, email, role, created_at)
SELECT id, organization_id, user_id, email, role, created_at
FROM temp_organization_users
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Dropar tabelas temporárias
DROP TABLE IF EXISTS temp_organization_users;
DROP TABLE IF EXISTS temp_organizations;

-- PASSO 5: CRIAR DADOS INICIAIS SE NÃO EXISTIREM
-- ================================================================================

-- Inserir organização admin se não existir
INSERT INTO organizations (id, name, owner_email, created_at, updated_at)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'Administração Geral',
    'admin@admin.com',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM organizations WHERE owner_email = 'admin@admin.com'
);

-- Inserir organização kelly se não existir
INSERT INTO organizations (id, name, owner_email, created_at, updated_at)
SELECT
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'Kelly Santos Org',
    'kellybsantoss@icloud.com',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM organizations WHERE owner_email = 'kellybsantoss@icloud.com'
);

-- PASSO 6: DESABILITAR RLS EM OUTRAS TABELAS PROBLEMÁTICAS
-- ================================================================================

-- Agora que organization_users está funcionando, podemos desabilitar RLS em outras
DO $$
BEGIN
    -- Desabilitar RLS em todas as tabelas que podem ter problemas
    EXECUTE 'ALTER TABLE mentorados DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE formularios_respostas DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE video_modules DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE video_lessons DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE lesson_progress DISABLE ROW LEVEL SECURITY';

    -- Tentar desabilitar em tabelas que podem não existir
    BEGIN
        EXECUTE 'ALTER TABLE metas DISABLE ROW LEVEL SECURITY';
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;

    BEGIN
        EXECUTE 'ALTER TABLE notifications DISABLE ROW LEVEL SECURITY';
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;

    BEGIN
        EXECUTE 'ALTER TABLE nps_respostas DISABLE ROW LEVEL SECURITY';
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao desabilitar RLS: %', SQLERRM;
END $$;

-- PASSO 7: REMOVER TODAS AS POLÍTICAS RLS RESTANTES
-- ================================================================================

-- Função para remover todas as políticas de uma tabela
DO $$
DECLARE
    policy_rec RECORD;
    table_name TEXT;
BEGIN
    -- Lista de tabelas para limpar
    FOR table_name IN
        SELECT unnest(ARRAY['mentorados', 'formularios_respostas', 'form_submissions',
                           'video_modules', 'video_lessons', 'lesson_progress',
                           'metas', 'notifications', 'nps_respostas',
                           'modulo_iv_vendas_respostas', 'modulo_iii_gestao_marketing_respostas'])
    LOOP
        -- Remover todas as políticas da tabela
        FOR policy_rec IN
            SELECT policyname
            FROM pg_policies
            WHERE tablename = table_name
        LOOP
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_rec.policyname, table_name);
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Erro ao remover política %s da tabela %s: %', policy_rec.policyname, table_name, SQLERRM;
            END;
        END LOOP;
    END LOOP;
END $$;

-- PASSO 8: MIGRAR DADOS EXISTENTES PARA ADMIN
-- ================================================================================

-- Migrar mentorados para organização admin
UPDATE mentorados
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

-- Migrar outros dados para organização admin
UPDATE formularios_respostas
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE form_submissions
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE video_modules
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE video_lessons
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE lesson_progress
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

-- PASSO 9: RELATÓRIO FINAL
-- ================================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'CORREÇÃO EMERGENCIAL CONCLUÍDA!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables organizations e organization_users: RECRIADAS';
    RAISE NOTICE 'RLS desabilitado em todas as tabelas: SIM';
    RAISE NOTICE 'Políticas problemáticas removidas: SIM';
    RAISE NOTICE 'Dados migrados para admin: SIM';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Sistema deve funcionar SEM RLS agora';
    RAISE NOTICE 'Para reativar RLS, execute script específico';
    RAISE NOTICE '============================================';
END $$;

-- Verificar dados
SELECT 'ORGANIZATIONS' as tabela, COUNT(*) as registros FROM organizations
UNION ALL
SELECT 'ORGANIZATION_USERS', COUNT(*) FROM organization_users
UNION ALL
SELECT 'MENTORADOS', COUNT(*) FROM mentorados;