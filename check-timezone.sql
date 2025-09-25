-- Verificar configuração de timezone do Supabase
SELECT
    name,
    setting,
    context
FROM pg_settings
WHERE name IN ('timezone', 'log_timezone');

-- Ver timezone atual
SELECT NOW() as utc_time, NOW() AT TIME ZONE 'America/Sao_Paulo' as brasilia_time;

-- Testar conversões de data
SELECT
    '2025-01-25T00:00:00'::timestamp as sem_timezone,
    '2025-01-25T00:00:00Z'::timestamptz as com_utc,
    '2025-01-25T00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo' as local_brasilia;