-- VERSÃO QUE VAI FUNCIONAR SIM OU SIM
-- Sem frescura, direto ao ponto

CREATE OR REPLACE FUNCTION send_notifications()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    evento RECORD;
    contador INTEGER := 0;
    hora_atual INTEGER;
    minuto_atual INTEGER;
BEGIN
    -- Pegar hora atual
    hora_atual := EXTRACT(hour FROM NOW());
    minuto_atual := EXTRACT(minute FROM NOW());

    RAISE NOTICE 'Executando às %:%', hora_atual, minuto_atual;

    -- Buscar eventos de hoje
    FOR evento IN
        SELECT
            title,
            start_datetime,
            mentorado_id
        FROM calendar_events
        WHERE DATE(start_datetime) = CURRENT_DATE
    LOOP
        contador := contador + 1;
        RAISE NOTICE 'Evento encontrado: %', evento.title;

        -- Aqui faria o HTTP request (vamos implementar depois)
        -- Por enquanto só contar

    END LOOP;

    RETURN 'Processados ' || contador || ' eventos às ' || hora_atual || ':' || minuto_atual;
END;
$$;

-- Testar
SELECT send_notifications();