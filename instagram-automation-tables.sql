-- Tabelas para Automação do Instagram
-- Script de criação das tabelas necessárias para automação

-- Tabela para armazenar mensagens recebidas/enviadas
CREATE TABLE IF NOT EXISTS instagram_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    sender_username VARCHAR(255),
    recipient_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, video, etc
    content TEXT,
    media_url TEXT,
    is_incoming BOOLEAN DEFAULT true,
    is_processed BOOLEAN DEFAULT false,
    automation_triggered BOOLEAN DEFAULT false,
    automation_rule_id UUID REFERENCES instagram_automations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para tokens e configurações da API
CREATE TABLE IF NOT EXISTS instagram_api_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    instagram_business_id VARCHAR(255) NOT NULL,
    page_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    app_id VARCHAR(255) NOT NULL,
    app_secret TEXT NOT NULL,
    webhook_verify_token VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para histórico de automações executadas
CREATE TABLE IF NOT EXISTS instagram_automation_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    automation_rule_id UUID REFERENCES instagram_automations(id),
    message_id UUID REFERENCES instagram_messages(id),
    trigger_keyword VARCHAR(255),
    response_sent TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para conversas/threads
CREATE TABLE IF NOT EXISTS instagram_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id VARCHAR(255) UNIQUE NOT NULL,
    participant_id VARCHAR(255) NOT NULL,
    participant_username VARCHAR(255),
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_instagram_messages_conversation ON instagram_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_sender ON instagram_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_created_at ON instagram_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_incoming ON instagram_messages(is_incoming);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_processed ON instagram_messages(is_processed);
CREATE INDEX IF NOT EXISTS idx_instagram_automation_logs_rule ON instagram_automation_logs(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_participant ON instagram_conversations(participant_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_instagram_messages_updated_at BEFORE UPDATE ON instagram_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instagram_api_config_updated_at BEFORE UPDATE ON instagram_api_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instagram_conversations_updated_at BEFORE UPDATE ON instagram_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários das tabelas
COMMENT ON TABLE instagram_messages IS 'Armazena todas as mensagens recebidas e enviadas via Instagram';
COMMENT ON TABLE instagram_api_config IS 'Configurações e tokens da API do Instagram';
COMMENT ON TABLE instagram_automation_logs IS 'Log de execução das automações';
COMMENT ON TABLE instagram_conversations IS 'Conversas/threads do Instagram';

-- Configurações de API serão lidas do .env:
-- INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_ACCESS_TOKEN, etc.