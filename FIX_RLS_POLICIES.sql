-- ================================================================================
-- SCRIPT PARA CORRIGIR POLÍTICAS RLS COM RECURSÃO INFINITA
-- Data: 2025-01-08
-- Problema: infinite recursion detected in policy for relation "organization_users"
-- ================================================================================

-- PASSO 1: DESABILITAR RLS TEMPORARIAMENTE PARA ANÁLISE
-- ================================================================================

-- Desabilitar RLS em todas as tabelas afetadas para corrigir o problema
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE mentorados DISABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE metas DISABLE ROW LEVEL SECURITY;

-- PASSO 2: REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS
-- ================================================================================

-- Remover políticas da tabela organizations
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Users can delete their own organizations" ON organizations;

-- Remover políticas da tabela organization_users
DROP POLICY IF EXISTS "Users can view organization members" ON organization_users;
DROP POLICY IF EXISTS "Users can manage organization members" ON organization_users;
DROP POLICY IF EXISTS "Users can join organizations" ON organization_users;
DROP POLICY IF EXISTS "Users can leave organizations" ON organization_users;

-- Remover políticas das outras tabelas afetadas
DROP POLICY IF EXISTS "Users can view their organization data" ON mentorados;
DROP POLICY IF EXISTS "Users can manage their organization data" ON mentorados;

DROP POLICY IF EXISTS "Users can view form responses" ON formularios_respostas;
DROP POLICY IF EXISTS "Users can manage form responses" ON formularios_respostas;

DROP POLICY IF EXISTS "Users can view form submissions" ON form_submissions;
DROP POLICY IF EXISTS "Users can manage form submissions" ON form_submissions;

DROP POLICY IF EXISTS "Users can view video modules" ON video_modules;
DROP POLICY IF EXISTS "Users can manage video modules" ON video_modules;

DROP POLICY IF EXISTS "Users can view video lessons" ON video_lessons;
DROP POLICY IF EXISTS "Users can manage video lessons" ON video_lessons;

DROP POLICY IF EXISTS "Users can view lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Users can manage lesson progress" ON lesson_progress;

DROP POLICY IF EXISTS "Users can view goals" ON metas;
DROP POLICY IF EXISTS "Users can manage goals" ON metas;

-- PASSO 3: CRIAR FUNÇÕES AUXILIARES PARA EVITAR RECURSÃO
-- ================================================================================

-- Função para verificar se um usuário pertence a uma organização (SEM RECURSÃO)
CREATE OR REPLACE FUNCTION user_belongs_to_organization(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_users
    WHERE organization_users.user_id = $1
    AND organization_users.organization_id = $2
    -- Não faz referência a outras políticas, apenas verifica diretamente
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter organizações do usuário atual
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT organization_id
  FROM organization_users
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 4: CRIAR NOVAS POLÍTICAS SEM RECURSÃO
-- ================================================================================

-- Políticas para organizations
CREATE POLICY "view_organizations"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_own_organizations"
  ON organizations FOR ALL
  USING (
    id IN (SELECT get_user_organizations())
  );

-- Políticas para organization_users (SEM REFERÊNCIA A SI MESMA)
CREATE POLICY "view_organization_users"
  ON organization_users FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_organization_users"
  ON organization_users FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
    OR user_id = auth.uid()
  );

-- Políticas para mentorados
CREATE POLICY "view_mentorados"
  ON mentorados FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_mentorados"
  ON mentorados FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- Políticas para formularios_respostas
CREATE POLICY "view_form_responses"
  ON formularios_respostas FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_form_responses"
  ON formularios_respostas FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- Políticas para form_submissions
CREATE POLICY "view_submissions"
  ON form_submissions FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_submissions"
  ON form_submissions FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- Políticas para video_modules
CREATE POLICY "view_modules"
  ON video_modules FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_modules"
  ON video_modules FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- Políticas para video_lessons
CREATE POLICY "view_lessons"
  ON video_lessons FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_lessons"
  ON video_lessons FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- Políticas para lesson_progress
CREATE POLICY "view_progress"
  ON lesson_progress FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_progress"
  ON lesson_progress FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- Políticas para metas
CREATE POLICY "view_metas"
  ON metas FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_metas"
  ON metas FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- PASSO 5: VERIFICAR E ADICIONAR COLUNA organization_id ONDE ESTÁ FALTANDO
-- ================================================================================

-- Verificar e adicionar organization_id em tabelas que não têm
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

ALTER TABLE nps_respostas
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

ALTER TABLE modulo_iv_vendas_respostas
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

ALTER TABLE modulo_iii_gestao_marketing_respostas
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_nps_respostas_organization_id ON nps_respostas(organization_id);
CREATE INDEX IF NOT EXISTS idx_modulo_iv_vendas_respostas_org_id ON modulo_iv_vendas_respostas(organization_id);
CREATE INDEX IF NOT EXISTS idx_modulo_iii_gestao_marketing_org_id ON modulo_iii_gestao_marketing_respostas(organization_id);

-- PASSO 6: REABILITAR RLS NAS TABELAS
-- ================================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorados ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS nas tabelas que receberam organization_id
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iv_vendas_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iii_gestao_marketing_respostas ENABLE ROW LEVEL SECURITY;

-- Criar políticas para as tabelas que receberam organization_id
CREATE POLICY "view_notifications"
  ON notifications FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
    OR organization_id IS NULL -- Para notificações globais
  );

CREATE POLICY "manage_notifications"
  ON notifications FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
    OR organization_id IS NULL
  );

CREATE POLICY "view_nps"
  ON nps_respostas FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_nps"
  ON nps_respostas FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "view_modulo_iv"
  ON modulo_iv_vendas_respostas FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_modulo_iv"
  ON modulo_iv_vendas_respostas FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "view_modulo_iii"
  ON modulo_iii_gestao_marketing_respostas FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "manage_modulo_iii"
  ON modulo_iii_gestao_marketing_respostas FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- ================================================================================
-- FIM DO SCRIPT DE CORREÇÃO
-- ================================================================================

-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- URL: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql
--
-- ORDEM DE EXECUÇÃO:
-- 1. Execute todo o script de uma vez
-- 2. Teste o acesso às tabelas após a execução
-- 3. Se houver erros, verifique o log e ajuste conforme necessário