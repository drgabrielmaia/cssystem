-- ============================================
-- SCRIPT CORRIGIDO - POPULAÇÃO INICIAL DO BANCO DE DADOS
-- ============================================
-- Data: 08/01/2026
-- Descrição: Cria usuários, organizações e configurações iniciais
-- VERSÃO CORRIGIDA - SEM PROBLEMAS DE CONSTRAINT
-- ============================================

-- 0. VERIFICAR ESTADO ATUAL
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Iniciando população do banco de dados...';
    RAISE NOTICE 'Usuários existentes: %', (SELECT COUNT(*) FROM auth.users);
    RAISE NOTICE 'Organizações existentes: %', (SELECT COUNT(*) FROM public.organizations WHERE TRUE);
END $$;

-- 1. GARANTIR QUE TABELAS EXISTEM
-- ============================================

-- Tabela organizations (versão simples)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela organization_users (versão simples)
CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id),
    UNIQUE(organization_id, email)
);

-- 2. INSERIR ORGANIZAÇÕES (SIMPLES)
-- ============================================

-- Organização 1: Admin
INSERT INTO public.organizations (id, name, owner_email, created_at, updated_at)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'Administração Geral',
    'admin@admin.com',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE owner_email = 'admin@admin.com'
);

-- Organização 2: Kelly
INSERT INTO public.organizations (id, name, owner_email, created_at, updated_at)
SELECT
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'Kelly Santos Mentoria',
    'kellybsantoss@icloud.com',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE owner_email = 'kellybsantoss@icloud.com'
);

-- 3. MIGRAR DADOS EXISTENTES PARA ADMIN
-- ============================================

-- Migrar mentorados para admin
UPDATE mentorados
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

-- Migrar video_modules para admin
UPDATE video_modules
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

-- Migrar video_lessons para admin
UPDATE video_lessons
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

-- Migrar lesson_progress para admin
UPDATE lesson_progress
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

-- Migrar form_submissions para admin
UPDATE form_submissions
SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

-- 4. CONFIGURAR RLS BÁSICO
-- ============================================

-- Desabilitar RLS temporariamente
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users DISABLE ROW LEVEL SECURITY;

-- Limpar políticas existentes
DROP POLICY IF EXISTS "Users see their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_users;
DROP POLICY IF EXISTS "Owners can insert organization members" ON public.organization_users;
DROP POLICY IF EXISTS "Owners can update organization members" ON public.organization_users;

-- Reabilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- Política simples para organizations
CREATE POLICY "organization_select_policy" ON public.organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_users.organization_id = organizations.id
            AND organization_users.user_id = auth.uid()
        )
    );

-- Política simples para organization_users
CREATE POLICY "org_users_select_policy" ON public.organization_users
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organization_users ou2
            WHERE ou2.organization_id = organization_users.organization_id
            AND ou2.user_id = auth.uid()
        )
    );

-- 5. APLICAR RLS EM TABELAS EXISTENTES
-- ============================================

-- Mentorados
ALTER TABLE mentorados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organization isolation" ON mentorados;
CREATE POLICY "mentorados_org_policy" ON mentorados
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- Video modules
ALTER TABLE video_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organization isolation" ON video_modules;
CREATE POLICY "video_modules_org_policy" ON video_modules
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- Video lessons
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organization isolation" ON video_lessons;
CREATE POLICY "video_lessons_org_policy" ON video_lessons
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- Lesson progress
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organization isolation" ON lesson_progress;
CREATE POLICY "lesson_progress_org_policy" ON lesson_progress
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- Form submissions
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organization isolation" ON form_submissions;
CREATE POLICY "form_submissions_org_policy" ON form_submissions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- 6. RELATÓRIO FINAL
-- ============================================
DO $$
DECLARE
    org_count INTEGER;
    mentorados_count INTEGER;
    video_modules_count INTEGER;
    video_lessons_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO org_count FROM public.organizations;
    SELECT COUNT(*) INTO mentorados_count FROM mentorados;
    SELECT COUNT(*) INTO video_modules_count FROM video_modules;
    SELECT COUNT(*) INTO video_lessons_count FROM video_lessons;

    RAISE NOTICE '========================';
    RAISE NOTICE 'SCRIPT EXECUTADO COM SUCESSO!';
    RAISE NOTICE '========================';
    RAISE NOTICE 'Organizações criadas: %', org_count;
    RAISE NOTICE 'Mentorados migrados: %', mentorados_count;
    RAISE NOTICE 'Video modules migrados: %', video_modules_count;
    RAISE NOTICE 'Video lessons migrados: %', video_lessons_count;
    RAISE NOTICE '========================';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Faça login com suas credenciais';
    RAISE NOTICE '2. Acesse /admin/organization para configurar';
    RAISE NOTICE '3. Acesse /admin/users para adicionar usuários';
    RAISE NOTICE '========================';
END $$;