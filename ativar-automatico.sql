-- ATIVAR EXECUÇÃO AUTOMÁTICA
-- Agendar cron job para rodar automaticamente

-- 1. Verificar se pg_cron está funcionando
SELECT * FROM cron.job;

-- 2. Remover job anterior (se existir)
SELECT cron.unschedule('event-notifications') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'event-notifications'
);

-- 3. Agendar job para executar a cada 2 minutos
SELECT cron.schedule(
    'event-notifications',           -- Nome do job
    '*/2 * * * *',                  -- A cada 2 minutos
    'SELECT send_event_notifications();'  -- Comando a executar
);

-- 4. Verificar se o job foi criado
SELECT
    jobid,
    schedule,
    command,
    nodename,
    active
FROM cron.job
WHERE jobname = 'event-notifications';

-- 5. Ver logs de execução (depois de alguns minutos)
SELECT
    runid,
    job_pid,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'event-notifications')
ORDER BY start_time DESC
LIMIT 10;