-- ======================================================
-- FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS
-- ======================================================
-- Este script cria funções avançadas para gerenciamento
-- de usuários no sistema multi-tenant
-- ======================================================

-- ======================================================
-- FUNÇÃO: Criar usuário completo (com auth.users)
-- ======================================================
-- Esta função cria o usuário tanto no auth.users quanto
-- no organization_users, usando a API administrativa

CREATE OR REPLACE FUNCTION create_complete_user(
    p_email text,
    p_password text,
    p_role text DEFAULT 'viewer',
    p_full_name text DEFAULT NULL,
    p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_org_id uuid;
    v_creator_role text;
    v_new_user_id uuid;
    v_result jsonb;
BEGIN
    -- Obter organização e role do criador
    SELECT ou.organization_id, ou.role
    INTO v_org_id, v_creator_role
    FROM public.organization_users ou
    WHERE ou.user_id = auth.uid()
    AND ou.is_active = true
    LIMIT 1;

    -- Validar permissões
    IF v_creator_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não pertence a nenhuma organização'
        );
    END IF;

    IF v_creator_role NOT IN ('owner', 'manager') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Apenas owners e managers podem criar usuários'
        );
    END IF;

    -- Validar role solicitado
    IF p_role NOT IN ('owner', 'manager', 'viewer') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Role inválido. Use: owner, manager ou viewer'
        );
    END IF;

    -- Managers não podem criar owners
    IF v_creator_role = 'manager' AND p_role = 'owner' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Managers não podem criar owners'
        );
    END IF;

    -- Verificar se email já existe na organização
    IF EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE organization_id = v_org_id
        AND lower(email) = lower(p_email)
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email já cadastrado nesta organização'
        );
    END IF;

    -- Criar usuário no auth.users
    -- NOTA: Esta parte requer privilégios especiais
    -- Em produção, isso deve ser feito via Edge Function ou API Backend
    BEGIN
        -- Tentar criar o usuário
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            lower(p_email),
            crypt(p_password, gen_salt('bf')),
            now(),
            jsonb_build_object(
                'full_name', p_full_name,
                'phone', p_phone,
                'organization_role', p_role
            ),
            now(),
            now()
        ) RETURNING id INTO v_new_user_id;

        -- Adicionar à organização
        INSERT INTO public.organization_users (
            organization_id,
            user_id,
            email,
            role
        ) VALUES (
            v_org_id,
            v_new_user_id,
            lower(p_email),
            p_role
        );

        v_result := jsonb_build_object(
            'success', true,
            'message', 'Usuário criado com sucesso',
            'user_id', v_new_user_id,
            'email', lower(p_email),
            'role', p_role
        );

    EXCEPTION WHEN OTHERS THEN
        -- Se falhar, tentar apenas adicionar à organização
        INSERT INTO public.organization_users (
            organization_id,
            user_id,
            email,
            role
        ) VALUES (
            v_org_id,
            NULL,
            lower(p_email),
            p_role
        ) ON CONFLICT (organization_id, email) DO NOTHING;

        v_result := jsonb_build_object(
            'success', true,
            'message', 'Usuário pré-cadastrado. Será criado no primeiro login',
            'email', lower(p_email),
            'role', p_role,
            'note', 'Use a função invite_user_to_organization para enviar convite'
        );
    END;

    RETURN v_result;
END;
$$;

-- ======================================================
-- FUNÇÃO: Convidar usuário para organização
-- ======================================================

CREATE OR REPLACE FUNCTION invite_user_to_organization(
    p_email text,
    p_role text DEFAULT 'viewer',
    p_send_email boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id uuid;
    v_org_name text;
    v_inviter_role text;
    v_inviter_email text;
    v_invite_token uuid;
    v_result jsonb;
BEGIN
    -- Obter dados do convidador
    SELECT
        ou.organization_id,
        ou.role,
        ou.email,
        o.name
    INTO
        v_org_id,
        v_inviter_role,
        v_inviter_email,
        v_org_name
    FROM public.organization_users ou
    JOIN public.organizations o ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
    AND ou.is_active = true
    LIMIT 1;

    -- Validar permissões
    IF v_inviter_role NOT IN ('owner', 'manager') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Sem permissão para convidar usuários'
        );
    END IF;

    -- Gerar token de convite
    v_invite_token := gen_random_uuid();

    -- Adicionar usuário com token de convite
    INSERT INTO public.organization_users (
        organization_id,
        email,
        role,
        user_id,
        is_active,
        created_at
    ) VALUES (
        v_org_id,
        lower(p_email),
        p_role,
        NULL,
        false, -- Inativo até aceitar convite
        now()
    ) ON CONFLICT (organization_id, email)
    DO UPDATE SET
        role = EXCLUDED.role,
        updated_at = now()
    RETURNING * INTO v_result;

    -- Registrar convite em tabela de convites (se existir)
    BEGIN
        INSERT INTO public.organization_invites (
            id,
            organization_id,
            email,
            role,
            invited_by,
            expires_at
        ) VALUES (
            v_invite_token,
            v_org_id,
            lower(p_email),
            p_role,
            auth.uid(),
            now() + interval '7 days'
        );
    EXCEPTION WHEN OTHERS THEN
        -- Tabela de convites pode não existir ainda
        NULL;
    END;

    -- Montar resposta
    v_result := jsonb_build_object(
        'success', true,
        'message', format('Convite enviado para %s', p_email),
        'invite_details', jsonb_build_object(
            'email', lower(p_email),
            'role', p_role,
            'organization', v_org_name,
            'invited_by', v_inviter_email,
            'invite_token', v_invite_token,
            'expires_at', (now() + interval '7 days')::text
        )
    );

    -- Se solicitado, enviar email (precisa de configuração adicional)
    IF p_send_email THEN
        v_result := v_result || jsonb_build_object(
            'email_status', 'Email seria enviado (não implementado)'
        );
    END IF;

    RETURN v_result;
