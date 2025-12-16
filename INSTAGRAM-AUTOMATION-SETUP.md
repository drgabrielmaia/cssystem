# 📱 Instagram Automation System - Guia Completo de Setup

Este guia te ajudará a configurar um sistema completo de automação do Instagram com webhooks em tempo real, respostas automáticas e funis de conversão.

## 🎯 Visão Geral

O sistema permite:
- ✅ Receber eventos do Instagram em tempo real (comentários, DMs)
- ✅ Responder automaticamente baseado em palavras-chave
- ✅ Criar funis de automação complexos
- ✅ Dashboard com métricas reais
- ✅ Integração completa com banco de dados

## 📋 Pré-requisitos

- Conta Instagram Business ou Creator
- Aplicativo Facebook/Meta configurado
- Conta no Supabase
- Next.js rodando (já implementado)

## 🔧 1. Configuração do Banco de Dados (Supabase)

### 1.1 Criar as Tabelas

1. Acesse seu dashboard do Supabase: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Execute o seguinte SQL:

```sql
-- Instagram Automation System - Simplified SQL for Supabase SQL Editor
-- Execute this script directly in your Supabase SQL Editor

-- 1. Create instagram_automations table
CREATE TABLE IF NOT EXISTS instagram_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('comment_keyword', 'dm_keyword', 'new_follower', 'story_mention')),
    keywords TEXT[],
    response_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    responses_sent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create instagram_funnels table
CREATE TABLE IF NOT EXISTS instagram_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    leads_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create instagram_funnel_steps table
CREATE TABLE IF NOT EXISTS instagram_funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES instagram_funnels(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('message', 'delay', 'condition', 'action')),
    content TEXT,
    delay_minutes INTEGER,
    condition_rule TEXT,
    action_type TEXT,
    next_step_id UUID REFERENCES instagram_funnel_steps(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_instagram_automations_trigger_type ON instagram_automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_instagram_automations_is_active ON instagram_automations(is_active);
CREATE INDEX IF NOT EXISTS idx_instagram_funnels_is_active ON instagram_funnels(is_active);
CREATE INDEX IF NOT EXISTS idx_instagram_funnel_steps_funnel_id ON instagram_funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_instagram_funnel_steps_step_order ON instagram_funnel_steps(funnel_id, step_order);

-- Enable RLS
ALTER TABLE instagram_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnel_steps ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (adjust as needed for your auth setup)
CREATE POLICY "Allow authenticated users full access to automations"
ON instagram_automations FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to funnels"
ON instagram_funnels FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to funnel steps"
ON instagram_funnel_steps FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
```

4. Clique em **Run** para executar

## 📱 2. Configuração do Facebook/Instagram Developer

### 2.1 Criar Aplicativo Facebook

1. Acesse https://developers.facebook.com/
2. Vá em **Meus Aplicativos** > **Criar Aplicativo**
3. Escolha **Business** > **Avançar**
4. Preencha:
   - **Nome do aplicativo**: "Sistema Instagram Automação"
   - **E-mail de contato**: seu email
   - **ID do aplicativo**: (será gerado automaticamente)

### 2.2 Configurar Instagram Basic Display API

1. No seu app, vá em **+ Adicionar Produto**
2. Procure **Instagram Basic Display** e clique **Configurar**
3. Vá em **Instagram Basic Display** > **Basic Display**
4. Clique **Criar novo aplicativo**
5. Preencha os campos obrigatórios

### 2.3 Configurar Instagram Graph API (Para Webhooks)

1. Adicione o produto **Instagram Graph API**
2. Vá em **Instagram Graph API** > **Webhook**
3. Clique **Subscribe to Webhook**

### 2.4 Configurar Webhook URL

⚠️ **IMPORTANTE**: Seu webhook precisa estar acessível publicamente

**URL do Webhook:**
```
https://seu-dominio.com/api/instagram/webhook
```

Se estiver testando localmente, use ngrok:
```bash
# Instalar ngrok
npm install -g ngrok

# Expor localhost:3000
ngrok http 3000

# Use a URL HTTPS gerada pelo ngrok
# Exemplo: https://abc123.ngrok.io/api/instagram/webhook
```

**Token de Verificação:**
```
webhook_verify_token_123
```
(Este token está já configurado no seu `.env.local`)

### 2.5 Configurar Campos do Webhook

Marque os seguintes eventos:
- ✅ **comments** (para comentários)
- ✅ **messaging** (para mensagens diretas)
- ✅ **mentions** (para menções)

### 2.6 Obter Access Token

1. Vá em **Instagram Basic Display** > **User Token Generator**
2. Clique **Add or Remove Instagram Testers**
3. Adicione sua conta Instagram como testador
4. Gere um token de usuário
5. Copie o token gerado

## ⚙️ 3. Configuração do Código

### 3.1 Verificar Variáveis de Ambiente

Confirme se seu `.env.local` tem todas as variáveis:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://udzmlnnztzzwrphhizol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui

# Instagram API
INSTAGRAM_APP_SECRET=seu_app_secret_aqui
INSTAGRAM_ACCESS_TOKEN=seu_access_token_aqui

