-- ========================================
-- SISTEMA DE NOTIFICAÇÕES - CUSTOMER SUCCESS
-- ========================================

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Conteúdo da notificação
  type VARCHAR(20) NOT NULL CHECK (type IN ('success', 'warning', 'info', 'error')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Ação/origem da notificação
  source_type VARCHAR(50) NOT NULL, -- 'form_submission', 'calendar_event', 'inactive_mentee', 'manual'
  source_id UUID, -- ID do registro que originou a notificação

  -- Estado da notificação
  read BOOLEAN DEFAULT false,
  action_required BOOLEAN DEFAULT false,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE NULL
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_source_type ON notifications(source_type);
CREATE INDEX IF NOT EXISTS idx_notifications_source_id ON notifications(source_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Desabilitar RLS temporariamente para desenvolvimento
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ========================================
-- FUNÇÕES PARA GERAR NOTIFICAÇÕES AUTOMÁTICAS
-- ========================================

-- Função para criar notificação de formulário respondido
CREATE OR REPLACE FUNCTION create_form_submission_notification()
RETURNS TRIGGER AS $$
DECLARE
  template_name TEXT;
  source_url_display TEXT;
BEGIN
  -- Buscar nome do template
  SELECT name INTO template_name
  FROM form_templates
  WHERE id = NEW.template_id;

  -- Formatar URL de origem se disponível
  source_url_display := COALESCE(NEW.source_url, 'Origem desconhecida');

  -- Criar notificação
  INSERT INTO notifications (type, title, message, source_type, source_id, action_required)
  VALUES (
    'success',
    'Novo Formulário Respondido',
    format('Template "%s" foi preenchido. Origem: %s',
           COALESCE(template_name, 'Template desconhecido'),
           source_url_display),
    'form_submission',
    NEW.id,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para criar notificação de evento próximo
CREATE OR REPLACE FUNCTION create_upcoming_event_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notificar eventos que começam nas próximas 24 horas
  IF NEW.start_datetime BETWEEN NOW() AND NOW() + INTERVAL '24 hours' THEN
    INSERT INTO notifications (type, title, message, source_type, source_id, action_required)
    VALUES (
      'info',
      'Evento Agendado Próximo',
      format('"%s" está agendado para %s',
             NEW.title,
             to_char(NEW.start_datetime, 'DD/MM/YYYY às HH24:MI')),
      'calendar_event',
      NEW.id,
      true
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS PARA NOTIFICAÇÕES AUTOMÁTICAS
-- ========================================

-- Trigger para notificações de formulários
DROP TRIGGER IF EXISTS trigger_form_submission_notification ON form_submissions;
CREATE TRIGGER trigger_form_submission_notification
  AFTER INSERT ON form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION create_form_submission_notification();

-- Trigger para notificações de eventos
DROP TRIGGER IF EXISTS trigger_upcoming_event_notification ON calendar_events;
CREATE TRIGGER trigger_upcoming_event_notification
  AFTER INSERT ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION create_upcoming_event_notification();

-- ========================================
-- FUNÇÃO PARA DETECTAR MENTORADOS INATIVOS
-- ========================================

-- Função para criar notificações de mentorados inativos (executar manualmente ou via cron)
CREATE OR REPLACE FUNCTION create_inactive_mentees_notifications()
RETURNS INTEGER AS $$
DECLARE
  inactive_count INTEGER;
  mentee_record RECORD;
  notification_message TEXT;
BEGIN
  -- Primeiro, deletar notificações antigas de mentorados inativos
  DELETE FROM notifications
  WHERE source_type = 'inactive_mentee'
  AND created_at < NOW() - INTERVAL '7 days';

  -- Buscar mentorados sem formulários há mais de 14 dias
  SELECT COUNT(*) INTO inactive_count
  FROM mentorados m
  WHERE m.estado_atual = 'ativo'
  AND m.id NOT IN (
    SELECT DISTINCT fs.lead_id
    FROM form_submissions fs
    WHERE fs.lead_id IS NOT NULL
    AND fs.created_at > NOW() - INTERVAL '14 days'
  );

  -- Se há mentorados inativos, criar notificação
  IF inactive_count > 0 THEN
    notification_message := format('%s mentorados não respondem formulários há mais de 2 semanas', inactive_count);

    -- Verificar se já existe uma notificação similar recente
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE source_type = 'inactive_mentee'
      AND created_at > NOW() - INTERVAL '24 hours'
      AND read = false
    ) THEN
      INSERT INTO notifications (type, title, message, source_type, action_required)
      VALUES (
        'warning',
        'Mentorados Inativos',
        notification_message,
        'inactive_mentee',
        true
      );
    END IF;
  END IF;

  RETURN inactive_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMENTÁRIOS NA TABELA
-- ========================================

COMMENT ON TABLE notifications IS 'Tabela para armazenar notificações do sistema';
COMMENT ON COLUMN notifications.type IS 'Tipo da notificação: success, warning, info, error';
COMMENT ON COLUMN notifications.title IS 'Título da notificação';
COMMENT ON COLUMN notifications.message IS 'Texto da mensagem da notificação';
COMMENT ON COLUMN notifications.source_type IS 'Tipo de origem: form_submission, calendar_event, inactive_mentee, manual';
COMMENT ON COLUMN notifications.source_id IS 'ID do registro que gerou a notificação';
COMMENT ON COLUMN notifications.read IS 'Se a notificação foi lida pelo usuário';
COMMENT ON COLUMN notifications.action_required IS 'Se a notificação requer ação do usuário';
COMMENT ON COLUMN notifications.read_at IS 'Quando a notificação foi marcada como lida';

-- ========================================
-- INSERIR ALGUMAS NOTIFICAÇÕES DE EXEMPLO
-- ========================================

-- Executar a função de mentorados inativos uma vez para criar notificações iniciais
SELECT create_inactive_mentees_notifications();

-- Inserir notificação de exemplo
INSERT INTO notifications (type, title, message, source_type, action_required)
VALUES
  ('info', 'Sistema de Notificações Ativo', 'As notificações em tempo real foram configuradas com sucesso!', 'manual', false);

-- ========================================
-- CONSULTAS ÚTEIS
-- ========================================

-- Ver todas as notificações não lidas
-- SELECT * FROM notifications WHERE read = false ORDER BY created_at DESC;

-- Ver notificações por tipo
-- SELECT type, COUNT(*) as count FROM notifications GROUP BY type;

-- Marcar todas como lidas
-- UPDATE notifications SET read = true, read_at = NOW() WHERE read = false;

-- Limpar notificações antigas (mais de 30 dias)
-- DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';

-- ========================================
-- INSTRUÇÕES DE USO
-- ========================================

/*
Para executar este sistema:

1. Execute este arquivo SQL no Supabase SQL Editor

2. Configure um cron job (ou use pg_cron extension) para executar periodicamente:
   SELECT create_inactive_mentees_notifications();

3. As notificações de formulários e eventos são criadas automaticamente via triggers

4. No frontend, consulte a tabela notifications ordenada por created_at DESC
   para mostrar as notificações mais recentes primeiro
*/