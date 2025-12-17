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
  'NPS Mentoria Médicos de Resultado',
  'Pesquisa completa de satisfação da mentoria médica',
  'nps-mentoria',
  'nps',
  '[
    {
      "id": "field_1",
      "type": "email",
      "label": "Seu email (usado na mentoria) - opcional",
      "name": "email",
      "required": false,
      "placeholder": "seu@email.com"
    },
    {
      "id": "field_2",
      "type": "number",
      "label": "De 0 a 10, o quanto você recomendaria a Mentoria Médicos de Resultado para outro médico que quer sair do SUS/plantão e construir uma clínica ou negócio médico lucrativo?",
      "name": "nota_nps",
      "required": true,
      "placeholder": "Digite uma nota de 0 a 10"
    },
    {
      "id": "field_3",
      "type": "radio",
      "label": "Hoje, olhando para o que você já aplicou, como você avalia o valor da mentoria em relação ao investimento financeiro feito?",
      "name": "valor_percebido",
      "required": true,
      "options": ["Muito abaixo do esperado", "Abaixo do esperado", "Dentro do esperado", "Acima do esperado", "Muito acima do esperado"]
    },
    {
      "id": "field_4",
      "type": "radio",
      "label": "Qual foi a principal transformação que você teve até agora após entrar na mentoria?",
      "name": "principal_transformacao",
      "required": true,
      "options": ["Clareza de direção e estratégia", "Mudança de mentalidade como médico-empresário", "Organização e estrutura do negócio", "Aumento de faturamento", "Saída parcial ou total do SUS/plantão", "Ainda não tive uma transformação clara"]
    },
    {
      "id": "field_5",
      "type": "radio",
      "label": "O quanto você consegue aplicar, na prática, o que é ensinado na mentoria?",
      "name": "nivel_aplicacao",
      "required": true,
      "options": ["Aplico tudo de forma consistente", "Aplico boa parte", "Aplico pouco", "Tenho dificuldade de aplicar", "Ainda não comecei a aplicar"]
    },
    {
      "id": "field_6",
      "type": "radio",
      "label": "Como você avalia o suporte da mentoria (comunidade, time, acompanhamento, respostas)?",
      "name": "qualidade_suporte",
      "required": true,
      "options": ["Excelente", "Muito bom", "Bom", "Regular", "Ruim"]
    },
    {
      "id": "field_7",
      "type": "radio",
      "label": "O quanto a minha presença, direcionamento e visão estratégica influenciam suas decisões como médico e empreendedor hoje?",
      "name": "influencia_mentor",
      "required": true,
      "options": ["Influenciam totalmente", "Influenciam bastante", "Influenciam moderadamente", "Influenciam pouco", "Não influenciam"]
    },
    {
      "id": "field_8",
      "type": "radio",
      "label": "Você acredita que, mantendo a aplicação do método, seu resultado nos próximos 6–12 meses será significativamente maior do que hoje?",
      "name": "expectativa_futura",
      "required": true,
      "options": ["Sim, com muita clareza", "Sim", "Talvez", "Não tenho certeza", "Não"]
    },
    {
      "id": "field_9",
      "type": "textarea",
      "label": "O que hoje mais te impede de avançar mais rápido dentro da mentoria?",
      "name": "objecoes_ocultas",
      "required": false,
      "placeholder": "Falta de tempo, execução, ambiente familiar, priorização..."
    },
    {
      "id": "field_10",
      "type": "textarea",
      "label": "Se você tivesse que explicar para outro médico por que essa mentoria é diferente das outras, o que você diria?",
      "name": "prova_social",
      "required": false,
      "placeholder": "Sua resposta pode virar copy de lançamento..."
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