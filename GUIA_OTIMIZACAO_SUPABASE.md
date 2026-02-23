# GUIA DE OTIMIZAÇÃO DE PERFORMANCE - SUPABASE

## 📋 Análise Realizada

### Status Atual do Banco
- **Leads**: 813 registros
- **Organizations**: 4 registros  
- **Closers**: 4 registros
- **Tabelas principais**: leads, organizations, closers, notifications, organization_users, form_templates

### Problemas Identificados
1. **Ausência de índices estratégicos** para queries frequentes
2. **Consultas de dashboard** podem ser lentas sem índices compostos
3. **Buscas por data** não estão otimizadas
4. **Campos JSONB** não têm índices GIN para buscas eficientes

## 🚀 Como Aplicar as Otimizações

### Opção 1: Via Painel do Supabase (Recomendado)

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Projeto: udzmlnnztzzwrphhizol

2. **Vá para SQL Editor**
   - Menu lateral → SQL Editor
   - Clique em "New Query"

3. **Copie e execute o script de otimização**
   - Arquivo: `sql/database_performance_optimization.sql`
   - Cole o conteúdo completo no SQL Editor
   - Clique em "Run"

### Opção 2: Via Supabase CLI

```bash
# Se tiver o Supabase CLI instalado
npx supabase db execute --file sql/database_performance_optimization.sql
```

## 📊 O Que Será Otimizado

### 1. Índices para Tabela Leads (Mais Crítica)
- ✅ Filtros por organization_id (multi-tenant)
- ✅ Filtros por status (dashboard)
- ✅ Índice composto organization_id + status
- ✅ Ordenação por created_at (listagens recentes)
- ✅ Atribuições SDR/Closer
- ✅ Lead scoring (temperatura, probabilidade)
- ✅ Índices GIN para campos JSONB (call_details, qualification_details)
- ✅ Buscas por data específica

### 2. Índices para Tabela Organizations
- ✅ Busca por email do owner
- ✅ Ordenação por data de criação

### 3. Índices para Tabela Closers
- ✅ Filtros por organização
- ✅ Status de contrato
- ✅ Tipo de closer
- ✅ Ranking por total de vendas
- ✅ Índices GIN para skills e horário de trabalho

### 4. Índices para Tabela Notifications
- ✅ Filtros por organização
- ✅ Status de leitura
- ✅ Ações requeridas
- ✅ Ordenação cronológica

### 5. Índices para Tabela Organization_Users
- ✅ Autenticação rápida (org + email)
- ✅ Busca por user_id
- ✅ Filtro por usuários ativos

### 6. Índices para Tabela Form_Templates
- ✅ Busca por slug (URLs)
- ✅ Filtros por tipo de formulário
- ✅ Índices GIN para configurações

## 🔍 Funções de Monitoramento Criadas

### analyze_table_performance(table_name)
Analisa performance de uma tabela específica:
```sql
SELECT * FROM analyze_table_performance('leads');
```

### analyze_index_usage()
Verifica quais índices estão sendo usados:
```sql
SELECT * FROM analyze_index_usage();
```

### suggest_indexes()
Sugere novos índices baseados em queries:
```sql
SELECT * FROM suggest_indexes();
```

## 📈 Views de Monitoramento

### v_database_performance
View geral de performance do banco:
```sql
SELECT * FROM v_database_performance;
```

## 🎯 Benefícios Esperados

### Performance Improvements
- **Dashboard Principal**: 60-80% mais rápido
- **Filtros por Status**: 70-90% mais rápido  
- **Buscas Multi-tenant**: 50-70% mais rápido
- **Queries com JSONB**: 80-95% mais rápido
- **Listagens Ordenadas**: 40-60% mais rápido

### Escalabilidade
- Suporta até 100.000 leads com performance adequada
- Acima disso, considerar particionamento
- Índices compostos otimizam queries complexas

## 🔧 Manutenção Recomendada

### Diária
- Monitorar tempo de resposta das queries
- Verificar logs lentos

### Semanal
- Analisar uso dos índices com `analyze_index_usage()`
- Remover índices não utilizados

### Mensal
- Revisar estatísticas do banco com `ANALYZE`
- Considerar reorganização de tabelas fragmentadas

### Quando Leads > 100.000
- Implementar particionamento por data
- Considerar arquivamento de dados antigos
- Revisar estratégia de índices

## 📝 Próximos Passos Após Aplicação

1. **Validar Performance**
   ```sql
   -- Testar query antes/depois
   EXPLAIN ANALYZE SELECT * FROM leads WHERE organization_id = 'xxx' AND status = 'novo';
   ```

2. **Monitorar Uso**
   ```sql
   -- Verificar índices sendo usados
   SELECT * FROM analyze_index_usage() WHERE usage_status = 'UNUSED';
   ```

3. **Ajustar Conforme Necessário**
   - Adicionar índices para queries novas
   - Remover índices não utilizados
   - Otimizar índices compostos

## 🚨 Considerações Importantes

- **Espaço em Disco**: Índices consomem ~20-30% do espaço da tabela
- **Escrita**: Índices podem tornar INSERT/UPDATE ligeiramente mais lentos
- **Balanceamento**: Focar em índices para queries de leitura (mais frequentes)
- **Monitoramento**: Revisar periodicamente índices não utilizados

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do Supabase Dashboard
2. Usar `EXPLAIN ANALYZE` para identificar queries lentas
3. Consultar documentação PostgreSQL sobre índices
4. Considerar consulta com DBA para otimizações avançadas

---

**Data da Análise**: 2026-02-23  
**Ferramenta**: Supabase MCP + Análise Manual  
**Status**: Script pronto para aplicação via painel do Supabase