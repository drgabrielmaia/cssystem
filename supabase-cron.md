# 🕰️ Supabase Cron Jobs com pg_cron

## ✅ **Disponibilidade**

O Supabase oferece **pg_cron** extension que permite executar tarefas agendadas diretamente no PostgreSQL.

**Disponível em:**
- ✅ **Plano Gratuito** (limitado)
- ✅ **Plano Pro** ($25/mês)
- ✅ **Planos Enterprise**

---

## 🚀 **Como Implementar**

### **1. Ativar a extensão pg_cron**

No **SQL Editor** do Supabase:

```sql
-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### **2. Criar função para notificações**

```sql
-- Função que será executada pelo cron
CREATE OR REPLACE FUNCTION send_event_notifications()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    event_record RECORD;
    admin_phone TEXT := '5583996910414';
    notification_message TEXT;
    api_response TEXT;
BEGIN
    -- Buscar eventos de hoje
    FOR event_record IN
        SELECT
            ce.id,
            ce.title,
            ce.description,
            ce.start_datetime,
            ce.mentorado_id,
            m.nome_completo,
            m.telefone
        FROM calendar_events ce
        LEFT JOIN mentorados m ON ce.mentorado_id = m.id
        WHERE DATE(ce.start_datetime) = CURRENT_DATE
    LOOP
        -- Verificar se deve enviar notificação (6h ou 30min antes)
        IF (EXTRACT(hour FROM NOW()) = 6 AND EXTRACT(minute FROM NOW()) < 5)
           OR (ce.start_datetime - NOW() BETWEEN INTERVAL '25 minutes' AND INTERVAL '35 minutes') THEN

            -- Preparar mensagem
            notification_message := 'Olá, este é o lembrete do seu evento de hoje: ' ||
                                  event_record.title || ' - ' ||
                                  TO_CHAR(event_record.start_datetime, 'HH24:MI');

            -- Se tem mentorado, enviar para ele também
            IF event_record.mentorado_id IS NOT NULL AND event_record.telefone IS NOT NULL THEN
                -- Enviar para mentorado via HTTP request
                SELECT extensions.http_post(
                    url := 'http://localhost:3001/send',
                    headers := '{"Content-Type": "application/json"}'::jsonb,
                    body := json_build_object(
                        'to', event_record.telefone,
                        'message', notification_message
                    )::text
                ) INTO api_response;

                -- Enviar para admin sobre a call
                notification_message := '📅 Lembrete: Call com ' || event_record.nome_completo ||
                                      ' hoje às ' || TO_CHAR(event_record.start_datetime, 'HH24:MI') ||
                                      E'\n\nEvento: ' || event_record.title;
            ELSE
                -- Evento sem mentorado - apenas admin
                notification_message := '📅 Lembrete do seu evento de hoje: ' ||
                                      event_record.title || ' - ' ||
                                      TO_CHAR(event_record.start_datetime, 'HH24:MI');
            END IF;

            -- Enviar para admin
            SELECT extensions.http_post(
                url := 'http://localhost:3001/send',
                headers := '{"Content-Type": "application/json"}'::jsonb,
                body := json_build_object(
                    'to', admin_phone,
                    'message', notification_message
                )::text
            ) INTO api_response;

        END IF;
    END LOOP;
END;
$$;
```

### **3. Agendar execução do cron**

```sql
-- Agendar para executar a cada 2 minutos
SELECT cron.schedule(
    'event-notifications',              -- Nome do job
    '*/2 * * * *',                     -- A cada 2 minutos
    'SELECT send_event_notifications();' -- Comando a executar
);

-- Opcional: Job específico para 6h da manhã
SELECT cron.schedule(
    'morning-notifications',
    '0 6 * * *',                       -- Às 6h da manhã
    'SELECT send_event_notifications();'
);
```

---

## 🔧 **Requisitos**

### **1. Habilitar HTTP Extension**

Para fazer requests HTTP para a API WhatsApp:

```sql
-- Habilitar extensão para requisições HTTP
CREATE EXTENSION IF NOT EXISTS http;
```

### **2. Configurar Network Policies (se necessário)**

No painel do Supabase > Settings > API:
- Permitir conexões HTTP externas
- Configurar whitelist de URLs se necessário

---

## 📋 **Gerenciar Cron Jobs**

### **Listar jobs ativos**
```sql
SELECT * FROM cron.job;
```

### **Remover job**
```sql
SELECT cron.unschedule('event-notifications');
```

### **Ver logs de execução**
```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'event-notifications'
ORDER BY start_time DESC
LIMIT 10;
```

---

## ⚠️ **Limitações**

### **Plano Gratuito**
- Limitado a poucos jobs simultâneos
- Pode ter throttling
- Performance reduzida

### **Conectividade**
- Precisa acessar API WhatsApp externamente
- Pode precisar de URL pública para a API
- Configurações de firewall podem bloquear

---

## 🎯 **Vantagens vs Desvantagens**

### **✅ Vantagens**
- Integrado ao Supabase
- Não depende de serviços externos
- Execução confiável
- Logs nativos
- Acesso direto ao banco

### **❌ Desvantagens**
- Requer plano pago para uso intensivo
- API WhatsApp precisa ser acessível externamente
- Mais complexo de configurar
- Debugging mais difícil

---

## 🚀 **Conclusão**

**Para este projeto**, pg_cron do Supabase é uma **excelente opção** se:

1. ✅ Você tem plano Pro do Supabase
2. ✅ A API WhatsApp está acessível publicamente
3. ✅ Preferir solução integrada

**Senão**, as alternativas externas (EasyCron, etc.) podem ser mais simples.