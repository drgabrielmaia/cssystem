-- Adicionar campo style na tabela form_templates
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS style JSONB;

-- Atualizar registros existentes com estilo padrão
UPDATE form_templates
SET style = '{
  "primaryColor": "#3b82f6",
  "backgroundColor": "#f8fafc",
  "textColor": "#1e293b",
  "cardColor": "#ffffff",
  "borderRadius": "12",
  "fontFamily": "Inter"
}'::jsonb
WHERE style IS NULL;

-- Verificar estrutura
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'form_templates' ORDER BY ordinal_position;