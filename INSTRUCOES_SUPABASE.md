# 📋 INSTRUÇÕES PARA CONFIGURAR O BANCO DE DADOS SUPABASE

## 🔍 SITUAÇÃO ATUAL (08/01/2026)

### ✅ O que já existe:
- Todas as tabelas básicas existem mas estão **VAZIAS** (0 registros)
- Tabelas confirmadas: users, profiles, organizations, organization_users, finances, etc.
- **PROBLEMA**: Cache do schema desatualizado impedindo inserções via API

### ❌ O que está faltando:
- Nenhum usuário cadastrado no sistema
- Nenhuma organização criada
- Tabelas organizations e organization_users com possíveis problemas de estrutura/RLS

## 🚀 PASSOS PARA CORRIGIR

### 1️⃣ ACESSE O SUPABASE DASHBOARD

1. Acesse: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol
2. Faça login com suas credenciais
3. Vá para **SQL Editor** no menu lateral

### 2️⃣ EXECUTE O SQL DE CRIAÇÃO/CORREÇÃO

No SQL Editor, execute o seguinte comando para limpar o cache:

```sql
-- LIMPAR CACHE DO SCHEMA
NOTIFY pgrst, 'reload schema';
```

Aguarde 5 segundos e então execute o script completo abaixo:

```sql
-- ============================================
-- SCRIPT COMPLETO DE CONFIGURAÇÃO INICIAL
-- ============================================

-- 1. RECRIAR TABELAS COM ESTRUTURA CORRETA
-- ============================================

-- Dropar tabelas com problemas (se existirem)
DROP TABLE IF EXISTS public.organization_users CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Criar tabela organizations
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    is_active BOOLEAN DEFAULT true
);

-- Criar tabela organization_users
CREATE TABLE public.organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    UNIQUE(organization_id, user_id)
);

-- Criar índices
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX idx_org_users_org_id ON public.organization_users(organization_id);
CREATE INDEX idx_org_users_user_id ON public.organization_users(user_id);
CREATE INDEX idx_org_users_role ON public.organization_users(role);

-- 2. CRIAR USUÁRIOS INICIAIS
-- ============================================

-- Admin
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
) VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'admin@admin.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Administrador", "role": "admin"}'::jsonb,
    'authenticated',
    'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Kelly
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
) VALUES (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'kellybsantoss@icloud.com',
    crypt('kelly123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Kelly Santos", "role": "admin"}'::jsonb,
    'authenticated',
    'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- 3. CRIAR ORGANIZAÇÕES
-- ============================================

INSERT INTO public.organizations (
    id,
    name,
    slug,
    description,
    created_by
) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Administração Geral', 'admin-geral', 'Organização principal', '11111111-1111-1111-1111-111111111111'::uuid),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Kelly Santos Org', 'kelly-santos', 'Organização Kelly', '22222222-2222-2222-2222-222222222222'::uuid)
ON CONFLICT (id) DO NOTHING;

-- 4. VINCULAR USUÁRIOS ÀS ORGANIZAÇÕES
-- ============================================

INSERT INTO public.organization_users (
    organization_id,
    user_id,
    role
) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'owner'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'owner'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'admin')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 5. VERIFICAR RESULTADOS
-- ============================================

SELECT 'Usuários criados:' as info;
SELECT email, raw_user_meta_data->>'full_name' as name FROM auth.users;

SELECT 'Organizações criadas:' as info;
SELECT name, slug FROM public.organizations;

SELECT 'Vínculos criados:' as info;
SELECT o.name as org, u.email, ou.role
FROM public.organization_users ou
JOIN public.organizations o ON o.id = ou.organization_id
JOIN auth.users u ON u.id = ou.user_id;
```

### 3️⃣ VERIFIQUE NO AUTHENTICATION

1. Vá para **Authentication** > **Users** no menu lateral
2. Verifique se os usuários foram criados:
   - admin@admin.com
   - kellybsantoss@icloud.com

### 4️⃣ TESTE O ACESSO

Execute este comando no terminal do projeto:

```bash
node check_organizations_status.js
```

## 📝 INFORMAÇÕES IMPORTANTES

### Credenciais dos Usuários:
- **Admin**: admin@admin.com / senha: admin123
- **Kelly**: kellybsantoss@icloud.com / senha: kelly123

### Estrutura Criada:
1. **Organizações**:
   - Administração Geral (admin-geral)
   - Kelly Santos Org (kelly-santos)

2. **Vínculos**:
   - admin@admin.com é owner de "Administração Geral"
   - kellybsantoss@icloud.com é owner de "Kelly Santos Org"
   - kellybsantoss@icloud.com é admin em "Administração Geral"

## 🔧 TROUBLESHOOTING

### Se o erro de cache persistir:

1. No Supabase Dashboard, vá para **Settings** > **API**
2. Clique em **Reload Schema Cache**
3. Aguarde 30 segundos
4. Tente executar o script novamente

### Se as tabelas não forem criadas:

1. Verifique se você tem permissões de admin no projeto
2. Execute cada seção do SQL separadamente
3. Verifique erros específicos no output

### Se os usuários não conseguirem fazer login:

1. Vá para **Authentication** > **Policies**
2. Certifique-se de que não há políticas restritivas demais
3. Teste criar um usuário manualmente pelo Dashboard primeiro

## ✅ PRÓXIMOS PASSOS

Após executar com sucesso:

1. Teste o login com os usuários criados
2. Verifique se as organizações aparecem corretamente
3. Configure as políticas RLS conforme necessário
4. Adicione mais usuários e organizações conforme demanda

## 💡 DICA IMPORTANTE

Se preferir, você pode executar o arquivo SQL completo que foi criado:

1. Copie o conteúdo do arquivo: `/Users/gabrielmaia/Desktop/cs/frontend/populate_initial_data.sql`
2. Cole no SQL Editor do Supabase
3. Execute tudo de uma vez

---

**Data de criação**: 08/01/2026
**Projeto**: udzmlnnztzzwrphhizol
**URL**: https://udzmlnnztzzwrphhizol.supabase.co