END;
$$;

-- ======================================================
-- FUNÇÃO: Listar usuários da organização
-- ======================================================

CREATE OR REPLACE FUNCTION list_organization_users()
RETURNS TABLE (
    user_id uuid,
    email text,
    role text,
    full_name text,
    is_active boolean,
    created_at timestamptz,
    last_login timestamptz,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id uuid;
BEGIN
    -- Obter organização do usuário atual
    SELECT organization_id INTO v_org_id
    FROM public.organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não pertence a nenhuma organização';
    END IF;

    -- Retornar lista de usuários
    RETURN QUERY
    SELECT
        ou.user_id,
        ou.email,
        ou.role,
        COALESCE(
            au.raw_user_meta_data->>'full_name',
            split_part(ou.email, '@', 1)
        )::text as full_name,
        ou.is_active,
        ou.created_at,
        au.last_sign_in_at as last_login,
        CASE
            WHEN ou.user_id IS NULL THEN 'pending'
            WHEN ou.is_active = false THEN 'inactive'
            WHEN au.last_sign_in_at IS NULL THEN 'never_logged'
            WHEN au.last_sign_in_at > now() - interval '30 days' THEN 'active'
            ELSE 'idle'
        END::text as status
    FROM public.organization_users ou
    LEFT JOIN auth.users au ON au.id = ou.user_id
    WHERE ou.organization_id = v_org_id
    ORDER BY
        CASE ou.role
            WHEN 'owner' THEN 1
            WHEN 'manager' THEN 2
            ELSE 3
        END,
        ou.created_at DESC;
END;
$$;

-- ======================================================
-- FUNÇÃO: Atualizar role de usuário
-- ======================================================

CREATE OR REPLACE FUNCTION update_user_role(
    p_target_user_id uuid,
    p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id uuid;
    v_modifier_role text;
    v_target_current_role text;
    v_target_email text;
BEGIN
    -- Obter organização e role do modificador
    SELECT organization_id, role
    INTO v_org_id, v_modifier_role
    FROM public.organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1;

    -- Validar permissões
    IF v_modifier_role NOT IN ('owner', 'manager') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Sem permissão para alterar roles'
        );
    END IF;

    -- Obter role atual do usuário alvo
    SELECT role, email
    INTO v_target_current_role, v_target_email
    FROM public.organization_users
    WHERE user_id = p_target_user_id
    AND organization_id = v_org_id;

    IF v_target_current_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não encontrado nesta organização'
        );
    END IF;

    -- Managers não podem modificar owners
    IF v_modifier_role = 'manager' AND v_target_current_role = 'owner' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Managers não podem modificar owners'
        );
    END IF;

    -- Managers não podem promover para owner
    IF v_modifier_role = 'manager' AND p_new_role = 'owner' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Managers não podem promover usuários a owner'
        );
    END IF;

    -- Prevenir remoção do último owner
    IF v_target_current_role = 'owner' AND p_new_role != 'owner' THEN
        IF (SELECT COUNT(*) FROM public.organization_users
            WHERE organization_id = v_org_id
            AND role = 'owner'
            AND is_active = true) <= 1 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Não é possível remover o último owner da organização'
            );
        END IF;
    END IF;

    -- Atualizar role
    UPDATE public.organization_users
    SET
        role = p_new_role,
        updated_at = now()
    WHERE user_id = p_target_user_id
    AND organization_id = v_org_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Role atualizado com sucesso'),
        'user', jsonb_build_object(
            'email', v_target_email,
            'old_role', v_target_current_role,
            'new_role', p_new_role
        )
    );
END;
$$;

-- ======================================================
-- FUNÇÃO: Remover usuário da organização
-- ======================================================

