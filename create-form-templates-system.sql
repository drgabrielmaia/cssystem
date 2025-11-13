-- ========================================
-- SISTEMA DE FORMULÁRIOS PERSONALIZADOS
-- ========================================

-- Criar tabela para templates de formulários
CREATE TABLE IF NOT EXISTS form_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(100) UNIQUE NOT NULL,
  form_type VARCHAR(20) DEFAULT 'lead' CHECK (form_type IN ('lead', 'nps', 'survey', 'feedback', 'other')),
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug);
CREATE INDEX IF NOT EXISTS idx_form_templates_form_type ON form_templates(form_type);
CREATE INDEX IF NOT EXISTS idx_form_templates_created_at ON form_templates(created_at);

-- Comentários para documentação dos tipos de formulário
COMMENT ON COLUMN form_templates.form_type IS 'Tipo do formulário: lead (captura de leads), nps (Net Promoter Score), survey (pesquisas), feedback (opiniões), other (outros tipos)';

-- Criar tabela para respostas dos formulários personalizados
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES form_templates(id) ON DELETE CASCADE,
  template_slug VARCHAR(100) NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  source_url VARCHAR(500), -- URL de onde veio (ex: /bio, /instagram, /ads-1)
  submission_data JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para a tabela de submissions
CREATE INDEX IF NOT EXISTS idx_form_submissions_template_id ON form_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_template_slug ON form_submissions(template_slug);
CREATE INDEX IF NOT EXISTS idx_form_submissions_lead_id ON form_submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_source_url ON form_submissions(source_url);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_form_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_form_templates_updated_at ON form_templates;
CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_form_templates_updated_at();

-- Desabilitar RLS temporariamente para desenvolvimento
ALTER TABLE form_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;

-- Inserir template de exemplo - Formulário Mentoria
INSERT INTO form_templates (name, description, slug, form_type, fields) VALUES
(
  'Formulário de Mentoria Médica',
  'Formulário para captura de leads interessados em mentoria para médicos',
  'mentoria',
  'lead',
  '[
    {
      "id": "field_1",
      "type": "text",
      "label": "Nome Completo",
      "name": "nome_completo",
      "required": true,
      "placeholder": "Digite seu nome completo",
      "mapToLead": "nome_completo"
    },
    {
      "id": "field_2",
      "type": "email",
      "label": "Email",
      "name": "email",
      "required": true,
      "placeholder": "seu@email.com",
      "mapToLead": "email"
    },
    {
      "id": "field_3",
      "type": "phone",
      "label": "Telefone/WhatsApp",
      "name": "telefone",
      "required": true,
      "placeholder": "(11) 99999-9999",
      "mapToLead": "telefone"
    },
    {
      "id": "field_4",
      "type": "text",
      "label": "CRM",
      "name": "crm",
      "required": false,
      "placeholder": "Ex: CRM/SP 123456"
    },
    {
      "id": "field_5",
      "type": "select",
      "label": "Especialidade",
      "name": "especialidade",
      "required": true,
      "options": ["Clínico Geral", "Cardiologia", "Dermatologia", "Ginecologia", "Pediatria", "Ortopedia", "Psiquiatria", "Outra"]
    },
    {
      "id": "field_6",
      "type": "radio",
      "label": "Tempo de formado",
      "name": "tempo_formado",
      "required": true,
      "options": ["Menos de 2 anos", "2-5 anos", "5-10 anos", "Mais de 10 anos"]
    },
    {
      "id": "field_7",
      "type": "textarea",
      "label": "Qual sua maior dificuldade no consultório?",
      "name": "maior_dificuldade",
      "required": false,
      "placeholder": "Ex: captação de pacientes, organização financeira, vendas..."
    },
    {
      "id": "field_8",
      "type": "radio",
      "label": "Principal interesse na mentoria",
      "name": "principal_interesse",
      "required": true,
      "options": ["Aumentar faturamento", "Organizar processos", "Marketing digital", "Gestão financeira", "Desenvolvimento pessoal"]
    }
  ]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Comentários
COMMENT ON TABLE form_templates IS 'Templates de formulários personalizados criados pelo usuário';
COMMENT ON COLUMN form_templates.name IS 'Nome do formulário para identificação';
COMMENT ON COLUMN form_templates.slug IS 'URL amigável única para o formulário';
COMMENT ON COLUMN form_templates.fields IS 'Configuração dos campos do formulário em JSON';

COMMENT ON TABLE form_submissions IS 'Respostas enviadas pelos formulários personalizados';
COMMENT ON COLUMN form_submissions.source_url IS 'URL de origem para rastreamento (instagram, bio, ads-1, etc)';
COMMENT ON COLUMN form_submissions.submission_data IS 'Dados enviados pelo formulário em JSON';
COMMENT ON COLUMN form_submissions.lead_id IS 'Lead criado automaticamente a partir desta submissão';

-- View para estatísticas de formulários
CREATE OR REPLACE VIEW form_templates_stats AS
SELECT
  ft.id,
  ft.name,
  ft.slug,
  ft.description,
  ft.created_at,
  COUNT(fs.id) as total_submissions,
  COUNT(DISTINCT fs.lead_id) as unique_leads,
  COUNT(fs.id) FILTER (WHERE fs.created_at > NOW() - INTERVAL '7 days') as submissions_last_7_days,
  COUNT(fs.id) FILTER (WHERE fs.created_at > NOW() - INTERVAL '30 days') as submissions_last_30_days,
  MAX(fs.created_at) as last_submission,
  fs.source_url as top_source
FROM form_templates ft
LEFT JOIN form_submissions fs ON ft.id = fs.template_id
GROUP BY ft.id, ft.name, ft.slug, ft.description, ft.created_at, fs.source_url
ORDER BY ft.created_at DESC;

COMMENT ON VIEW form_templates_stats IS 'Estatísticas dos templates de formulários com contagens de submissões';

SELECT 'Sistema de formulários personalizados criado com sucesso!' as status;