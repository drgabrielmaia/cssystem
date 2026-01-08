-- =================================================================
-- SISTEMA DE CRIAÇÃO DE ORGANIZAÇÕES
-- =================================================================

-- 1. FUNÇÃO PARA CRIAR ORGANIZAÇÃO AUTOMATICAMENTE PARA NOVOS USUÁRIOS
-- =================================================================
CREATE OR REPLACE FUNCTION create_user_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar organização para o novo usuário
  INSERT INTO organizations (name, owner_email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization',
    NEW.email
  );

  -- Adicionar o usuário como owner da organização
  INSERT INTO organization_users (organization_id, user_id, email, role)
  VALUES (
    (SELECT id FROM organizations WHERE owner_email = NEW.email),
    NEW.id,
    NEW.email,
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para execução automática
DROP TRIGGER IF EXISTS trigger_create_user_organization ON auth.users;
CREATE TRIGGER trigger_create_user_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_organization();

-- 2. FUNÇÃO PARA CRIAR ORGANIZAÇÃO MANUALMENTE
-- =================================================================
CREATE OR REPLACE FUNCTION create_organization(
  org_name TEXT,
  owner_email TEXT
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
  user_id UUID;
BEGIN
  -- Verificar se o usuário existe
  SELECT id INTO user_id FROM auth.users WHERE email = owner_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', owner_email;
  END IF;

  -- Verificar se usuário já tem organização
  IF EXISTS (SELECT 1 FROM organization_users WHERE user_id = user_id AND role = 'owner') THEN
    RAISE EXCEPTION 'Usuário % já possui uma organização', owner_email;
  END IF;

  -- Criar organização
  INSERT INTO organizations (name, owner_email)
  VALUES (org_name, owner_email)
  RETURNING id INTO new_org_id;

  -- Adicionar owner
  INSERT INTO organization_users (organization_id, user_id, email, role)
  VALUES (new_org_id, user_id, owner_email, 'owner');

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNÇÃO PARA ATUALIZAR ORGANIZAÇÃO
-- =================================================================
CREATE OR REPLACE FUNCTION update_organization(
  org_id UUID,
  new_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Verificar se o usuário atual pertence à organização como owner
  SELECT organization_id INTO user_org_id
  FROM organization_users
  WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = org_id;

  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem permissão para atualizar esta organização';
  END IF;

  -- Atualizar organização
  UPDATE organizations
  SET name = new_name, updated_at = NOW()
  WHERE id = org_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÃO PARA DELETAR ORGANIZAÇÃO
-- =================================================================
CREATE OR REPLACE FUNCTION delete_organization(
  org_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Verificar se o usuário atual é owner da organização
  SELECT organization_id INTO user_org_id
  FROM organization_users
  WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = org_id;

  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem permissão para deletar esta organização';
  END IF;

  -- Deletar organização (CASCADE vai deletar tudo relacionado)
  DELETE FROM organizations WHERE id = org_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNÇÃO PARA LISTAR ORGANIZAÇÕES DO USUÁRIO
-- =================================================================
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  user_role TEXT,
  is_owner BOOLEAN,
  member_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as organization_id,
    o.name as organization_name,
    ou.role as user_role,
    (ou.role = 'owner') as is_owner,
    (SELECT COUNT(*) FROM organization_users ou2 WHERE ou2.organization_id = o.id) as member_count,
    o.created_at
  FROM organizations o
  JOIN organization_users ou ON o.id = ou.organization_id
  WHERE ou.user_id = auth.uid()
  ORDER BY ou.role = 'owner' DESC, o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CRIAR ORGANIZAÇÃO PARA USUÁRIOS EXISTENTES (MIGRAÇÃO)
-- =================================================================
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Para cada usuário que não tem organização, criar uma
  FOR user_record IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN organization_users ou ON u.id = ou.user_id
    WHERE ou.user_id IS NULL
  LOOP
    -- Criar organização
    INSERT INTO organizations (name, owner_email)
    VALUES (
      COALESCE(user_record.raw_user_meta_data->>'full_name', split_part(user_record.email, '@', 1)) || '''s Organization',
      user_record.email
    );

    -- Adicionar como owner
    INSERT INTO organization_users (organization_id, user_id, email, role)
    VALUES (
      (SELECT id FROM organizations WHERE owner_email = user_record.email),
      user_record.id,
      user_record.email,
      'owner'
    );
  END LOOP;
END $$;

-- 7. POLÍTICAS RLS PARA ORGANIZAÇÕES
-- =================================================================

-- Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Política para ver organizações (apenas membros)
CREATE POLICY "Users see their organizations" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Política para atualizar organizações (apenas owners)
CREATE POLICY "Owners update their organizations" ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Política para deletar organizações (apenas owners)
CREATE POLICY "Owners delete their organizations" ON organizations
  FOR DELETE
  USING (
    id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 8. GRANTS DE PERMISSÃO
-- =================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_users TO authenticated;

-- =================================================================
-- SCRIPT CONCLUÍDO
-- =================================================================

-- Este script implementa:
-- ✅ Auto-criação de organização para novos usuários
-- ✅ Função para criar organização manualmente
-- ✅ Funções para atualizar e deletar organizações
-- ✅ Função para listar organizações do usuário
-- ✅ Migração para usuários existentes
-- ✅ Políticas RLS de segurança
-- ✅ Grants de permissão

-- Para testar:
-- SELECT * FROM get_user_organizations();
-- SELECT create_organization('Minha Nova Organização', 'usuario@example.com');