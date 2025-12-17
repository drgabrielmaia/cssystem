-- Atualizações na tabela instagram_messages para suportar novos eventos

-- Adicionar campos para status de leitura
ALTER TABLE instagram_messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campo para reações
ALTER TABLE instagram_messages
ADD COLUMN IF NOT EXISTS reaction VARCHAR(50);

-- Adicionar campo para tipo de evento
ALTER TABLE instagram_messages
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'message';

-- Comentários nos novos campos
COMMENT ON COLUMN instagram_messages.is_read IS 'Se a mensagem foi lida pelo destinatário';
COMMENT ON COLUMN instagram_messages.read_at IS 'Quando a mensagem foi lida';
COMMENT ON COLUMN instagram_messages.reaction IS 'Reação adicionada à mensagem (like, love, etc)';
COMMENT ON COLUMN instagram_messages.event_type IS 'Tipo de evento: message, mention, reaction, etc';

-- Índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_instagram_messages_read ON instagram_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_event_type ON instagram_messages(event_type);

-- Atualizar trigger type para incluir story mentions
ALTER TABLE instagram_automations
ALTER COLUMN trigger_type TYPE VARCHAR(50);

-- Inserir exemplo de automação para menções em stories
-- INSERT INTO instagram_automations (name, trigger_type, keywords, response_message, is_active)
-- VALUES ('Auto-resposta para menções', 'story_mention', ARRAY[]::text[], 'Obrigado por me mencionar! 😊', true);

-- Criar tabela para insights de stories (opcional)
CREATE TABLE IF NOT EXISTS instagram_story_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id VARCHAR(255) NOT NULL,
    metric VARCHAR(100) NOT NULL,
    value INTEGER DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE instagram_story_insights IS 'Insights de performance de stories do Instagram';

-- Índice para story insights
CREATE INDEX IF NOT EXISTS idx_story_insights_story_id ON instagram_story_insights(story_id);
CREATE INDEX IF NOT EXISTS idx_story_insights_metric ON instagram_story_insights(metric);
CREATE INDEX IF NOT EXISTS idx_story_insights_recorded_at ON instagram_story_insights(recorded_at);