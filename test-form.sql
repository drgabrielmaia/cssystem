-- Inserir formulário de teste para debug
INSERT INTO form_templates (name, description, slug, form_type, fields)
VALUES (
  'Formulário de Teste - Debug',
  'Formulário simples para testar console.log',
  'teste-debug',
  'lead',
  '[
    {
      "id": "field1",
      "type": "text",
      "label": "Nome Completo",
      "name": "nome_completo",
      "required": true,
      "placeholder": "Digite seu nome completo",
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
    },
    {
      "id": "field3",
      "type": "phone",
      "label": "Telefone",
      "name": "telefone",
      "required": false,
      "placeholder": "Digite seu telefone",
      "mapToLead": "telefone"
    }
  ]'::jsonb
);

-- Verificar se foi criado
SELECT id, name, slug FROM form_templates WHERE slug = 'teste-debug';