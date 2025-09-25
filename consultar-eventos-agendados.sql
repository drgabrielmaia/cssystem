-- ========================================
-- CONSULTA DE EVENTOS E NOTIFICAÇÕES AGENDADAS
-- Customer Success - WhatsApp Notifications
-- ========================================

-- VISUALIZAR PRÓXIMOS EVENTOS E NOTIFICAÇÕES
-- ===========================================

-- 1. EVENTOS DOS PRÓXIMOS 7 DIAS COM DETALHES DE NOTIFICAÇÃO
SELECT
    ce.id,
    ce.title,
    ce.start_datetime AT TIME ZONE 'America/Sao_Paulo' as horario_evento_br,
    ce.description,

    -- Dados do mentorado
    CASE
        WHEN m.id IS NOT NULL THEN m.nome_completo
        ELSE 'SEM MENTORADO'
    END as mentorado,
    m.telefone as telefone_mentorado,

    -- Tempo até o evento
    CASE
        WHEN ce.start_datetime > NOW() THEN
            CONCAT(
                EXTRACT(days FROM (ce.start_datetime - NOW()))::text, ' dias, ',
                EXTRACT(hours FROM (ce.start_datetime - NOW()))::text, ' horas, ',
                EXTRACT(minutes FROM (ce.start_datetime - NOW()))::text, ' minutos'
            )
        ELSE 'EVENTO JÁ PASSOU'
    END as tempo_ate_evento,

    -- Notificações que serão enviadas
    CASE
        WHEN m.id IS NOT NULL THEN
            '🌅 Notificação 9h (mentorado) | ⏰ 30min antes (mentorado) | 📱 1h antes (admin)'
        ELSE
            '📱 1h antes (admin)'
    END as notificacoes_programadas,

    -- Status das notificações baseado no horário atual
    CASE
        WHEN EXTRACT(hour FROM NOW() AT TIME ZONE 'America/Sao_Paulo') = 9
             AND EXTRACT(minute FROM NOW() AT TIME ZONE 'America/Sao_Paulo') < 5
             AND DATE_TRUNC('day', ce.start_datetime) = DATE_TRUNC('day', NOW())
        THEN '🌅 ENVIANDO NOTIFICAÇÃO MATINAL AGORA'

        WHEN (ce.start_datetime - NOW()) BETWEEN INTERVAL '25 minutes' AND INTERVAL '35 minutes'
        THEN '⏰ ENVIANDO NOTIFICAÇÃO 30MIN AGORA'

        WHEN (ce.start_datetime - NOW()) BETWEEN INTERVAL '55 minutes' AND INTERVAL '65 minutes'
        THEN '📱 ENVIANDO NOTIFICAÇÃO 1H AGORA'

        WHEN ce.start_datetime > NOW() THEN '⏳ AGUARDANDO'
        ELSE '✅ CONCLUÍDO'
    END as status_notificacao

FROM calendar_events ce
LEFT JOIN mentorados m ON ce.mentorado_id = m.id
WHERE ce.start_datetime >= NOW() - INTERVAL '1 hour'  -- Eventos da última hora até o futuro
  AND ce.start_datetime <= NOW() + INTERVAL '7 days'   -- Próximos 7 dias
ORDER BY ce.start_datetime ASC;

