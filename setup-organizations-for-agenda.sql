-- ===============================================
-- CONFIGURAÇÃO DAS ORGANIZAÇÕES PARA ENVIO DE AGENDA
-- ===============================================
-- Execute este SQL no Supabase SQL Editor

-- 1. CORRIGIR TELEFONES DAS ORGANIZAÇÕES EXISTENTES
-- ===============================================

-- Corrigir telefone da Admin Organization (remover dígito extra)
UPDATE organizations
SET
  admin_phone = '+5583996910414',
  updated_at = NOW()
WHERE owner_email = 'admin@admin.com'
  AND admin_phone = '+558396910414';

-- Adicionar telefone para Organização Temp2 (exemplo)
UPDATE organizations
SET
  admin_phone = '+5583999999999',
  updated_at = NOW()
WHERE owner_email = 'temp2@admin.com'
  AND admin_phone IS NULL;

-- 2. CRIAR TABELA DE CONFIGURAÇÕES DAS ORGANIZAÇÕES
-- ===============================================

CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Configurações de notificação
  enable_daily_agenda BOOLEAN DEFAULT true,
  notification_time TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Configurações de agenda
  agenda_template TEXT DEFAULT 'Sua agenda para hoje:',
  include_weekend BOOLEAN DEFAULT false,
  advance_days INTEGER DEFAULT 1 CHECK (advance_days >= 0 AND advance_days <= 7),

  -- Configurações de WhatsApp
  whatsapp_enabled BOOLEAN DEFAULT true,
  max_daily_messages INTEGER DEFAULT 10,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Garantir uma configuração por organização
  UNIQUE(organization_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_enabled ON organization_settings(enable_daily_agenda);

-- 3. INSERIR CONFIGURAÇÕES PADRÃO PARA ORGANIZAÇÕES EXISTENTES
-- ===============================================

-- Inserir configurações para todas as organizações existentes
INSERT INTO organization_settings (
  organization_id,
  enable_daily_agenda,
  notification_time,
  timezone,
  agenda_template,
  whatsapp_enabled
)
SELECT
  id as organization_id,
  true as enable_daily_agenda,
  '09:00:00'::TIME as notification_time,
  'America/Sao_Paulo' as timezone,
  'Bom dia! 🌅 Aqui está sua agenda para hoje:' as agenda_template,
  true as whatsapp_enabled
FROM organizations
WHERE id NOT IN (
  SELECT organization_id
  FROM organization_settings
  WHERE organization_id IS NOT NULL
);

-- 4. CRIAR FUNÇÃO PARA NORMALIZAR TELEFONE
-- ===============================================

CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  clean_phone TEXT;
  normalized TEXT;
BEGIN
  -- Se for nulo ou vazio, retorna nulo
  IF phone_input IS NULL OR trim(phone_input) = '' THEN
    RETURN NULL;
  END IF;

  -- Remove todos os caracteres não numéricos
  clean_phone := regexp_replace(phone_input, '[^0-9]', '', 'g');

  -- Se já tem 13 dígitos e começa com 55, está correto
  IF length(clean_phone) = 13 AND starts_with(clean_phone, '55') THEN
    RETURN '+' || clean_phone;
  END IF;

  -- Se tem 12 dígitos e não começa com 55, adiciona 55
  IF length(clean_phone) = 12 THEN
    RETURN '+55' || clean_phone;
  END IF;

  -- Se tem 11 dígitos (DDD + número), adiciona 55
  IF length(clean_phone) = 11 THEN
    RETURN '+55' || clean_phone;
  END IF;

  -- Se tem 10 dígitos (DDD + número sem 9), adiciona 55 e 9
  IF length(clean_phone) = 10 THEN
    RETURN '+55' || substring(clean_phone, 1, 2) || '9' || substring(clean_phone, 3);
  END IF;

  -- Formato não reconhecido
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO PARA BUSCAR ORGANIZAÇÕES VÁLIDAS PARA ENVIO
-- ===============================================

CREATE OR REPLACE FUNCTION get_organizations_for_agenda()
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  admin_phone TEXT,
  normalized_phone TEXT,
  owner_email TEXT,
  enable_notifications BOOLEAN,
  notification_time TIME,
  timezone TEXT,
  agenda_template TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as organization_id,
    o.name as organization_name,
    o.admin_phone,
    normalize_phone_number(o.admin_phone) as normalized_phone,
    o.owner_email,
    COALESCE(os.enable_daily_agenda, true) as enable_notifications,
    COALESCE(os.notification_time, '09:00:00'::TIME) as notification_time,
    COALESCE(os.timezone, 'America/Sao_Paulo') as timezone,
    COALESCE(os.agenda_template, 'Sua agenda para hoje:') as agenda_template
  FROM organizations o
  LEFT JOIN organization_settings os ON o.id = os.organization_id
  WHERE o.admin_phone IS NOT NULL
    AND trim(o.admin_phone) != ''
    AND normalize_phone_number(o.admin_phone) IS NOT NULL
    AND COALESCE(os.enable_daily_agenda, true) = true
    AND COALESCE(os.whatsapp_enabled, true) = true
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql;

-- 6. CRIAR TABELA DE LOG DE ENVIOS
-- ===============================================

CREATE TABLE IF NOT EXISTS agenda_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Detalhes do envio
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Status do envio
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  api_response JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadados
  agenda_date DATE NOT NULL,
  message_type TEXT DEFAULT 'daily_agenda',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para o log
CREATE INDEX IF NOT EXISTS idx_agenda_log_org_id ON agenda_notifications_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_agenda_log_status ON agenda_notifications_log(status);
CREATE INDEX IF NOT EXISTS idx_agenda_log_agenda_date ON agenda_notifications_log(agenda_date);
CREATE INDEX IF NOT EXISTS idx_agenda_log_scheduled_for ON agenda_notifications_log(scheduled_for);

-- 7. TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para organization_settings
DROP TRIGGER IF EXISTS update_organization_settings_updated_at ON organization_settings;
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para agenda_notifications_log
DROP TRIGGER IF EXISTS update_agenda_log_updated_at ON agenda_notifications_log;
CREATE TRIGGER update_agenda_log_updated_at
  BEFORE UPDATE ON agenda_notifications_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. FUNÇÃO PARA REGISTRAR ENVIO DE AGENDA
-- ===============================================

CREATE OR REPLACE FUNCTION log_agenda_notification(
  p_organization_id UUID,
  p_phone_number TEXT,
  p_message_content TEXT,
  p_agenda_date DATE,
  p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO agenda_notifications_log (
    organization_id,
    phone_number,
    message_content,
    scheduled_for,
    agenda_date,
    status
  ) VALUES (
    p_organization_id,
    p_phone_number,
    p_message_content,
    p_scheduled_for,
    p_agenda_date,
    'pending'
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNÇÃO PARA ATUALIZAR STATUS DO ENVIO
-- ===============================================

CREATE OR REPLACE FUNCTION update_notification_status(
  p_log_id UUID,
  p_status TEXT,
  p_api_response JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE agenda_notifications_log
  SET
    status = p_status,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    api_response = COALESCE(p_api_response, api_response),
    error_message = COALESCE(p_error_message, error_message),
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END,
    updated_at = NOW()
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql;

-- 10. HABILITAR RLS PARA AS NOVAS TABELAS
-- ===============================================

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_notifications_log ENABLE ROW LEVEL SECURITY;

-- Políticas para organization_settings
CREATE POLICY "Users can view settings of their organizations"
ON organization_settings FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners and managers can manage settings"
ON organization_settings FOR ALL
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'manager')
  )
);

-- Políticas para agenda_notifications_log
CREATE POLICY "Users can view logs of their organizations"
ON agenda_notifications_log FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can manage notification logs"
ON agenda_notifications_log FOR ALL
USING (true); -- Permitir inserção pelo sistema de notificações

-- 11. VERIFICAÇÃO FINAL
-- ===============================================

-- Verificar organizações válidas para envio
SELECT 'Organizações válidas para envio:' as status;
SELECT * FROM get_organizations_for_agenda();

-- Verificar configurações criadas
SELECT 'Configurações criadas:' as status;
SELECT
  os.organization_id,
  o.name,
  os.enable_daily_agenda,
  os.notification_time,
  os.whatsapp_enabled
FROM organization_settings os
JOIN organizations o ON os.organization_id = o.id;

-- Verificar telefones normalizados
SELECT 'Telefones normalizados:' as status;
SELECT
  name,
  admin_phone as original_phone,
  normalize_phone_number(admin_phone) as normalized_phone
FROM organizations
WHERE admin_phone IS NOT NULL;