CREATE OR REPLACE FUNCTION remove_user_from_organization(
    p_target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id uuid;
    v_remover_role text;
    v_target_role text;
    v_target_email text;
BEGIN
    -- Obter organização e role do removedor
    SELECT organization_id, role
    INTO v_org_id, v_remover_role
    FROM public.organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1;

    -- Apenas owners podem remover usuários
    IF v_remover_role != 'owner' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Apenas owners podem remover usuários'
        );
    END IF;

    -- Obter dados do usuário alvo
    SELECT role, email
    INTO v_target_role, v_target_email
    FROM public.organization_users
    WHERE user_id = p_target_user_id
    AND organization_id = v_org_id;

    IF v_target_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não encontrado nesta organização'
        );
    END IF;

    -- Prevenir auto-remoção do último owner
    IF p_target_user_id = auth.uid() AND v_target_role = 'owner' THEN
        IF (SELECT COUNT(*) FROM public.organization_users
            WHERE organization_id = v_org_id
            AND role = 'owner'
            AND is_active = true) <= 1 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Não é possível remover o último owner. Transfira a propriedade primeiro'
            );
        END IF;
    END IF;

    -- Remover usuário (soft delete)
    UPDATE public.organization_users
    SET
        is_active = false,
        updated_at = now()
    WHERE user_id = p_target_user_id
    AND organization_id = v_org_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Usuário %s removido da organização', v_target_email)
    );
END;
$$;

-- ======================================================
-- FUNÇÃO: Aceitar convite para organização
-- ======================================================

CREATE OR REPLACE FUNCTION accept_organization_invite(
    p_invite_token uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_email text;
    v_org_id uuid;
    v_role text;
BEGIN
    -- Obter email do usuário atual
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = auth.uid();

    -- Buscar convite pendente pelo email
    SELECT organization_id, role
    INTO v_org_id, v_role
    FROM public.organization_users
    WHERE lower(email) = lower(v_user_email)
    AND user_id IS NULL
    AND is_active = false
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Nenhum convite pendente encontrado para seu email'
        );
    END IF;

    -- Ativar usuário na organização
    UPDATE public.organization_users
    SET
        user_id = auth.uid(),
        is_active = true,
        updated_at = now()
    WHERE lower(email) = lower(v_user_email)
    AND organization_id = v_org_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Convite aceito com sucesso',
        'organization_id', v_org_id,
        'role', v_role
    );
END;
$$;

-- ======================================================
-- FUNÇÃO: Dashboard de usuários
-- ======================================================

CREATE OR REPLACE FUNCTION get_user_management_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id uuid;
    v_user_role text;
    v_result jsonb;
BEGIN
    -- Obter organização e role do usuário
    SELECT organization_id, role
    INTO v_org_id, v_user_role
    FROM public.organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não pertence a nenhuma organização'
        );
    END IF;

    -- Montar dashboard
    v_result := jsonb_build_object(
        'success', true,
        'organization_id', v_org_id,
        'my_role', v_user_role,
        'permissions', jsonb_build_object(
            'can_invite_users', v_user_role IN ('owner', 'manager'),
            'can_remove_users', v_user_role = 'owner',
            'can_change_roles', v_user_role IN ('owner', 'manager'),
            'can_create_owners', v_user_role = 'owner'
        ),
        'stats', jsonb_build_object(
            'total_users', (
                SELECT COUNT(*)
                FROM public.organization_users
                WHERE organization_id = v_org_id
                AND is_active = true
            ),
            'active_users', (
                SELECT COUNT(*)
                FROM public.organization_users ou
                JOIN auth.users au ON au.id = ou.user_id
                WHERE ou.organization_id = v_org_id
                AND ou.is_active = true
                AND au.last_sign_in_at > now() - interval '30 days'
            ),
            'pending_invites', (
                SELECT COUNT(*)
                FROM public.organization_users
                WHERE organization_id = v_org_id
                AND user_id IS NULL
            ),
            'users_by_role', (
                SELECT jsonb_object_agg(role, count)
                FROM (
                    SELECT role, COUNT(*) as count
                    FROM public.organization_users
                    WHERE organization_id = v_org_id
                    AND is_active = true
                    GROUP BY role
                ) r
            )
        )
    );

    RETURN v_result;
END;
$$;

-- ======================================================
-- TABELA: Convites de organização (opcional)
-- ======================================================

CREATE TABLE IF NOT EXISTS organization_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
    invited_by uuid REFERENCES auth.users(id),
    accepted_by uuid REFERENCES auth.users(id),
    accepted_at timestamptz,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Índices para organization_invites
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_expires ON organization_invites(expires_at);

-- RLS para organization_invites
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para organization_invites
CREATE POLICY "View invites - own org" ON organization_invites
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

CREATE POLICY "Create invites - managers and owners" ON organization_invites
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'manager')
            AND is_active = true
        )
    );

-- ======================================================
-- GRANTS - Permissões necessárias
-- ======================================================

-- Garantir que as funções possam ser executadas
GRANT EXECUTE ON FUNCTION create_complete_user TO authenticated;
GRANT EXECUTE ON FUNCTION invite_user_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION list_organization_users TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_organization TO authenticated;
GRANT EXECUTE ON FUNCTION accept_organization_invite TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_management_dashboard TO authenticated;

-- ======================================================
-- FIM DO SCRIPT DE GERENCIAMENTO DE USUÁRIOS
-- ======================================================