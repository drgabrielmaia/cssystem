# 🎯 SOLUÇÃO FINAL - Instagram Automação

## 🚨 **PROBLEMA IDENTIFICADO:**

Você está usando **Instagram Basic Display Token** (`IGAAXlU1...`), que **NÃO suporta mensagens**.

Para receber mensagens DM, você precisa de **Page Access Token** do Facebook.

## ✅ **SOLUÇÃO COMPLETA:**

### **Passo 1: Conectar Instagram à Página Facebook**
1. Vá para **Facebook Business Manager**
2. **Accounts** → **Instagram Accounts**
3. **Connect** @drgabriel.maia a uma página Facebook
4. Ou crie uma nova página e conecte

### **Passo 2: Obter Page Access Token**
1. **Meta Developer Console** → **Tools** → **Access Token Tool**
2. **Page Access Tokens** (não User Access Tokens)
3. Selecione a página conectada ao Instagram
4. **Generate Token** com permissões:
   - `pages_messaging`
   - `instagram_basic`
   - `instagram_manage_messages`

### **Passo 3: Atualizar Token**
```env
# Substituir no .env.local
INSTAGRAM_ACCESS_TOKEN=EAABsb... (Page Token)
FACEBOOK_PAGE_ID=123456... (ID da página)
```

### **Passo 4: Configurar Webhook para a Página**
1. **Meta Developer Console** → **Messenger** → **Settings**
2. **Webhooks**:
   - URL: `https://cs.medicosderesultado.com.br/api/instagram/webhook`
   - Verify Token: `webhook_verify_token_123`
   - Subscribe: `messages`, `messaging_postbacks`

### **Passo 5: Conectar Página ao Webhook**
1. **Generate Page Access Token** (se ainda não fez)
2. **Subscribe** a página ao webhook:
```bash
curl -X POST "https://graph.facebook.com/v24.0/{PAGE_ID}/subscribed_apps" \
  -d "access_token={PAGE_ACCESS_TOKEN}"
```

## 🧪 **Como Testar Após Configuração:**

### **1. Verificar Page Token:**
```bash
curl "https://graph.facebook.com/me?access_token={PAGE_TOKEN}"
# Deve retornar dados da página
```

### **2. Testar Envio de Mensagem:**
```bash
curl -X POST "https://graph.facebook.com/v24.0/me/messages" \
  -d "recipient[id]=USER_ID&message[text]=teste&access_token={PAGE_TOKEN}"
```

### **3. Enviar Mensagem Real:**
- Mande DM para @drgabriel.maia
- Digite "oi"
- Sistema deve responder automaticamente

## 📋 **Checklist Final:**
- [ ] Instagram conectado à Página Facebook
- [ ] Page Access Token gerado
- [ ] Token atualizado no .env.local
- [ ] Webhook configurado para Messenger
- [ ] Página subscrita ao webhook
- [ ] Campo `messages` ativo

## 🎯 **Resultado Esperado:**
Após estes passos, quando alguém mandar DM para @drgabriel.maia com "oi", "olá" ou "hello", o sistema responderá automaticamente!

**O código está 100% pronto. É só questão de configuração!** 🚀