-- 2. RESUMO DE NOTIFICAÇÕES POR DIA
-- =================================
SELECT
    DATE(ce.start_datetime AT TIME ZONE 'America/Sao_Paulo') as dia,
    COUNT(*) as total_eventos,
    COUNT(m.id) as eventos_com_mentorado,
    COUNT(*) - COUNT(m.id) as eventos_sem_mentorado,

    -- Contagem de notificações por dia
    (COUNT(m.id) * 2 + COUNT(*)) as total_notificacoes_dia,  -- mentorados: 2 cada (9h + 30min) + admin: 1 cada (1h)

    STRING_AGG(
        CASE
            WHEN m.nome_completo IS NOT NULL THEN
                CONCAT(m.nome_completo, ' (', TO_CHAR(ce.start_datetime AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'), ')')
            ELSE
                CONCAT(ce.title, ' (', TO_CHAR(ce.start_datetime AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'), ')')
        END,
        ' | '
    ) as eventos_do_dia

FROM calendar_events ce
LEFT JOIN mentorados m ON ce.mentorado_id = m.id
WHERE ce.start_datetime >= NOW()
  AND ce.start_datetime <= NOW() + INTERVAL '7 days'
GROUP BY DATE(ce.start_datetime AT TIME ZONE 'America/Sao_Paulo')
ORDER BY dia ASC;

-- 3. PRÓXIMAS 5 NOTIFICAÇÕES QUE SERÃO ENVIADAS
-- =============================================
WITH proximas_notificacoes AS (
    -- Notificações matinais (9h)
    SELECT
        ce.id,
        '🌅 MATINAL (9h)' as tipo_notificacao,
        DATE_TRUNC('day', ce.start_datetime) + INTERVAL '9 hours' as horario_envio,
        CASE WHEN m.telefone IS NOT NULL THEN m.telefone ELSE '558396910414' END as destinatario,
        CASE WHEN m.nome_completo IS NOT NULL THEN m.nome_completo ELSE 'Admin' END as nome_destinatario,
        ce.title as evento_titulo
    FROM calendar_events ce
    LEFT JOIN mentorados m ON ce.mentorado_id = m.id
    WHERE ce.start_datetime >= NOW()
      AND ce.start_datetime <= NOW() + INTERVAL '7 days'
      AND DATE_TRUNC('day', ce.start_datetime) + INTERVAL '9 hours' > NOW()

    UNION ALL

    -- Notificações 1 hora antes (admin)
    SELECT
        ce.id,
        '📱 1H ANTES (Admin)' as tipo_notificacao,
        ce.start_datetime - INTERVAL '1 hour' as horario_envio,
        '558396910414' as destinatario,
        'Gabriel (Admin)' as nome_destinatario,
        ce.title as evento_titulo
    FROM calendar_events ce
    WHERE ce.start_datetime >= NOW()
      AND ce.start_datetime <= NOW() + INTERVAL '7 days'
      AND ce.start_datetime - INTERVAL '1 hour' > NOW()

    UNION ALL

    -- Notificações 30min antes (mentorado)
    SELECT
        ce.id,
        '⏰ 30MIN ANTES (Mentorado)' as tipo_notificacao,
        ce.start_datetime - INTERVAL '30 minutes' as horario_envio,
        m.telefone as destinatario,
        m.nome_completo as nome_destinatario,
        ce.title as evento_titulo
    FROM calendar_events ce
    LEFT JOIN mentorados m ON ce.mentorado_id = m.id
    WHERE ce.start_datetime >= NOW()
      AND ce.start_datetime <= NOW() + INTERVAL '7 days'
      AND ce.start_datetime - INTERVAL '30 minutes' > NOW()
      AND m.telefone IS NOT NULL
)
SELECT
    tipo_notificacao,
    horario_envio AT TIME ZONE 'America/Sao_Paulo' as horario_envio_br,
    nome_destinatario,
    destinatario,
    evento_titulo,

    -- Tempo até o envio
    CASE
        WHEN horario_envio > NOW() THEN
            CONCAT(
                CASE WHEN EXTRACT(days FROM (horario_envio - NOW())) > 0 THEN
                    EXTRACT(days FROM (horario_envio - NOW()))::text || ' dias, '
                ELSE '' END,
                EXTRACT(hours FROM (horario_envio - NOW()))::text, 'h ',
                EXTRACT(minutes FROM (horario_envio - NOW()))::text, 'min'
            )
        ELSE 'AGORA'
    END as tempo_ate_envio

FROM proximas_notificacoes
ORDER BY horario_envio ASC
LIMIT 10;

-- 4. STATUS DOS JOBS DE CRON
-- ==========================
SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    j.command,
    j.active,

    -- Última execução
    (SELECT
        jrd.start_time AT TIME ZONE 'America/Sao_Paulo'
     FROM cron.job_run_details jrd
     WHERE jrd.jobid = j.jobid
     ORDER BY jrd.start_time DESC
     LIMIT 1
    ) as ultima_execucao_br,

    -- Status da última execução
    (SELECT jrd.status
     FROM cron.job_run_details jrd
     WHERE jrd.jobid = j.jobid
     ORDER BY jrd.start_time DESC
     LIMIT 1
    ) as status_ultima_execucao

FROM cron.job j
WHERE j.jobname IN ('event-notifications-check', 'morning-notifications')
ORDER BY j.jobname;

-- 5. LOGS RECENTES DAS EXECUÇÕES
-- ==============================
SELECT
    j.jobname,
    jrd.start_time AT TIME ZONE 'America/Sao_Paulo' as execucao_br,
    jrd.status,
    jrd.return_message,
    jrd.end_time AT TIME ZONE 'America/Sao_Paulo' as fim_execucao_br,

    -- Duração da execução
    EXTRACT(seconds FROM (jrd.end_time - jrd.start_time))::text || 's' as duracao

FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN ('event-notifications-check', 'morning-notifications')
ORDER BY jrd.start_time DESC
LIMIT 20;

-- 6. TESTE RÁPIDO - PRÓXIMA NOTIFICAÇÃO
-- =====================================
SELECT
    '🚀 PRÓXIMA NOTIFICAÇÃO:' as status,

    -- Encontrar a próxima notificação mais próxima
    CASE
        -- Verificar se é horário matinal hoje
        WHEN EXTRACT(hour FROM NOW() AT TIME ZONE 'America/Sao_Paulo') = 9
             AND EXTRACT(minute FROM NOW() AT TIME ZONE 'America/Sao_Paulo') < 5
             AND EXISTS (SELECT 1 FROM calendar_events WHERE DATE_TRUNC('day', start_datetime) = DATE_TRUNC('day', NOW()))
        THEN 'ENVIANDO NOTIFICAÇÕES MATINAIS AGORA! 🌅'

        -- Próxima notificação matinal
        WHEN EXISTS (
            SELECT 1 FROM calendar_events ce
            WHERE ce.start_datetime >= NOW()
              AND DATE_TRUNC('day', ce.start_datetime) + INTERVAL '9 hours' > NOW()
            ORDER BY ce.start_datetime LIMIT 1
        )
        THEN CONCAT(
            'Próxima notificação matinal em: ',
            (SELECT
                EXTRACT(hours FROM (DATE_TRUNC('day', ce.start_datetime) + INTERVAL '9 hours' - NOW()))::text || 'h ' ||
                EXTRACT(minutes FROM (DATE_TRUNC('day', ce.start_datetime) + INTERVAL '9 hours' - NOW()))::text || 'min'
             FROM calendar_events ce
             WHERE ce.start_datetime >= NOW()
               AND DATE_TRUNC('day', ce.start_datetime) + INTERVAL '9 hours' > NOW()
             ORDER BY ce.start_datetime LIMIT 1
            ),
            ' 🌅'
        )

        ELSE 'Nenhuma notificação matinal agendada nos próximos dias'
    END as proxima_acao;