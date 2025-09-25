-- ========================================
-- SISTEMA DE NOTIFICAÇÕES COM PG_CRON
-- Customer Success - WhatsApp Notifications
-- ========================================

-- 1. HABILITAR EXTENSÕES NECESSÁRIAS
-- ====================================

-- Extensão para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Extensão para requisições HTTP
CREATE EXTENSION IF NOT EXISTS http;

-- Verificar se as extensões foram instaladas
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'http');

-- 2. FUNÇÃO PARA ENVIO DE NOTIFICAÇÕES
-- ===================================

CREATE OR REPLACE FUNCTION send_event_notifications()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_record RECORD;
    admin_phone TEXT := '558396910414'; -- Gabriel Maia
    notification_message TEXT;
    api_response http_response;
    notifications_sent INTEGER := 0;
    now_time TIMESTAMP WITH TIME ZONE;
    today_start TIMESTAMP WITH TIME ZONE;
    today_end TIMESTAMP WITH TIME ZONE;
    should_send_morning BOOLEAN := FALSE;
    should_send_30min BOOLEAN := FALSE;
    should_send_1h BOOLEAN := FALSE;
    result_json JSON;
BEGIN
    -- Inicializar variáveis de tempo
    now_time := NOW();
    today_start := DATE_TRUNC('day', now_time);
    today_end := today_start + INTERVAL '1 day' - INTERVAL '1 second';

    -- Log da execução
    RAISE NOTICE 'Executando verificação de notificações em %', now_time;

    -- Verificar se é horário da notificação matinal (9h-9h05)
    IF EXTRACT(hour FROM now_time) = 9 AND EXTRACT(minute FROM now_time) < 5 THEN
        should_send_morning := TRUE;
        RAISE NOTICE 'Enviando notificações matinais (9h)';
    END IF;

    -- Buscar eventos de hoje
    FOR event_record IN
        SELECT
            ce.id,
            ce.title,
            ce.description,
            ce.start_datetime,
            ce.end_datetime,
            ce.mentorado_id,
            m.nome_completo,
            m.telefone
        FROM calendar_events ce
        LEFT JOIN mentorados m ON ce.mentorado_id = m.id
        WHERE ce.start_datetime >= today_start
          AND ce.start_datetime <= today_end
        ORDER BY ce.start_datetime
    LOOP
        RAISE NOTICE 'Processando evento: % às %', event_record.title, event_record.start_datetime;

        -- Verificar se deve enviar notificação de 1 hora antes
        should_send_1h := FALSE;
        IF (event_record.start_datetime - now_time) BETWEEN INTERVAL '55 minutes' AND INTERVAL '65 minutes' THEN
            should_send_1h := TRUE;
            RAISE NOTICE 'Enviando notificação 1h antes para evento: %', event_record.title;
        END IF;

        -- Verificar se deve enviar notificação de 30 minutos antes
        should_send_30min := FALSE;
        IF (event_record.start_datetime - now_time) BETWEEN INTERVAL '25 minutes' AND INTERVAL '35 minutes' THEN
            should_send_30min := TRUE;
            RAISE NOTICE 'Enviando notificação 30min antes para evento: %', event_record.title;
        END IF;

        -- Se não é nem manhã nem 1h antes nem 30min antes, pular este evento
        IF NOT should_send_morning AND NOT should_send_1h AND NOT should_send_30min THEN
            CONTINUE;
        END IF;

        -- Preparar mensagens específicas por tipo de notificação
        IF should_send_morning THEN
            -- Mensagem matinal às 9h para mentorado
            IF event_record.mentorado_id IS NOT NULL THEN
                notification_message := 'Bom dia, ' || COALESCE(event_record.nome_completo, 'amigo') || '! ☀️' || E'\n\n' ||
                                      'Daqui a pouco, às ' || TO_CHAR(event_record.start_datetime, 'HH24:MI') || ', teremos nossa call para abrir um caminho de mais liberdade e resultados consistentes para você.' || E'\n\n' ||
                                      'Esse é um espaço exclusivo para destravar pontos que hoje te prendem e já traçar passos claros rumo à transformação que você busca — tanto profissional quanto pessoal.';
            ELSE
                -- Mensagem para admin se não tiver mentorado
                notification_message := '🌅 Bom dia! Você tem este evento hoje: ' ||
                                      event_record.title || ' - ' ||
                                      TO_CHAR(event_record.start_datetime, 'HH24:MI');
            END IF;
        ELSIF should_send_1h THEN
            -- Mensagem 1h antes (só para admin)
            notification_message := '⏰ Lembrete: Seu evento começa em 1 hora! ' ||
                                  event_record.title || ' - ' ||
                                  TO_CHAR(event_record.start_datetime, 'HH24:MI');
        ELSIF should_send_30min THEN
            -- Mensagem 30min antes específica para mentorado
            IF event_record.mentorado_id IS NOT NULL THEN
                notification_message := 'Oi ' || COALESCE(event_record.nome_completo, 'amigo') || '! Falta só meia hora para nossa call 🙌' || E'\n\n' ||
                                      'Prepare um lugar tranquilo para que a gente possa mergulhar de verdade no seu cenário e já construir juntos os primeiros passos rumo à sua liberdade e transformação. 🚀';
            ELSE
                -- Mensagem para admin se não tiver mentorado
                notification_message := '🚨 Atenção: Seu evento começa em 30 minutos! ' ||
                                      event_record.title || ' - ' ||
                                      TO_CHAR(event_record.start_datetime, 'HH24:MI');
            END IF;
        END IF;

        -- Adicionar descrição se existir
        IF event_record.description IS NOT NULL AND event_record.description != '' THEN
            notification_message := notification_message || E'\n\nDescrição: ' || event_record.description;
        END IF;

        -- Enviar notificações baseado no tipo e cenário
        IF should_send_morning OR should_send_30min THEN
            -- 9h e 30min antes: APENAS para mentorado (se tiver)
            IF event_record.mentorado_id IS NOT NULL AND event_record.telefone IS NOT NULL THEN
                RAISE NOTICE 'Enviando para mentorado: % (%)', event_record.nome_completo, event_record.telefone;

                BEGIN
                    SELECT * INTO api_response FROM http_post(
                        'http://217.196.60.199:3001/users/default/send',
                        json_build_object(
                            'to', event_record.telefone,
                            'message', notification_message
                        )::text,
                        'application/json'
                    );

                    IF api_response.status = 200 THEN
                        notifications_sent := notifications_sent + 1;
                        RAISE NOTICE 'Notificação enviada para mentorado: %', event_record.telefone;
                    ELSE
                        RAISE WARNING 'Erro ao enviar para mentorado %: Status %', event_record.telefone, api_response.status;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Erro HTTP ao enviar para mentorado %: %', event_record.telefone, SQLERRM;
                END;

                -- NÃO envia para admin nestes casos
                CONTINUE;
            END IF;
        END IF;

        -- Para 1h antes OU eventos sem mentorado: enviar para admin
        IF should_send_1h OR event_record.mentorado_id IS NULL THEN
            RAISE NOTICE 'Enviando para admin - evento: %', event_record.title;

            -- Preparar mensagem para admin
            IF event_record.mentorado_id IS NOT NULL THEN
                notification_message := '📅 Lembrete: Call com ' || event_record.nome_completo ||
                                      ' hoje às ' || TO_CHAR(event_record.start_datetime, 'HH24:MI') ||
                                      E'\n\nEvento: ' || event_record.title;
            ELSE
                notification_message := '📅 Lembrete do seu evento de hoje: ' ||
                                      event_record.title || ' - ' ||
                                      TO_CHAR(event_record.start_datetime, 'HH24:MI');
            END IF;

            IF event_record.description IS NOT NULL AND event_record.description != '' THEN
                notification_message := notification_message || E'\n\nDescrição: ' || event_record.description;
            END IF;
        ELSE
            -- Evento com mentorado já foi processado acima, pular admin
            CONTINUE;
        END IF;

        -- Enviar para admin (Gabriel)
        BEGIN
            SELECT * INTO api_response FROM http_post(
                'http://217.196.60.199:3001/users/default/send',
                json_build_object(
                    'to', admin_phone,
                    'message', notification_message
                )::text,
                'application/json'
            );

            IF api_response.status = 200 THEN
                notifications_sent := notifications_sent + 1;
                RAISE NOTICE 'Notificação enviada para admin: %', admin_phone;
            ELSE
                RAISE WARNING 'Erro ao enviar para admin: Status %', api_response.status;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erro HTTP ao enviar para admin: %', SQLERRM;
        END;

    END LOOP;

    -- Preparar resultado
    result_json := json_build_object(
        'success', true,
        'timestamp', now_time::text,
        'notifications_sent', notifications_sent,
        'morning_notification', should_send_morning,
        'events_processed',
        (SELECT COUNT(*) FROM calendar_events
         WHERE start_datetime >= today_start AND start_datetime <= today_end)
    );

    RAISE NOTICE 'Verificação concluída. % notificações enviadas', notifications_sent;

    RETURN result_json;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro na função send_event_notifications: %', SQLERRM;
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'timestamp', current_time::text
    );
