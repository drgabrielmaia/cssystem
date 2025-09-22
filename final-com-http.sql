-- VERSÃO FINAL COM HTTP REQUESTS REAIS
-- Agora vai enviar WhatsApp de verdade!

CREATE OR REPLACE FUNCTION send_event_notifications()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    evento RECORD;
    contador INTEGER := 0;
    enviados INTEGER := 0;
    hora_atual INTEGER;
    minuto_atual INTEGER;
    admin_phone TEXT := '5583996910414';
    mensagem TEXT;
    http_result TEXT;
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
            -- CENÁRIO 1: Evento COM mentorado
            IF evento.mentorado_id IS NOT NULL AND evento.telefone IS NOT NULL THEN
                RAISE NOTICE 'Evento com mentorado: % (%)', evento.nome_completo, evento.telefone;

                -- Preparar mensagem para mentorado
                mensagem := 'Olá, este é o lembrete do seu evento de hoje: ' ||
                           evento.title || ' - ' ||
                           TO_CHAR(evento.start_datetime, 'HH24:MI');

                IF evento.description IS NOT NULL THEN
                    mensagem := mensagem || E'\n\nDescrição: ' || evento.description;
                END IF;

                -- Enviar para mentorado
                BEGIN
                    SELECT content INTO http_result FROM http_post(
                        'http://localhost:3001/send',
                        json_build_object(
                            'to', evento.telefone,
                            'message', mensagem
                        )::text,
                        'application/json'
                    );

                    enviados := enviados + 1;
                    RAISE NOTICE '✅ Enviado para mentorado: %', evento.telefone;

                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING '❌ Erro ao enviar para mentorado %: %', evento.telefone, SQLERRM;
                END;

                -- Preparar mensagem para admin (sobre a call)
                mensagem := '📅 Lembrete: Call com ' || evento.nome_completo ||
                           ' hoje às ' || TO_CHAR(evento.start_datetime, 'HH24:MI') ||
                           E'\n\nEvento: ' || evento.title;

                IF evento.description IS NOT NULL THEN
                    mensagem := mensagem || E'\n\nDescrição: ' || evento.description;
                END IF;

            -- CENÁRIO 2: Evento SEM mentorado
            ELSE
                RAISE NOTICE 'Evento sem mentorado: %', evento.title;

                mensagem := '📅 Lembrete do seu evento de hoje: ' ||
                           evento.title || ' - ' ||
                           TO_CHAR(evento.start_datetime, 'HH24:MI');

                IF evento.description IS NOT NULL THEN
                    mensagem := mensagem || E'\n\nDescrição: ' || evento.description;
                END IF;
            END IF;

            -- Enviar para admin (Gabriel) - sempre enviar
            BEGIN
                SELECT content INTO http_result FROM http_post(
                    'http://localhost:3001/send',
                    json_build_object(
                        'to', admin_phone,
                        'message', mensagem
                    )::text,
                    'application/json'
                );

                enviados := enviados + 1;
                RAISE NOTICE '✅ Enviado para admin: %', admin_phone;

            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '❌ Erro ao enviar para admin: %', SQLERRM;
            END;

        END IF;

    END LOOP;

    RETURN 'Processados ' || contador || ' eventos às ' || hora_atual || ':' || minuto_atual ||
           '. ' || enviados || ' notificações enviadas.';
END;
$$;

-- Testar a função final
SELECT send_event_notifications();