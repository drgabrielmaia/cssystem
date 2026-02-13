# Sistema de Pontuação e Distribuição Automática de Leads - INSTRUÇÕES DE APLICAÇÃO

## 📋 PASSO A PASSO PARA APLICAR NO SUPABASE

### 1. Acesse o SQL Editor do Supabase
- Entre no dashboard do Supabase: https://supabase.com/dashboard
- Selecione seu projeto 
- Vá para **SQL Editor** no menu lateral

### 2. Execute o SQL de Implementação
- Copie TODO o conteúdo do arquivo `sql/lead-scoring-system.sql`
- Cole no SQL Editor
- Clique em **RUN** para executar

### 3. Teste as Funções Criadas

Execute os seguintes comandos SQL no editor para testar:

```sql
-- 1. Testar pontuação em 5 leads recentes
SELECT * FROM test_lead_scoring_system(5);

-- 2. Ver estatísticas de distribuição
SELECT * FROM get_lead_distribution_stats();

-- 3. Recalcular scores de todos os leads
SELECT recalculate_all_lead_scores();
```

### 4. Execute o Script de Teste Local

No terminal, execute:

```bash
cd /Users/gabrielmaia/Desktop/ECOSSISTEMA\ GM/cs/cssystem
node scripts/test-lead-scoring.js
```

## ✅ FUNÇÕES IMPLEMENTADAS

### 1. **calculate_lead_score(lead_id UUID)**
Calcula a pontuação do lead baseada em:
- Temperatura (40% do peso)
- Origem (20% do peso)
- Interações/mensagens (20% do peso)
- Recência (10% do peso) 
- Formulário médico se preenchido (10% do peso)

### 2. **auto_assign_lead_to_closer(lead_id UUID)**
Distribui leads automaticamente considerando:
- Capacidade máxima de cada closer
- Carga atual de trabalho
- Taxa de conversão recente
- Balanceamento de carga

### 3. **Triggers Automáticos**
- `auto_calculate_lead_score`: Calcula score automaticamente quando lead é criado/atualizado
- `auto_assign_hot_leads`: Distribui automaticamente leads com score >= 60 ou temperatura "quente"

### 4. **Funções Utilitárias**
- `test_lead_scoring_system(limit)`: Testa o sistema com N leads
- `get_lead_distribution_stats()`: Mostra estatísticas de distribuição
- `recalculate_all_lead_scores()`: Recalcula scores de todos os leads

## 🎯 REGRAS DE NEGÓCIO IMPLEMENTADAS

### Pontuação (0-100 pontos)
- **Temperatura Quente**: +40 pontos
- **Temperatura Morna**: +20 pontos
- **Temperatura Fria**: +10 pontos
- **Instagram Ads**: +20 pontos
- **Google Ads**: +18 pontos
- **10+ mensagens**: +20 pontos
- **Lead de hoje**: +10 pontos

### Distribuição Automática
- Leads com **score >= 60** são distribuídos automaticamente
- Leads **quentes** são distribuídos independente do score
- Prioriza closers com menor carga de trabalho
- Considera taxa de conversão dos últimos 30 dias

## 📊 MONITORAMENTO

### Verificar Leads Não Atribuídos
```sql
SELECT 
  nome_completo, 
  telefone, 
  temperatura, 
  lead_score,
  created_at
FROM leads 
WHERE closer_id IS NULL 
  AND organization_id IS NOT NULL
ORDER BY lead_score DESC, created_at DESC;
```

### Verificar Carga de Trabalho dos Closers
```sql
SELECT * FROM get_lead_distribution_stats();
```

### Verificar Histórico de Atribuições
```sql
SELECT 
  lh.*,
  l.nome_completo as lead_name,
  l.telefone
FROM lead_history lh
JOIN leads l ON l.id = lh.lead_id
WHERE lh.action IN ('auto_assigned', 'auto_assignment_failed')
ORDER BY lh.created_at DESC
LIMIT 20;
```

## ⚠️ OBSERVAÇÕES IMPORTANTES

1. **Capacidade dos Closers**: Por padrão, cada closer tem capacidade para 50 leads ativos. Ajuste conforme necessário:
```sql
UPDATE closers 
SET capacidade_maxima_leads = 30 -- ou outro valor
WHERE id = 'ID_DO_CLOSER';
```

2. **Score Mínimo para Distribuição**: O padrão é 60 pontos. Para ajustar:
- Edite a função `trigger_auto_assign_lead()` 
- Mude a condição `NEW.lead_score >= 60`

3. **Logs e Auditoria**: Todas as ações são registradas na tabela `lead_history`

## 🐛 TROUBLESHOOTING

### Se as funções não forem criadas:
1. Execute o SQL em partes menores
2. Verifique erros específicos no console
3. Certifique-se de que as tabelas `leads` e `closers` existem

### Se a distribuição não funcionar:
1. Verifique se há closers ativos: `SELECT * FROM closers WHERE status_contrato = 'ativo'`
2. Verifique se os leads têm organization_id preenchido
3. Verifique o log de erros em `lead_history`

## 📞 PRÓXIMOS PASSOS

1. **Ajustar pesos da pontuação** conforme resultados observados
2. **Configurar alertas** para leads não atribuídos há mais de 1 hora
3. **Criar dashboard** de monitoramento em tempo real
4. **Implementar redistribuição** quando closer não responde em X horas
5. **Adicionar machine learning** para melhorar a pontuação ao longo do tempo