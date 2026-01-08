# 🚀 Instruções para Setup Multi-Tenant Completo

## 📋 Passo a Passo

### 1. Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login e selecione seu projeto
3. No menu lateral, clique em **SQL Editor**

### 2. Executar o Script SQL Principal

1. Abra o arquivo: `sql/001_multi_tenant_complete_setup.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN** para executar

⚠️ **IMPORTANTE**: O script pode demorar alguns segundos para executar completamente.

### 3. Verificar a Execução

Execute esta query para verificar se tudo foi configurado:

```sql
SELECT verify_multi_tenant_setup();
```

Você deve ver um resultado similar a:
```json
{
  "setup_complete": true,
  "tables_with_org_id": [...],
  "rls_enabled": true,
  "triggers_created": [...],
  "functions_created": [...]
}
```

## 🔑 Obter Service Key (Opcional - Para Automação)

Se você quiser executar scripts automaticamente no futuro:

1. No Supabase Dashboard, vá para **Settings > API**
2. Encontre a seção **Service role key**
3. Copie a chave (começa com `eyJ...`)
4. Adicione no arquivo `.env.local`:
   ```
   SUPABASE_SERVICE_KEY=sua_chave_aqui
   ```

⚠️ **SEGURANÇA**: NUNCA commite a service key no git!

## ✅ O que o Script Faz

### Estrutura de Organizações
- ✅ Cria tabelas `organizations` e `organization_users`
- ✅ Configura índices para performance

### Multi-Tenant em Todas as Tabelas
- ✅ Adiciona `organization_id` em: leads, mentorados, metas, etc.
- ✅ Cria índices para todas as foreign keys

### Auto-Criação de Organização
- ✅ Trigger automático quando novo usuário se cadastra
- ✅ Usuário se torna owner automaticamente
- ✅ Vincula usuários pré-cadastrados ao fazer login

### Sistema de Permissões
- ✅ Funções para verificar organização do usuário
- ✅ Sistema de roles: owner, manager, viewer
- ✅ Função para criar novos usuários na organização

### Segurança (RLS)
- ✅ Row Level Security em TODAS as tabelas
- ✅ Isolamento total de dados por organização
- ✅ Políticas específicas por role do usuário

### Funções Administrativas
- ✅ `create_user_for_organization()` - Criar usuários
- ✅ `transfer_organization_ownership()` - Transferir propriedade
- ✅ `get_organization_stats()` - Estatísticas da organização

## 🧪 Testando o Sistema

### 1. Criar um Novo Usuário

```javascript
// No seu app, ao criar usuário com Supabase Auth
const { data, error } = await supabase.auth.signUp({
  email: 'novo@exemplo.com',
  password: 'senha123'
});
// Organização será criada automaticamente!
```

### 2. Verificar Isolamento

Execute o script de verificação:
```bash
node verify-multi-tenant-status.js
```

### 3. Criar Usuário para Organização

```javascript
// Como owner ou manager, criar novo usuário
const { data, error } = await supabase.rpc('create_user_for_organization', {
  p_email: 'colaborador@exemplo.com',
  p_password: 'senha123',
  p_role: 'viewer',
  p_full_name: 'João Silva'
});
```

## 🐛 Troubleshooting

### Erro: "permission denied for schema public"
- Você está usando a anon key ao invés da service key
- Execute o SQL diretamente no Supabase Dashboard

### Erro: "column organization_id does not exist"
- O script não foi executado completamente
- Re-execute o script SQL principal

### RLS bloqueando acesso
- Verifique se o usuário está vinculado a uma organização
- Execute: `SELECT * FROM organization_users WHERE user_id = 'seu_user_id';`

## 📊 Monitoramento

Para monitorar o sistema multi-tenant:

```sql
-- Ver todas as organizações
SELECT * FROM organizations;

-- Ver usuários por organização
SELECT o.name, COUNT(ou.*) as users
FROM organizations o
LEFT JOIN organization_users ou ON o.id = ou.organization_id
GROUP BY o.id, o.name;

-- Verificar dados isolados
SELECT
  'leads' as table_name,
  organization_id,
  COUNT(*) as count
FROM leads
GROUP BY organization_id;
```

## 🎯 Próximos Passos

1. **Testar com usuários reais**
   - Crie 2-3 usuários diferentes
   - Verifique se cada um vê apenas seus dados

2. **Configurar convites por email**
   - Implementar sistema de convites
   - Envio de emails para novos usuários

3. **Dashboard de administração**
   - Interface para gerenciar usuários
   - Visualizar estatísticas da organização

4. **Auditoria e logs**
   - Registrar ações importantes
   - Monitorar uso por organização

## 💡 Dicas Importantes

1. **Sempre teste em desenvolvimento primeiro**
2. **Faça backup antes de mudanças em produção**
3. **Monitore o uso de RLS (pode impactar performance)**
4. **Configure alertas para erros de permissão**

---

✨ **Sistema Multi-Tenant Completo e Pronto para Uso!**