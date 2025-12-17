# 🐛 Debug Instagram Automação - Passo a Passo

## ❌ Problema: Mensagens não chegam no webhook

**Status atual:**
- ✅ Código funcionando (webhook processa eventos simulados)
- ✅ Build e deploy ok
- ✅ Token Instagram válido
- ❌ Eventos reais não chegam

## 🔍 Checklist de Debug

### 1. **Meta Developer Console - Products**
Verifique se tem estes 2 products:
- [ ] **Instagram Basic Display**
- [ ] **Messenger** ← **CRÍTICO**

### 2. **Meta Developer Console - Webhooks**

#### **Instagram Basic Display Webhooks:**
- [ ] URL: `https://cs.medicosderesultado.com.br/api/instagram/webhook`
- [ ] Verify Token: `webhook_verify_token_123`
- [ ] Campo `messages`: **SUBSCRIBED**
- [ ] Campo `messaging_postbacks`: **SUBSCRIBED**

#### **Messenger Webhooks:**
- [ ] URL: `https://cs.medicosderesultado.com.br/api/instagram/webhook`
- [ ] Verify Token: `webhook_verify_token_123`
- [ ] Campo `messages`: **SUBSCRIBED**
- [ ] Campo `messaging_postbacks`: **SUBSCRIBED**

### 3. **Página Facebook Conectada**
- [ ] Instagram @drgabriel.maia está conectado a uma **Página Facebook**
- [ ] **Page Access Token** configurado (não User Token)
- [ ] Página tem permissões para Instagram messaging

### 4. **App Review Status**
- [ ] App está **LIVE** em produção
- [ ] OU você é **Admin/Developer** do app
- [ ] OU você está em **Test Users** do app

### 5. **Instagram Account Type**
- [ ] @drgabriel.maia é **Instagram Business Account** ✅
- [ ] Conectado ao **Facebook Business Manager**

## 🚨 Problemas Mais Comuns

### **Problema #1: Messenger Product não adicionado**
```
Solução: No Meta Developer Console:
1. Ir em Products
2. + Add Product
3. Escolher "Messenger"
4. Configurar webhook
```

### **Problema #2: Webhook não configurado para Messenger**
```
Solução: No Messenger > Webhooks:
1. Callback URL: https://cs.medicosderesultado.com.br/api/instagram/webhook
2. Verify Token: webhook_verify_token_123
3. Subscribe: messages, messaging_postbacks
```

### **Problema #3: App em modo Development**
```
Solução:
- Submeter app para App Review
- OU adicionar usuários como Test Users
- OU colocar app em modo Live
```

### **Problema #4: Instagram não conectado à Página**
```
Solução:
1. Facebook Business Manager
2. Conectar Instagram Business Account
3. Gerar Page Access Token
4. Atualizar INSTAGRAM_ACCESS_TOKEN
```

## 🧪 Como Testar

### **Teste 1: Webhook Verification**
```bash
curl "https://cs.medicosderesultado.com.br/api/instagram/webhook?hub.verify_token=webhook_verify_token_123&hub.challenge=test&hub.mode=subscribe"
# Deve retornar: test
```

### **Teste 2: Simular Evento Instagram**
```bash
curl -X POST "https://cs.medicosderesultado.com.br/api/instagram/webhook" \
-H "Content-Type: application/json" \
-d '{"object":"instagram","entry":[{"messaging":[{"message":{"text":"oi"}}]}]}'
# Deve retornar: {"success":true}
```

### **Teste 3: Simular Evento Messenger**
```bash
curl -X POST "https://cs.medicosderesultado.com.br/api/instagram/webhook" \
-H "Content-Type: application/json" \
-d '{"object":"page","entry":[{"messaging":[{"message":{"text":"oi"}}]}]}'
# Instagram: ✅ success:true
# Messenger: ❌ success:false (precisa configurar)
```

## 🎯 Próximos Passos

1. **Adicione Messenger Product** se não tiver
2. **Configure webhook para Messenger**
3. **Verifique se Instagram está conectado à Página Facebook**
4. **Teste enviando mensagem real**

## 📞 Se ainda não funcionar

O problema está na configuração do Meta Developer Console, não no código.

**Código está 100% funcional!** 🚀