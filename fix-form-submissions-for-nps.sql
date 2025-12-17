-- ===============================================
-- CORREÇÃO: Suporte a formulários NPS/Survey que respondem diretamente por mentorados
-- ===============================================

-- Adicionar campo mentorado_id direto na tabela form_submissions
ALTER TABLE form_submissions
ADD COLUMN IF NOT EXISTS mentorado_id UUID REFERENCES mentorados(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_form_submissions_mentorado_id ON form_submissions(mentorado_id);

-- Comentário para documentação
COMMENT ON COLUMN form_submissions.mentorado_id IS 'Mentorado que respondeu diretamente (para formulários NPS/Survey que não criam leads)';

-- Atualizar as submissões existentes que têm lead_id para tentar encontrar o mentorado correspondente
UPDATE form_submissions
SET mentorado_id = (
  SELECT m.id
  FROM mentorados m
  INNER JOIN leads l ON m.email = l.email
  WHERE l.id = form_submissions.lead_id
  LIMIT 1
)
WHERE lead_id IS NOT NULL
AND mentorado_id IS NULL;

-- Inserir template de exemplo - NPS Mentoria
INSERT INTO form_templates (name, description, slug, form_type, fields) VALUES
(
  'NPS Mentoria',
  'Formulário de Net Promoter Score para avaliar a mentoria',
  'nps-mentoria',
  'nps',
  '[
    {
      "id": "field_1",
      "type": "email",
      "label": "Seu email (usado na mentoria)",
      "name": "email",
      "required": true,
      "placeholder": "seu@email.com"
    },
    {
      "id": "field_2",
      "type": "number",
      "label": "De 0 a 10, o quanto você indicaria nossa mentoria para outros médicos?",
      "name": "nota_nps",
      "required": true,
      "placeholder": "Digite uma nota de 0 a 10"
    },
    {
      "id": "field_3",
      "type": "textarea",
      "label": "O que mais surpreendeu você positivamente na mentoria?",
      "name": "o_que_surpreendeu_positivamente",
      "required": false,
      "placeholder": "Conte-nos o que achou mais impressionante..."
    },
    {
      "id": "field_4",
      "type": "radio",
      "label": "Autoriza usar seu depoimento em nossos materiais?",
      "name": "autoriza_depoimento",
      "required": true,
      "options": ["Sim, autorizo", "Não autorizo"]
    },
    {
      "id": "field_5",
      "type": "textarea",
      "label": "Se quiser deixar um depoimento, escreva aqui:",
      "name": "depoimento",
      "required": false,
      "placeholder": "Seu depoimento é muito importante para nós..."
    },
    {
      "id": "field_6",
      "type": "textarea",
      "label": "O que faltou para você dar nota 9 ou 10?",
      "name": "o_que_faltou_para_9_10",
      "required": false,
      "placeholder": "Como podemos melhorar ainda mais..."
    },
    {
      "id": "field_7",
      "type": "radio",
      "label": "Podemos entrar em contato para uma conversa sobre sua experiência?",
      "name": "pode_contatar",
      "required": true,
      "options": ["Sim, podem contatar", "Prefiro não ser contatado"]
    }
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  form_type = EXCLUDED.form_type,
  fields = EXCLUDED.fields,
  updated_at = NOW();

SELECT 'Formulário NPS Mentoria criado/atualizado com sucesso!' as status;