-- ========================================
-- SISTEMA DE ESTÁGIOS DE LEAD - CUSTOMER SUCCESS
-- ========================================

-- 1. Criar tabela de estágios de lead
CREATE TABLE IF NOT EXISTS lead_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Inserir os estágios padrão com cores
INSERT INTO lead_stages (name, color, description, sort_order) VALUES
  ('Novo Lead', 'blue', 'Lead recém-chegado no sistema', 1),
  ('Call Agendada', 'yellow', 'Call de qualificação agendada', 2),
  ('Convertida', 'green', 'Lead convertida em cliente', 3),
  ('Perdida', 'red', 'Lead perdida ou desqualificada', 4)
ON CONFLICT (name) DO NOTHING;

-- 3. Criar tabela de histórico de estágios
CREATE TABLE IF NOT EXISTS lead_stage_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id VARCHAR(100) NOT NULL, -- ID do contato do WhatsApp
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  stage_id UUID REFERENCES lead_stages(id),
  previous_stage_id UUID REFERENCES lead_stages(id),
  changed_by VARCHAR(255), -- Email do usuário que fez a mudança
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar view para status atual dos contatos
CREATE OR REPLACE VIEW contact_current_stages AS
WITH latest_stages AS (
  SELECT
    contact_id,
    contact_name,
    contact_phone,
    stage_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY contact_id ORDER BY created_at DESC) as rn
  FROM lead_stage_history
)
SELECT
  ls.contact_id,
  ls.contact_name,
  ls.contact_phone,
  ls.stage_id,
  st.name as stage_name,
  st.color as stage_color,
  st.description as stage_description,
  ls.created_at as last_updated
FROM latest_stages ls
JOIN lead_stages st ON ls.stage_id = st.id
WHERE ls.rn = 1;

-- 5. Criar tabela para mensagens do WhatsApp organizadas por conversas
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id VARCHAR(100) NOT NULL UNIQUE, -- ID do WhatsApp (phone@c.us)
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  last_message_id VARCHAR(255),
  last_message_body TEXT,
  last_message_timestamp BIGINT,
  last_message_from_me BOOLEAN,
  unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  stage_id UUID REFERENCES lead_stages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_contact_id ON lead_stage_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_created_at ON lead_stage_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_contact_id ON whatsapp_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_timestamp ON whatsapp_conversations(last_message_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_stage_id ON whatsapp_conversations(stage_id);

-- 7. Função para atualizar estágio de um contato
CREATE OR REPLACE FUNCTION update_contact_stage(
  p_contact_id VARCHAR(100),
  p_contact_name VARCHAR(255),
  p_contact_phone VARCHAR(50),
  p_stage_name VARCHAR(50),
  p_changed_by VARCHAR(255) DEFAULT NULL,
  p_change_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_stage_id UUID;
  v_previous_stage_id UUID;
BEGIN
  -- Buscar o ID do novo estágio
  SELECT id INTO v_stage_id
  FROM lead_stages
  WHERE name = p_stage_name AND is_active = true;

  IF v_stage_id IS NULL THEN
    RAISE EXCEPTION 'Estágio % não encontrado ou inativo', p_stage_name;
  END IF;

  -- Buscar estágio anterior (se existir)
  SELECT stage_id INTO v_previous_stage_id
  FROM contact_current_stages
  WHERE contact_id = p_contact_id;

  -- Inserir no histórico
  INSERT INTO lead_stage_history (
    contact_id,
    contact_name,
    contact_phone,
    stage_id,
    previous_stage_id,
    changed_by,
    change_reason
  ) VALUES (
    p_contact_id,
    p_contact_name,
    p_contact_phone,
    v_stage_id,
    v_previous_stage_id,
    p_changed_by,
    p_change_reason
  );

  -- Atualizar conversa (se existir)
  UPDATE whatsapp_conversations
  SET stage_id = v_stage_id, updated_at = NOW()
  WHERE contact_id = p_contact_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Função para inicializar conversa com estágio padrão
CREATE OR REPLACE FUNCTION initialize_conversation_with_default_stage(
  p_contact_id VARCHAR(100),
  p_contact_name VARCHAR(255),
  p_contact_phone VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  v_default_stage_id UUID;
BEGIN
  -- Buscar o estágio "Novo Lead"
  SELECT id INTO v_default_stage_id
  FROM lead_stages
  WHERE name = 'Novo Lead' AND is_active = true;

  -- Inserir conversa se não existir
  INSERT INTO whatsapp_conversations (contact_id, contact_name, contact_phone, stage_id)
  VALUES (p_contact_id, p_contact_name, p_contact_phone, v_default_stage_id)
  ON CONFLICT (contact_id) DO UPDATE SET
    contact_name = EXCLUDED.contact_name,
    contact_phone = EXCLUDED.contact_phone,
    updated_at = NOW();

  -- Inserir no histórico se for a primeira vez
  IF NOT EXISTS (SELECT 1 FROM lead_stage_history WHERE contact_id = p_contact_id) THEN
    INSERT INTO lead_stage_history (contact_id, contact_name, contact_phone, stage_id, change_reason)
    VALUES (p_contact_id, p_contact_name, p_contact_phone, v_default_stage_id, 'Primeira interação - estágio inicial');
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_conversations_updated_at
    BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Habilitar RLS
ALTER TABLE lead_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS (permitir tudo por enquanto)
CREATE POLICY "Permitir todas as operações lead_stages" ON lead_stages FOR ALL USING (true);
CREATE POLICY "Permitir todas as operações lead_stage_history" ON lead_stage_history FOR ALL USING (true);
CREATE POLICY "Permitir todas as operações whatsapp_conversations" ON whatsapp_conversations FOR ALL USING (true);

-- 12. Comentários
COMMENT ON TABLE lead_stages IS 'Estágios do funil de vendas com cores';
COMMENT ON TABLE lead_stage_history IS 'Histórico de mudanças de estágio dos contatos';
COMMENT ON TABLE whatsapp_conversations IS 'Conversas do WhatsApp organizadas por contato com estágio atual';
COMMENT ON FUNCTION update_contact_stage IS 'Atualiza o estágio de um contato e registra no histórico';
COMMENT ON FUNCTION initialize_conversation_with_default_stage IS 'Inicializa conversa com estágio padrão "Novo Lead"';

-- ========================================
-- EXEMPLOS DE USO:
-- ========================================

-- Atualizar estágio de um contato:
-- SELECT update_contact_stage(
--   '5511999888777@c.us',
--   'João Silva',
--   '+5511999888777',
--   'Call Agendada',
--   'admin@empresa.com',
--   'Agendada call para qualificação'
-- );

-- Buscar contatos por estágio:
-- SELECT * FROM contact_current_stages WHERE stage_name = 'Novo Lead';

-- Buscar conversas ordenadas por última mensagem:
-- SELECT
--   wc.*,
--   ls.name as stage_name,
--   ls.color as stage_color
-- FROM whatsapp_conversations wc
-- LEFT JOIN lead_stages ls ON wc.stage_id = ls.id
-- ORDER BY wc.last_message_timestamp DESC NULLS LAST;