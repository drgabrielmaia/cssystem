-- 🎯 MARCAR TODOS COMO REALIZADOS (ONBOARDING E CONSULTORIA)
-- Execute este SQL no Supabase

-- Marcar ONBOARDING como realizado para todos os mentorados ativos
INSERT INTO checkins (mentorado_id, tipo, status, titulo, descricao, data_agendada)
SELECT
    m.id,
    'onboarding',
    'realizado',
    'Onboarding Realizado',
    'Onboarding marcado como realizado em massa',
    NOW()
FROM mentorados m
WHERE m.estado_atual = 'ativo'
  AND NOT EXISTS (
    SELECT 1 FROM checkins c
    WHERE c.mentorado_id = m.id
    AND c.tipo = 'onboarding'
  );

-- Marcar CONSULTORIA DE IMAGEM como realizada para todos os mentorados ativos
INSERT INTO checkins (mentorado_id, tipo, status, titulo, descricao, data_agendada)
SELECT
    m.id,
    'consultoria_imagem',
    'realizado',
    'Consultoria de Imagem Realizada',
    'Consultoria de imagem marcada como realizada em massa',
    NOW()
FROM mentorados m
WHERE m.estado_atual = 'ativo'
  AND NOT EXISTS (
    SELECT 1 FROM checkins c
    WHERE c.mentorado_id = m.id
    AND c.tipo = 'consultoria_imagem'
  );

-- Verificar os dados inseridos
SELECT
    m.nome_completo,
    c.tipo,
    c.status,
    c.data_agendada
FROM checkins c
JOIN mentorados m ON c.mentorado_id = m.id
WHERE c.tipo IN ('onboarding', 'consultoria_imagem')
ORDER BY m.nome_completo, c.tipo;