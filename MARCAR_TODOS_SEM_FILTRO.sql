-- 🎯 MARCAR TODOS COMO REALIZADOS (SEM FILTRO DE ESTADO)
-- Execute este SQL no Supabase

-- Marcar ONBOARDING como realizado para TODOS os mentorados
INSERT INTO checkins (mentorado_id, tipo, status, titulo, descricao, data_agendada)
SELECT
    m.id,
    'onboarding',
    'realizado',
    'Onboarding Realizado',
    'Onboarding marcado como realizado em massa',
    NOW()
FROM mentorados m
WHERE NOT EXISTS (
    SELECT 1 FROM checkins c
    WHERE c.mentorado_id = m.id
    AND c.tipo = 'onboarding'
);

-- Marcar CONSULTORIA DE IMAGEM como realizada para TODOS os mentorados
INSERT INTO checkins (mentorado_id, tipo, status, titulo, descricao, data_agendada)
SELECT
    m.id,
    'consultoria_imagem',
    'realizado',
    'Consultoria de Imagem Realizada',
    'Consultoria de imagem marcada como realizada em massa',
    NOW()
FROM mentorados m
WHERE NOT EXISTS (
    SELECT 1 FROM checkins c
    WHERE c.mentorado_id = m.id
    AND c.tipo = 'consultoria_imagem'
);

-- Verificar quantos foram inseridos
SELECT 'Total de mentorados' as info, COUNT(*) as quantidade FROM mentorados
UNION ALL
SELECT 'Checkins onboarding', COUNT(*) FROM checkins WHERE tipo = 'onboarding'
UNION ALL
SELECT 'Checkins consultoria', COUNT(*) FROM checkins WHERE tipo = 'consultoria_imagem';