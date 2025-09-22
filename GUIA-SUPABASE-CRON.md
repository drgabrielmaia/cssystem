# 🚀 Guia de Implementação - Supabase pg_cron

## 📋 **Passo a Passo**

### **1. Acessar SQL Editor do Supabase**
1. Abrir dashboard do Supabase
2. Ir em **SQL Editor**
3. Criar nova query

### **2. Executar Script de Configuração**
Copiar e executar todo o conteúdo do arquivo `setup-supabase-cron.sql`

### **3. Verificar se Funcionou**
```sql
-- Ver jobs criados
SELECT * FROM cron.job;

-- Testar função manualmente
SELECT send_event_notifications();
```

---

## ⚙️ **Como Funciona**

### **Jobs Criados:**
- **`event-notifications-check`**: Executa a cada 2 minutos
- **`morning-notifications`**: Executa às 6h da manhã (redundância)

### **Função `send_event_notifications()`:**
1. ✅ Busca eventos de hoje
2. ✅ Verifica se é 6h da manhã OU 30min antes do evento
3. ✅ Envia notificações via HTTP para API WhatsApp
4. ✅ Retorna logs detalhados

### **Notificações:**
- **COM mentorado**: Envia para mentorado + Gabriel
- **SEM mentorado**: Envia apenas para Gabriel

---

## 🔍 **Monitoramento**

### **Ver Logs de Execução:**
```sql
SELECT
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### **Ver Jobs Ativos:**
```sql
SELECT
    jobname,
    schedule,
    active,
    command
FROM cron.job;
```

### **Testar Manualmente:**
```sql
SELECT send_event_notifications();
```

---

## ⚠️ **Requisitos Importantes**

### **1. API WhatsApp Acessível**
- A API deve estar rodando em URL pública
- Exemplo: `https://sua-api-whatsapp.railway.app/send`
- **NÃO funciona** com `localhost:3001`

### **2. Atualizar URL no Script**
No arquivo `setup-supabase-cron.sql`, trocar:
```sql
-- Linha 84 e 121: trocar localhost por URL pública
'http://localhost:3001/send'
-- Para:
'https://sua-api-whatsapp.herokuapp.com/send'
```

### **3. Verificar Extensões**
```sql
-- Verificar se extensões estão instaladas
SELECT * FROM pg_extension
WHERE extname IN ('pg_cron', 'http');
```

---

## 🛠️ **Troubleshooting**

### **❌ Jobs não executam**
- Verificar se `pg_cron` está habilitado
- Confirmar sintaxe do cron expression

### **❌ HTTP requests falham**
- API WhatsApp deve estar acessível publicamente
- Verificar URL no script
- Confirmar que API aceita POST com JSON

### **❌ Função retorna erro**
```sql
-- Ver logs detalhados
SELECT return_message FROM cron.job_run_details
ORDER BY start_time DESC LIMIT 5;
```

---

## 📱 **Formato das Mensagens**

### **Para Mentorados:**
```
Olá, este é o lembrete do seu evento de hoje: Call de Mentoria - 14:30

Descrição: Revisão do plano de negócios
```

### **Para Admin (com mentorado):**
```
📅 Lembrete: Call com João Silva hoje às 14:30

Evento: Call de Mentoria
Descrição: Revisão do plano de negócios
```

### **Para Admin (sem mentorado):**
```
📅 Lembrete do seu evento de hoje: Reunião Interna - 10:00

Descrição: Planejamento semanal
```

---

## ✅ **Vantagens do pg_cron**

- 🔧 **Integrado**: Roda no próprio banco
- 🆓 **Gratuito**: Disponível no plano free
- 📊 **Logs**: Sistema de logs nativo
- 🔄 **Confiável**: PostgreSQL gerencia execução
- ⚡ **Performance**: Acesso direto aos dados

---

## 🎯 **Próximos Passos**

1. ✅ Executar `setup-supabase-cron.sql`
2. ⚙️ Atualizar URL da API WhatsApp no script
3. 🧪 Testar com `SELECT send_event_notifications()`
4. 📅 Criar evento de teste para hoje
5. 👀 Monitorar logs de execução

**Sistema 100% automatizado diretamente no Supabase!** 🚀