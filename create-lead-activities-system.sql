-- ========================================
-- SISTEMA DE HISTÓRICO DE ATIVIDADES DOS LEADS
-- ========================================

-- Criar tabela para histórico de atividades dos leads
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'form_submission', 'status_change', 'note', 'call', 'email', 'whatsapp', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  source_url VARCHAR(500), -- URL de origem se aplicável
  created_by VARCHAR(100), -- quem criou (sistema, usuario, etc)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at);

-- Desabilitar RLS temporariamente para desenvolvimento
ALTER TABLE lead_activities DISABLE ROW LEVEL SECURITY;

-- Comentários
COMMENT ON TABLE lead_activities IS 'Histórico de todas as atividades relacionadas aos leads';
COMMENT ON COLUMN lead_activities.activity_type IS 'Tipo da atividade (form_submission, status_change, note, etc.)';
COMMENT ON COLUMN lead_activities.title IS 'Título resumido da atividade';
COMMENT ON COLUMN lead_activities.description IS 'Descrição detalhada da atividade';
COMMENT ON COLUMN lead_activities.metadata IS 'Dados adicionais em JSON (campos do formulário, etc.)';
COMMENT ON COLUMN lead_activities.source_url IS 'URL de origem da atividade (ex: Instagram, bio, ads-1)';
COMMENT ON COLUMN lead_activities.created_by IS 'Quem criou a atividade (sistema, usuário, etc.)';

-- View para listar atividades com informações do lead
CREATE OR REPLACE VIEW lead_activities_view AS
SELECT
  la.id,
  la.lead_id,
  la.activity_type,
  la.title,
  la.description,
  la.metadata,
  la.source_url,
  la.created_by,
  la.created_at,
  l.nome_completo as lead_name,
  l.email as lead_email,
  l.telefone as lead_phone,
  l.status as lead_status
FROM lead_activities la
JOIN leads l ON la.lead_id = l.id
ORDER BY la.created_at DESC;

COMMENT ON VIEW lead_activities_view IS 'View completa das atividades com dados do lead';

-- Função para criar atividade de formulário
CREATE OR REPLACE FUNCTION create_form_activity(
  p_lead_id UUID,
  p_form_name VARCHAR(255),
  p_form_data JSONB,
  p_source_url VARCHAR(500) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
  form_description TEXT;
BEGIN
  -- Construir descrição a partir dos dados do formulário
  SELECT string_agg(
    CASE
      WHEN value IS NOT NULL AND value != ''
      THEN key || ': ' || value::text
      ELSE NULL
    END,
    E'\n'
  ) INTO form_description
  FROM jsonb_each_text(p_form_data)
  WHERE value IS NOT NULL AND value != '';

  -- Criar atividade
  INSERT INTO lead_activities (
    lead_id,
    activity_type,
    title,
    description,
    metadata,
    source_url,
    created_by
  )
  VALUES (
    p_lead_id,
    'form_submission',
    'Formulário preenchido: ' || p_form_name,
    form_description,
    p_form_data,
    p_source_url,
    'sistema'
  )
  RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_form_activity IS 'Função para criar atividade quando lead preenche formulário';

-- Inserir alguns exemplos de atividades (se há leads)
DO $$
DECLARE
    lead_uuid UUID;
    lead_count INT;
BEGIN
    SELECT COUNT(*) INTO lead_count FROM leads;

    IF lead_count > 0 THEN
        -- Pegar o primeiro lead
        SELECT id INTO lead_uuid FROM leads LIMIT 1;

        -- Inserir atividades de exemplo
        INSERT INTO lead_activities (lead_id, activity_type, title, description, metadata, created_by, created_at) VALUES
        (lead_uuid, 'form_submission', 'Formulário de Mentoria Médica preenchido', 'Nome: Dr. João Silva' || E'\n' || 'Especialidade: Cardiologia' || E'\n' || 'Tempo de formado: 5-10 anos', '{"formulario": "mentoria", "especialidade": "Cardiologia", "tempo_formado": "5-10 anos"}', 'sistema', NOW() - INTERVAL '2 hours'),
        (lead_uuid, 'note', 'Contato inicial realizado', 'Lead demonstrou interesse em mentoria para crescimento do consultório. Agendada reunião para próxima semana.', '{"tipo_contato": "telefone"}', 'sistema', NOW() - INTERVAL '1 hour'),
        (lead_uuid, 'status_change', 'Status alterado', 'Status alterado de "novo" para "contactado"', '{"status_anterior": "novo", "status_novo": "contactado"}', 'sistema', NOW() - INTERVAL '30 minutes');

        RAISE NOTICE 'Atividades de exemplo inseridas com sucesso!';
    ELSE
        RAISE NOTICE 'Nenhum lead encontrado para criar atividades de exemplo.';
    END IF;
END $$;

SELECT 'Sistema de histórico de atividades criado com sucesso!' as status;