# Instagram Webhook
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=webhook_verify_token_123
```

### 3.2 Implementar Instagram API Client

O arquivo `src/lib/instagram-api.ts` deve conter:

```typescript
const INSTAGRAM_API_BASE = 'https://graph.instagram.com';

export const instagramAPI = {
  async sendDirectMessage(userId: string, message: string) {
    try {
      const response = await fetch(`${INSTAGRAM_API_BASE}/v21.0/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: userId },
          message: { text: message }
        })
      });

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending Instagram message:', error);
      throw error;
    }
  }
};
```

## 🚀 4. Testando o Sistema

### 4.1 Verificar Webhook

1. Inicie sua aplicação:
```bash
npm run dev
```

2. Se usando ngrok:
```bash
ngrok http 3000
```

3. Configure a URL do webhook no Facebook Developer Console

### 4.2 Testar Automações

1. Acesse `http://localhost:3000/instagram`
2. Crie uma nova automação:
   - **Nome**: "Resposta Info"
   - **Gatilho**: Palavra-chave em comentário
   - **Palavras-chave**: "info, preço, detalhes"
   - **Resposta**: "Olá! Te envio mais informações no DM 😊"

3. Publique um post no seu Instagram
4. Comente "info" no post
5. O sistema deve automaticamente:
   - Detectar o comentário
   - Enviar uma DM com a resposta automática
   - Incrementar o contador de respostas

### 4.3 Verificar Logs

Monitore os logs no terminal:
```bash
# Logs do webhook aparecem no console
npm run dev
```

Procure por:
- `🔍 [Instagram Webhook] Verificação recebida`
- `📱 [Instagram Webhook] Evento recebido`
- `💬 [Instagram Webhook] Processando comentário`
- `🎯 [Instagram Webhook] Palavra-chave encontrada`
- `✅ [Instagram Webhook] DM enviado com sucesso!`

## 📊 5. Recursos do Sistema

### 5.1 Dashboard de Automações

- **Automações Ativas**: Contador em tempo real
- **Posts Reais**: Seus posts do Instagram com métricas
- **Mensagens Enviadas**: Total de respostas automáticas
- **Funis Ativos**: Sequências de automação

### 5.2 Tipos de Automação

1. **Palavra-chave em Comentário**
   - Detecta palavras em comentários
   - Responde via DM automaticamente

2. **Palavra-chave em DM**
   - Detecta palavras em mensagens diretas
   - Responde no mesmo chat

3. **Novo Seguidor** (implementação futura)
   - Mensagem de boas-vindas automática

4. **Menção em Story** (implementação futura)
   - Resposta a menções em stories

### 5.3 Sistema de Funis

- Criar sequências de mensagens
- Delays automáticos
- Condições lógicas
- Métricas de conversão

## 🔒 6. Segurança e Boas Práticas

### 6.1 Rate Limiting

O Instagram tem limites de API:
- **Mensagens**: 1000 por dia
- **Requests**: 200 por hora

### 6.2 Validação de Webhook

O sistema valida:
- Token de verificação
- Assinatura do webhook (HMAC)
- Origem do request

### 6.3 Logs e Monitoramento

Todos os eventos são logados:
- Webhooks recebidos
- Automações disparadas
- Erros e falhas

## 🐛 7. Troubleshooting

### 7.1 Webhook não está funcionando

```bash
# Verificar se o endpoint está acessível
curl -X GET "https://sua-url.com/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=webhook_verify_token_123&hub.challenge=test"

# Deve retornar: test
```

### 7.2 Automações não estão salvando

1. Verificar se as tabelas foram criadas no Supabase
2. Verificar logs do browser (F12 > Console)
3. Verificar variáveis de ambiente

### 7.3 Instagram API retorna erro

- Verificar se o access token está válido
- Confirmar se as permissões estão corretas
- Verificar rate limits

## 📈 8. Próximos Passos

### 8.1 Melhorias Sugeridas

1. **AI Integration**: Usar GPT para respostas mais inteligentes
2. **Analytics Avançados**: Gráficos de performance
3. **Templates**: Biblioteca de respostas prontas
4. **Agenda**: Agendar posts e respostas
5. **Multi-conta**: Gerenciar várias contas

### 8.2 Monitoramento

- Configurar alertas para erros
- Dashboard de métricas em tempo real
- Relatórios semanais de performance

## 🎉 Conclusão

Seu sistema de automação do Instagram está agora configurado e funcionando!

**Recursos implementados:**
- ✅ Webhooks em tempo real
- ✅ Respostas automáticas por palavra-chave
- ✅ Dashboard com dados reais
- ✅ Sistema de funis
- ✅ Banco de dados persistente
- ✅ Interface administrativa

**Para ativar completamente:**
1. Execute o SQL no Supabase
2. Configure o webhook no Facebook Developer
3. Teste criando uma automação
4. Publique um post e comente uma palavra-chave
5. Verifique se a resposta automática funcionou

🚀 **Seu sistema está pronto para automatizar milhares de interações no Instagram!**