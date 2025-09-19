-- ========================================
-- SISTEMA DE CALENDÁRIO - CUSTOMER SUCCESS
-- ========================================

-- Criar tabela de eventos do calendário
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,

  -- Relacionamento com mentorado (opcional)
  mentorado_id UUID REFERENCES mentorados(id) ON DELETE SET NULL,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Validação: data de fim deve ser posterior à data de início
  CONSTRAINT check_end_after_start CHECK (end_datetime > start_datetime)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_datetime ON calendar_events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_datetime ON calendar_events(end_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_mentorado_id ON calendar_events(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_at ON calendar_events(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

-- Desabilitar RLS temporariamente para desenvolvimento
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- Inserir alguns eventos de exemplo
INSERT INTO calendar_events (title, description, start_datetime, end_datetime, all_day) VALUES
  ('Reunião de Planejamento', 'Planejamento semanal da equipe', '2025-01-20 10:00:00+00', '2025-01-20 11:30:00+00', false),
  ('Call de Onboarding', 'Sessão de onboarding com novo mentorado', '2025-01-21 14:00:00+00', '2025-01-21 15:00:00+00', false),
  ('Workshop Técnico', 'Workshop sobre estratégias de vendas', '2025-01-22 09:00:00+00', '2025-01-22 12:00:00+00', false),
  ('Dia de Treinamento', 'Evento de dia inteiro', '2025-01-23 00:00:00+00', '2025-01-23 23:59:59+00', true)
ON CONFLICT DO NOTHING;

-- Comentários na tabela
COMMENT ON TABLE calendar_events IS 'Tabela para armazenar eventos do calendário do sistema';
COMMENT ON COLUMN calendar_events.title IS 'Título/nome do evento';
COMMENT ON COLUMN calendar_events.description IS 'Descrição detalhada ou observações do evento';
COMMENT ON COLUMN calendar_events.start_datetime IS 'Data e hora de início do evento';
COMMENT ON COLUMN calendar_events.end_datetime IS 'Data e hora de término do evento';
COMMENT ON COLUMN calendar_events.all_day IS 'Indica se é um evento de dia inteiro';
COMMENT ON COLUMN calendar_events.mentorado_id IS 'ID do mentorado relacionado (opcional)';