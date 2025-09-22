# 🚀 Deploy Guide - Customer Success System

## ⚠️ Variáveis de Ambiente Obrigatórias

### **Para o Frontend (Next.js)**

Configure essas variáveis no seu serviço de deploy:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://udzmlnnztzzwrphhizol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU
NEXT_PUBLIC_WHATSAPP_API_URL=https://cs.medicosderesultado.com.br/api
```

---

## 🔧 **Configuração por Plataforma**

### **Vercel**
1. Ir em **Settings** > **Environment Variables**
2. Adicionar as 3 variáveis acima

### **Netlify**
1. Ir em **Site Settings** > **Environment Variables**
2. Adicionar as 3 variáveis acima

### **Railway**
1. No painel do projeto > **Variables**
2. Adicionar as 3 variáveis acima

### **Heroku**
1. No dashboard do app > **Settings** > **Config Vars**
2. Adicionar as 3 variáveis acima

---

## 📋 **Checklist de Deploy**

### **Frontend (Next.js)**
- [ ] Configurar variáveis de ambiente
- [ ] Deploy realizado com sucesso
- [ ] Testar login no sistema
- [ ] Verificar se calendário funciona

### **API WhatsApp**
- [ ] Deploy da pasta `api/core/`
- [ ] Porta configurada corretamente
- [ ] QR Code acessível para escaneamento
- [ ] Testar endpoint `/status`

### **Banco Supabase**
- [ ] Executar `setup-supabase-cron.sql`
- [ ] Trocar URL localhost pela URL pública da API
- [ ] Executar `ativar-automatico.sql`
- [ ] Testar função: `SELECT send_event_notifications()`

---

## 🚨 **Erros Comuns**

### **"Your project's URL and API key are required"**
- ✅ **Solução**: Configurar variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **"WhatsApp não está conectado"**
- ✅ **Solução**: Acessar API WhatsApp e escanear QR Code

### **"localhost não funciona"**
- ✅ **Solução**: Trocar `localhost:3001` pela URL pública nos scripts SQL

---

## 📱 **URLs de Exemplo**

### **Depois do Deploy**
- **Frontend**: `https://cs.medicosderesultado.com.br`
- **API WhatsApp**: `https://cs.medicosderesultado.com.br/api`

### **Configurar no Supabase**
```sql
-- Trocar esta linha nos scripts:
'http://localhost:3001/send'

-- Por esta:
'https://cs.medicosderesultado.com.br/api/whatsapp/send'
```

---

## ✅ **Teste Final**

1. **Acessar o sistema** → Login deve funcionar
2. **Criar evento** → Deve aparecer no calendário
3. **Executar no Supabase**: `SELECT send_event_notifications()`
4. **Verificar WhatsApp** → Gabriel deve receber notificação

**Sistema funcionando = Deploy concluído!** 🎉