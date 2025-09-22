-- TESTE SIMPLES PRIMEIRO
-- Apenas testar se conseguimos criar função básica

CREATE OR REPLACE FUNCTION teste_notificacao()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    eventos_hoje INTEGER;
    resultado JSON;
BEGIN
    -- Contar eventos de hoje
    SELECT COUNT(*) INTO eventos_hoje
    FROM calendar_events
    WHERE DATE(start_datetime) = CURRENT_DATE;

    -- Retornar resultado simples
    resultado := json_build_object(
        'success', true,
        'eventos_hoje', eventos_hoje,
        'timestamp', NOW()::text
    );

    RAISE NOTICE 'Teste executado: % eventos hoje', eventos_hoje;

    RETURN resultado;
END;
$$;

-- Testar a função
SELECT teste_notificacao();