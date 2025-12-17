# 🚀 Configuração Instagram Messaging API

## ❌ Problema Atual
Você está usando **Instagram Basic Display API** que não suporta mensagens DM.
Para receber/enviar mensagens, precisa da **Instagram Messaging API**.

## ✅ Solução: Instagram Messaging API

### 📋 Pré-requisitos
1. **Instagram Business Account** ✅ (você já tem)
2. **Facebook Page** conectada ao Instagram
3. **App Facebook** configurado corretamente
4. **Page Access Token** (não User Token)

### 🔧 Passos para Configurar

#### 1. **Conectar Instagram à Página Facebook**
1. Vá para https://business.facebook.com/
2. Adicione o Instagram @drgabriel.maia à uma página Facebook
3. Ou crie uma nova página para conectar ao Instagram

#### 2. **Configurar App no Meta Developer Console**
1. Acesse https://developers.facebook.com/apps/
2. No seu app, vá para **Products**
3. Adicione **Instagram Basic Display** E **Messenger**
4. Configure **Instagram Messaging**

#### 3. **Obter Page Access Token**
```bash
# 1. Obter User Access Token com permissões de página
# 2. Trocar por Page Access Token
GET /me/accounts?access_token={user-access-token}
```

#### 4. **Configurar Webhook para Página**
- URL: `https://cs.medicosderesultado.com.br/api/instagram/webhook`
- Verify Token: `webhook_verify_token_123`
- Subscribe: `messages`, `messaging_postbacks`, `messaging_optins`

#### 5. **Atualizar Token no .env.local**
```env
# Substituir por Page Access Token
INSTAGRAM_ACCESS_TOKEN=EAAxxxxx (Page Token)
```

### 🔄 Alterações Necessárias no Código

#### webhook/route.ts - Atualizar para Page API
```typescript
// Usar Facebook Graph API para Instagram Messaging
const response = await fetch(`https://graph.facebook.com/v24.0/me/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    recipient: { id: recipientId },
    message: { text: text },
    access_token: PAGE_ACCESS_TOKEN
  })
})
```

### 📱 Como Funciona Depois
1. **Cliente** manda DM para @drgabriel.maia
2. **Instagram** → **Facebook Page** → **Webhook**
3. **Webhook** detecta palavra-chave
4. **Sistema** responde automaticamente

### 🚨 Importante
- **Instagram Business** deve estar conectado à **Página Facebook**
- **Token deve ser de PÁGINA**, não de usuário
- **Webhook subscriptions** devem estar na página

## 🎯 Próximos Passos
1. Conecte Instagram à uma Página Facebook
2. Obtenha Page Access Token
3. Atualize webhook configurations
4. Teste com mensagens reais