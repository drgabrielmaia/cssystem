-- 🔍 DEBUG - VER O QUE ESTÁ ACONTECENDO

-- 1. Ver todos os mentorados e seus estados
SELECT
    nome_completo,
    estado_atual,
    created_at
FROM mentorados
ORDER BY nome_completo;

-- 2. Ver quantos mentorados ativos existem
SELECT
    estado_atual,
    COUNT(*) as total
FROM mentorados
GROUP BY estado_atual;

-- 3. Ver checkins existentes
SELECT
    m.nome_completo,
    c.tipo,
    c.status,
    c.created_at
FROM checkins c
JOIN mentorados m ON c.mentorado_id = m.id
ORDER BY m.nome_completo, c.tipo;

-- 4. Ver quantos checkins foram criados por tipo
SELECT
    tipo,
    status,
    COUNT(*) as total
FROM checkins
GROUP BY tipo, status
ORDER BY tipo, status;