END;
$$;

-- 3. AGENDAR JOBS DE CRON
-- =======================

-- Remover jobs existentes (se houver) - ignorar erro se não existir
DO $$
BEGIN
    PERFORM cron.unschedule('event-notifications-check');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Job event-notifications-check não existia';
END $$;

DO $$
BEGIN
    PERFORM cron.unschedule('morning-notifications');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Job morning-notifications não existia';
END $$;

-- Job principal: verificar a cada 2 minutos
SELECT cron.schedule(
    'event-notifications-check',     -- Nome do job
    '*/2 * * * *',                  -- A cada 2 minutos
    'SELECT send_event_notifications();'
);

-- Job específico para 9h da manhã (redundância)
SELECT cron.schedule(
    'morning-notifications',         -- Nome do job
    '0 9 * * *',                    -- Às 9:00 AM todos os dias
    'SELECT send_event_notifications();'
);

-- 4. VERIFICAR CONFIGURAÇÃO
-- ========================

-- Listar jobs criados
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
WHERE jobname IN ('event-notifications-check', 'morning-notifications');

-- 5. TESTE MANUAL
-- ===============

-- Executar função manualmente para testar
SELECT send_event_notifications();

-- 6. MONITORAMENTO
-- ================

-- Ver logs de execução recentes
SELECT
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid IN (
    SELECT jobid FROM cron.job
    WHERE jobname IN ('event-notifications-check', 'morning-notifications')
)
ORDER BY start_time DESC
LIMIT 20;

-- 7. COMENTÁRIOS INFORMATIVOS
-- ===========================

COMMENT ON FUNCTION send_event_notifications() IS 'Função que verifica eventos do dia e envia notificações via WhatsApp nos horários apropriados (6h da manhã e 30min antes de cada evento)';

-- Logs para confirmar execução
DO $$
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE 'SISTEMA DE NOTIFICAÇÕES CONFIGURADO';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Jobs agendados:';
    RAISE NOTICE '- Verificação a cada 2 minutos';
    RAISE NOTICE '- Notificação específica às 6h';
    RAISE NOTICE '';
    RAISE NOTICE 'Para monitorar execuções:';
    RAISE NOTICE 'SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;';
    RAISE NOTICE '';
    RAISE NOTICE 'Para testar manualmente:';
    RAISE NOTICE 'SELECT send_event_notifications();';
    RAISE NOTICE '=================================';
END $$;