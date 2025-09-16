-- Criar tabela para histórico do chat
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant')),
  response TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id VARCHAR(100) DEFAULT 'default',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_type ON chat_history(type);

-- Comentários
COMMENT ON TABLE chat_history IS 'Histórico de conversas do assistente de IA';
COMMENT ON COLUMN chat_history.message IS 'Mensagem do usuário ou resposta do assistente';
COMMENT ON COLUMN chat_history.type IS 'Tipo da mensagem: user ou assistant';
COMMENT ON COLUMN chat_history.response IS 'Resposta do assistente (apenas para mensagens do usuário)';
COMMENT ON COLUMN chat_history.session_id IS 'ID da sessão para agrupar conversas';
COMMENT ON COLUMN chat_history.metadata IS 'Metadados adicionais (modelo IA, timestamp formatado, etc)';

-- Inserir mensagem inicial do sistema
INSERT INTO chat_history (message, type, timestamp, session_id, metadata)
VALUES (
  'Olá! Sou seu assistente inteligente de Customer Success. Posso ajudar você a gerenciar mentorados, analisar formulários e muito mais!',
  'assistant',
  NOW(),
  'default',
  '{"gemma_model": "gemma3:1b", "is_welcome_message": true}'
)
ON CONFLICT DO NOTHING;