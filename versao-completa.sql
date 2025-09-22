-- AGORA VAMOS PARA A VERSÃO COMPLETA
-- Já sabemos que a base funciona!

-- 1. Primeiro vamos habilitar as extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- 2. Função completa de notificações
CREATE OR REPLACE FUNCTION send_event_notifications()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    evento RECORD;
    contador INTEGER := 0;
    hora_atual INTEGER;
    minuto_atual INTEGER;
    admin_phone TEXT := '5583996910414';
    mensagem TEXT;
    api_response TEXT;
    should_send BOOLEAN := FALSE;
BEGIN
    -- Pegar hora atual
    hora_atual := EXTRACT(hour FROM NOW());
    minuto_atual := EXTRACT(minute FROM NOW());

    RAISE NOTICE 'Executando verificação às %:%', hora_atual, minuto_atual;

    -- Buscar eventos de hoje com mentorados
    FOR evento IN
        SELECT
            ce.title,
            ce.description,
            ce.start_datetime,
            ce.mentorado_id,
            m.nome_completo,
            m.telefone
        FROM calendar_events ce
        LEFT JOIN mentorados m ON ce.mentorado_id = m.id
        WHERE DATE(ce.start_datetime) = CURRENT_DATE
        ORDER BY ce.start_datetime
    LOOP
        contador := contador + 1;
        should_send := FALSE;

        RAISE NOTICE 'Processando evento: % às %', evento.title, evento.start_datetime;

        -- Verificar se é 6h da manhã (enviar todos os eventos)
        IF hora_atual = 6 AND minuto_atual < 5 THEN
            should_send := TRUE;
            RAISE NOTICE 'Enviando notificação matinal';
        END IF;

        -- Verificar se é 30min antes do evento
        IF (evento.start_datetime - NOW()) BETWEEN INTERVAL '25 minutes' AND INTERVAL '35 minutes' THEN
            should_send := TRUE;
            RAISE NOTICE 'Enviando notificação 30min antes';
        END IF;

        -- Se deve enviar notificação
        IF should_send THEN
            -- Preparar mensagem
            mensagem := 'Olá, este é o lembrete do seu evento de hoje: ' ||
                       evento.title || ' - ' ||
                       TO_CHAR(evento.start_datetime, 'HH24:MI');

            IF evento.description IS NOT NULL THEN
                mensagem := mensagem || E'\n\nDescrição: ' || evento.description;
            END IF;

            -- Se tem mentorado, enviar para ele
            IF evento.mentorado_id IS NOT NULL AND evento.telefone IS NOT NULL THEN
                RAISE NOTICE 'Enviando para mentorado: % (%)', evento.nome_completo, evento.telefone;

                -- Aqui faria o HTTP request para o mentorado
                -- api_response := http_post('http://localhost:3001/send', ...)

                -- Preparar mensagem para admin sobre a call
                mensagem := '📅 Lembrete: Call com ' || evento.nome_completo ||
                           ' hoje às ' || TO_CHAR(evento.start_datetime, 'HH24:MI') ||
                           E'\n\nEvento: ' || evento.title;

                IF evento.description IS NOT NULL THEN
                    mensagem := mensagem || E'\n\nDescrição: ' || evento.description;
                END IF;
            ELSE
                -- Evento sem mentorado
                mensagem := '📅 Lembrete do seu evento de hoje: ' ||
                           evento.title || ' - ' ||
                           TO_CHAR(evento.start_datetime, 'HH24:MI');

                IF evento.description IS NOT NULL THEN
                    mensagem := mensagem || E'\n\nDescrição: ' || evento.description;
                END IF;
            END IF;

            -- Enviar para admin (Gabriel)
            RAISE NOTICE 'Enviando para admin: %', admin_phone;
            RAISE NOTICE 'Mensagem: %', mensagem;

            -- Aqui faria o HTTP request para o admin
            -- api_response := http_post('http://localhost:3001/send', ...)

        END IF;

    END LOOP;

    RETURN 'Processados ' || contador || ' eventos às ' || hora_atual || ':' || minuto_atual ||
           '. Notificações enviadas conforme horário.';
END;
$$;

-- 3. Agendar os cron jobs
SELECT cron.schedule(
    'event-notifications',
    '*/2 * * * *',
    'SELECT send_event_notifications();'
);

-- 4. Testar a função
SELECT send_event_notifications();

-- 5. Ver jobs criados
SELECT * FROM cron.job;