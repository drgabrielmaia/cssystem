-- Criar formulário de teste simples
INSERT INTO form_templates (name, description, slug, form_type, fields, style)
VALUES (
  'Teste de Link',
  'Formulário para testar se os links funcionam',
  'teste-link',
  'lead',
  '[
    {
      "id": "field1",
      "type": "text",
      "label": "Nome",
      "name": "nome",
      "required": true,
      "placeholder": "Digite seu nome",
      "mapToLead": "nome_completo"
    },
    {
      "id": "field2",
      "type": "email",
      "label": "Email",
      "name": "email",
      "required": true,
      "placeholder": "Digite seu email",
      "mapToLead": "email"
    }
  ]'::jsonb,
  '{
    "primaryColor": "#3b82f6",
    "backgroundColor": "#f8fafc",
    "textColor": "#1e293b",
    "cardColor": "#ffffff",
    "borderRadius": "12",
    "fontFamily": "Inter"
  }'::jsonb
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  fields = EXCLUDED.fields,
  style = EXCLUDED.style;

-- Verificar se foi criado
SELECT id, name, slug FROM form_templates WHERE slug = 'teste-link';