-- ============================================
-- SCRIPT DE POPULAÇÃO INICIAL DO BANCO DE DADOS
-- ============================================
-- Data: 08/01/2026
-- Descrição: Cria usuários, organizações e configurações iniciais
-- ============================================

-- 1. CRIAR USUÁRIOS NO AUTH.USERS (caso não existam)
-- ============================================

-- Criar usuário admin@admin.com (apenas se não existir)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
)
SELECT
    '11111111-1111-1111-1111-111111111111',
    'admin@admin.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Administrador", "role": "admin"}',
    'authenticated',
    'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@admin.com');

-- Criar usuário kellybsantoss@icloud.com (apenas se não existir)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
)
SELECT
    '22222222-2222-2222-2222-222222222222',
    'kellybsantoss@icloud.com',
    crypt('kelly123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Kelly Santos", "role": "admin"}',
    'authenticated',
    'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'kellybsantoss@icloud.com');

-- 2. CRIAR PROFILES PARA OS USUÁRIOS
-- ============================================

INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@admin.com', 'Administrador', 'admin', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'kellybsantoss@icloud.com', 'Kelly Santos', 'admin', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 3. CRIAR REGISTROS NA TABELA USERS
-- ============================================

INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@admin.com', 'Administrador', 'admin', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'kellybsantoss@icloud.com', 'Kelly Santos', 'admin', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 4. VERIFICAR E CRIAR TABELA ORGANIZATIONS (se não existir)
-- ============================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);

-- 5. VERIFICAR E CRIAR TABELA ORGANIZATION_USERS (se não existir)
-- ============================================

CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    UNIQUE(organization_id, user_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON public.organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON public.organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_org_users_role ON public.organization_users(role);

-- 6. CRIAR ORGANIZAÇÕES PARA OS USUÁRIOS
-- ============================================

-- Organização para admin@admin.com (apenas se não existir)
INSERT INTO public.organizations (
    id,
    name,
    slug,
    description,
    created_by,
    created_at,
    updated_at
)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Administração Geral',
    'admin-geral',
    'Organização principal do sistema',
    '11111111-1111-1111-1111-111111111111',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Organização para kellybsantoss@icloud.com (apenas se não existir)
INSERT INTO public.organizations (
    id,
    name,
    slug,
    description,
    created_by,
    created_at,
    updated_at
)
SELECT
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Kelly Santos Org',
    'kelly-santos-org',
    'Organização da Kelly Santos',
    '22222222-2222-2222-2222-222222222222',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- 7. VINCULAR USUÁRIOS ÀS ORGANIZAÇÕES
-- ============================================

-- Admin na organização admin
INSERT INTO public.organization_users (
    organization_id,
    user_id,
    role,
    joined_at,
    is_active
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'owner',
    NOW(),
    true
) ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = 'owner', is_active = true;

-- Kelly na organização dela
INSERT INTO public.organization_users (
    organization_id,
    user_id,
    role,
    joined_at,
    is_active
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'owner',
    NOW(),
    true
) ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = 'owner', is_active = true;

-- Kelly também como membro na organização admin (opcional)
INSERT INTO public.organization_users (
    organization_id,
    user_id,
    role,
    joined_at,
    invited_by,
    is_active
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'admin',
    NOW(),
    '11111111-1111-1111-1111-111111111111',
    true
) ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = 'admin', is_active = true;

-- 8. REMOVER POLÍTICAS RLS PROBLEMÁTICAS (temporariamente)
-- ============================================

-- Desabilitar RLS temporariamente para evitar recursão
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users DISABLE ROW LEVEL SECURITY;

-- 9. CRIAR POLÍTICAS RLS SIMPLES E FUNCIONAIS
-- ============================================

-- Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- Política simples para organizations: usuários podem ver organizações das quais fazem parte
CREATE POLICY "Users can view their organizations" ON public.organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_users.organization_id = organizations.id
            AND organization_users.user_id = auth.uid()
            AND organization_users.is_active = true
        )
    );

-- Política para organization_users: usuários podem ver membros de suas organizações
CREATE POLICY "Users can view organization members" ON public.organization_users
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organization_users ou2
            WHERE ou2.organization_id = organization_users.organization_id
            AND ou2.user_id = auth.uid()
            AND ou2.is_active = true
        )
    );

-- Políticas de INSERT para owners/admins
CREATE POLICY "Owners can insert organization members" ON public.organization_users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_id = organization_users.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- Políticas de UPDATE para owners/admins
CREATE POLICY "Owners can update organization members" ON public.organization_users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.organization_id = organization_users.organization_id
            AND ou.user_id = auth.uid()
            AND ou.role IN ('owner', 'admin')
            AND ou.is_active = true
        )
    );

-- 10. CRIAR CONFIGURAÇÕES INICIAIS
-- ============================================

-- Criar categorias financeiras padrão
INSERT INTO public.finance_categories (id, name, type, created_at)
VALUES
    (gen_random_uuid(), 'Vendas', 'income', NOW()),
    (gen_random_uuid(), 'Serviços', 'income', NOW()),
    (gen_random_uuid(), 'Outros Recebimentos', 'income', NOW()),
    (gen_random_uuid(), 'Aluguel', 'expense', NOW()),
    (gen_random_uuid(), 'Folha de Pagamento', 'expense', NOW()),
    (gen_random_uuid(), 'Material de Escritório', 'expense', NOW()),
    (gen_random_uuid(), 'Marketing', 'expense', NOW()),
    (gen_random_uuid(), 'Outras Despesas', 'expense', NOW())
ON CONFLICT DO NOTHING;

-- Criar métodos de pagamento padrão
INSERT INTO public.finance_payment_methods (id, name, created_at)
VALUES
    (gen_random_uuid(), 'Dinheiro', NOW()),
    (gen_random_uuid(), 'Cartão de Crédito', NOW()),
    (gen_random_uuid(), 'Cartão de Débito', NOW()),
    (gen_random_uuid(), 'PIX', NOW()),
    (gen_random_uuid(), 'Boleto', NOW()),
    (gen_random_uuid(), 'Transferência Bancária', NOW())
ON CONFLICT DO NOTHING;

-- 11. VERIFICAÇÃO FINAL
-- ============================================

-- Contar registros criados
SELECT 'Usuários em auth.users' as tabela, COUNT(*) as total FROM auth.users
UNION ALL
SELECT 'Profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'Users', COUNT(*) FROM public.users
UNION ALL
SELECT 'Organizations', COUNT(*) FROM public.organizations
UNION ALL
SELECT 'Organization Users', COUNT(*) FROM public.organization_users
UNION ALL
SELECT 'Finance Categories', COUNT(*) FROM public.finance_categories
UNION ALL
SELECT 'Payment Methods', COUNT(*) FROM public.finance_payment_methods;

-- Mostrar usuários e suas organizações
SELECT
    u.email,
    u.full_name,
    o.name as organization_name,
    ou.role as organization_role
FROM public.users u
LEFT JOIN public.organization_users ou ON u.id = ou.user_id
LEFT JOIN public.organizations o ON ou.organization_id = o.id
ORDER BY u.email, o.name;

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE 'Script executado com sucesso!';
    RAISE NOTICE 'Usuários criados: admin@admin.com e kellybsantoss@icloud.com';
    RAISE NOTICE 'Senha padrão: admin123 e kelly123 (alterar no primeiro acesso)';
END $$;