-- Criar formulário de qualificação médica no form builder
-- Este script adiciona um template predefinido para qualificação de médicos

BEGIN;

-- Inserir template do formulário médico
INSERT INTO form_templates (
    id,
    name, 
    description, 
    slug, 
    form_type, 
    fields, 
    style,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Qualificação Médica - Doutores de Resultado',
    'Formulário de qualificação para médicos interessados na mentoria',
    'qualificacao-medica',
    'lead',
    '{
        "fields": [
            {
                "id": "field_nome",
                "name": "nome_completo",
                "type": "text",
                "label": "Qual é o seu nome completo?",
                "required": true,
                "placeholder": "Ex: Dr. João Silva",
                "mapToLead": "nome_completo"
            },
            {
                "id": "field_email", 
                "name": "email",
                "type": "email",
                "label": "Qual é o seu melhor email?",
                "required": true,
                "placeholder": "seu.email@gmail.com",
                "mapToLead": "email"
            },
            {
                "id": "field_telefone",
                "name": "telefone", 
                "type": "phone",
                "label": "Qual é o seu WhatsApp?",
                "required": true,
                "placeholder": "(11) 99999-9999",
                "mapToLead": "telefone"
            },
            {
                "id": "field_especialidade",
                "name": "especialidade",
                "type": "radio",
                "label": "Qual é a sua especialidade médica?",
                "required": true,
                "options": [
                    "Clínica Geral/Medicina da Família",
                    "Cardiologia", 
                    "Dermatologia",
                    "Endocrinologia",
                    "Ginecologia e Obstetrícia",
                    "Ortopedia",
                    "Pediatria",
                    "Psiquiatria",
                    "Radiologia",
                    "Cirurgia Geral",
                    "Anestesiologia", 
                    "Outra especialidade"
                ]
            },
            {
                "id": "field_renda_mensal",
                "name": "renda_mensal",
                "type": "radio",
                "label": "Qual é sua faixa de renda mensal atual?",
                "required": true,
                "options": [
                    "Até R$ 15.000",
                    "De R$ 15.001 a R$ 30.000", 
                    "De R$ 30.001 a R$ 50.000",
                    "De R$ 50.001 a R$ 80.000",
                    "De R$ 80.001 a R$ 120.000",
                    "Acima de R$ 120.000"
                ]
            },
            {
                "id": "field_situacao_trabalho",
                "name": "situacao_trabalho", 
                "type": "radio",
                "label": "Como você trabalha atualmente?",
                "required": true,
                "options": [
                    "Funcionário CLT em hospital/clínica",
                    "Concursado público",
                    "Tenho consultório próprio",
                    "Sócio de clínica/hospital",
                    "Trabalho em múltiplos locais",
                    "Exclusivamente telemedicina",
                    "Atualmente desempregado"
                ]
            },
            {
                "id": "field_experiencia_anos",
                "name": "experiencia_anos",
                "type": "radio", 
                "label": "Há quanto tempo você atua como médico?",
                "required": true,
                "options": [
                    "Menos de 2 anos",
                    "2 a 5 anos",
                    "6 a 10 anos", 
                    "11 a 15 anos",
                    "16 a 20 anos",
                    "Mais de 20 anos"
                ]
            },
            {
                "id": "field_capacidade_investimento",
                "name": "capacidade_investimento",
                "type": "radio",
                "label": "Qual seria sua capacidade de investimento em mentoria/educação nos próximos 12 meses?",
                "required": true,
                "options": [
                    "Até R$ 5.000",
                    "R$ 5.001 a R$ 15.000",
                    "R$ 15.001 a R$ 30.000", 
                    "R$ 30.001 a R$ 50.000",
                    "R$ 50.001 a R$ 80.000",
                    "Acima de R$ 80.000",
                    "Não tenho capacidade de investimento no momento"
                ]
            },
            {
                "id": "field_maior_desafio",
                "name": "maior_desafio",
                "type": "radio",
                "label": "Qual é o seu maior desafio profissional atualmente?",
                "required": true,
                "options": [
                    "Aumentar minha renda mensal",
                    "Conseguir mais pacientes/clientes",
                    "Melhorar gestão do meu tempo",
                    "Desenvolver habilidades de liderança",
                    "Expandir/abrir meu próprio consultório",
                    "Migrar para medicina estética/procedimentos",
                    "Desenvolver outras fontes de renda",
                    "Planejamento financeiro e investimentos"
                ]
            },
            {
                "id": "field_objetivo_12_meses",
                "name": "objetivo_12_meses",
                "type": "radio",
                "label": "Qual é o seu principal objetivo nos próximos 12 meses?",
                "required": true,
                "options": [
                    "Dobrar minha renda atual",
                    "Abrir meu próprio consultório",
                    "Sair do emprego CLT e ter autonomia",
                    "Diversificar minhas fontes de renda",
                    "Desenvolver um negócio paralelo",
                    "Melhorar minha qualidade de vida",
                    "Conquistar independência financeira",
                    "Ainda não tenho clareza sobre meus objetivos"
                ]
            },
            {
                "id": "field_ja_investiu_mentoria",
                "name": "ja_investiu_mentoria",
                "type": "radio",
                "label": "Você já investiu em mentoria, cursos ou coaching antes?",
                "required": true,
                "options": [
                    "Sim, várias vezes e tive bons resultados",
                    "Sim, algumas vezes com resultados mistos",
                    "Sim, mas não tive os resultados esperados",
                    "Não, esta seria minha primeira vez",
                    "Não, e ainda tenho receio de investir"
                ]
            },
            {
                "id": "field_urgencia_mudanca",
                "name": "urgencia_mudanca",
                "type": "radio",
                "label": "Qual é o seu nível de urgência para fazer mudanças na sua carreira?",
                "required": true,
                "options": [
                    "Extremamente urgente - preciso de resultados já",
                    "Muito urgente - prazo de 3-6 meses",
                    "Moderadamente urgente - prazo de 6-12 meses",
                    "Posso esperar mais de 1 ano",
                    "Não tenho pressa, é mais curiosidade"
                ]
            }
        ]
    }'::jsonb,
    '{
        "primaryColor": "#059669",
        "backgroundColor": "#ffffff",
        "textColor": "#1e293b",
        "cardColor": "#ffffff", 
        "borderRadius": "12",
        "fontFamily": "Inter"
    }'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    fields = EXCLUDED.fields,
    style = EXCLUDED.style,
    updated_at = NOW();

-- Verificar se o template foi criado
SELECT 
    name,
    slug,
    form_type,
    jsonb_array_length(fields->'fields') as total_fields,
    created_at
FROM form_templates 
WHERE slug = 'qualificacao-medica';

COMMIT;

-- Instruções de uso:
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. O formulário estará disponível em: [seu-dominio]/forms/qualificacao-medica
-- 3. Acesse o Form Builder para visualizar ou editar
-- 4. Todas as respostas criarão leads automaticamente na tabela leads
-- 5. Use source_url para rastrear origem: ?source=instagram, ?source=bio, etc.