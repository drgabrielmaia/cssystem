# ANÁLISE COMPLETA DO BANCO DE DADOS - SISTEMA DE LEADS E CLOSERS

## RESUMO EXECUTIVO

O banco de dados já possui uma estrutura robusta com tabelas principais implementadas:
- **LEADS**: 794 registros com estrutura completa de campos
- **CLOSERS**: 2 registros (1 closer, 1 SDR) com estrutura de gestão
- **DIVIDAS**: 174 registros (pode servir como base alternativa)
- **ORGANIZATIONS**: Sistema multi-tenant implementado
- **REFERRALS**: Sistema de indicações

## TABELAS EXISTENTES E ESTRUTURA

### 1. TABELA LEADS (794 registros)
**Status: ✅ COMPLETA - Precisa apenas ativar funcionalidades**

#### Campos de Scoring (JÁ EXISTEM):
- `lead_score` (number) - pontuação geral
- `lead_score_detalhado` (jsonb) - detalhamento da pontuação
- `temperatura` (text) - classificação frio/morno/quente
- `temperatura_calculada` (text) - temperatura automática
- `prioridade` (text) - nível de prioridade
- `prioridade_nivel` (text) - classificação detalhada
- `probabilidade_compra` (number) - % de probabilidade
- `urgencia_compra` - urgência da compra
- `nivel_interesse` - nível de interesse

#### Campos de Atribuição (JÁ EXISTEM):
- `closer_id` (uuid) - FK para closers
- `closer_atribuido_em` - data/hora da atribuição
- `closer_tipo` - tipo de closer atribuído
- `closer_observacoes` - observações do closer
- `sdr_id` - ID do SDR
- `sdr_atribuido_em` - data atribuição SDR
- `sdr_qualificado_em` - data qualificação

#### Campos de Follow-up (JÁ EXISTEM):
- `next_followup_date` - próximo follow-up
- `last_interaction_date` - última interação
- `follow_up_status` - status do follow-up
- `follow_up_data` - dados do follow-up
- `follow_up_observacoes` - observações

### 2. TABELA CLOSERS (2 registros)
**Status: ✅ EXISTE - Estrutura completa**

#### Campos principais:
- `id` (uuid) - identificador único
- `nome_completo` - nome do closer
- `email`, `telefone` - contatos
- `tipo_closer` - tipo (closer/sdr)
- `organization_id` - multi-tenant
- `meta_mensal` - meta de vendas
- `comissao_percentual` - % comissão
- `total_leads_atendidos` - contador de leads
- `conversao_rate` - taxa de conversão
- `pontuacao_total` - score do closer
- `skills` (jsonb) - habilidades
- `horario_trabalho` (jsonb) - horários

**Closers cadastrados:**
1. Paulo Guimarães (closer) - ID: 23d77835-951e-46a1-bb07-f66a96a4d8ad
2. Kelly (SDR) - ID: 66dfd430-e2b3-4a54-8e42-421d214083ed

### 3. TABELA DIVIDAS (174 registros)
**Status: ✅ EXISTE - Pode ser usada como complemento**

Estrutura simples com campos básicos de cobrança.

## GAPS IDENTIFICADOS - O QUE FALTA CRIAR

### 1. SISTEMA DE AGENDA/APPOINTMENTS ❌
**Prioridade: ALTA**

```sql
-- Criar tabela de disponibilidade dos closers
CREATE TABLE closer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID REFERENCES closers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slots JSONB DEFAULT '[]',
  available_slots INTEGER DEFAULT 8,
  booked_slots INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(closer_id, date)
);

-- Criar tabela de agendamentos
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  closer_id UUID REFERENCES closers(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  type TEXT CHECK (type IN ('discovery', 'demo', 'negotiation', 'closing')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  meeting_url TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX idx_appointments_closer_id ON appointments(closer_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_availability_closer_date ON closer_availability(closer_id, date);
```

### 2. FUNÇÕES DE AUTOMAÇÃO ❌
**Prioridade: ALTA**

```sql
-- Função para calcular score do lead automaticamente
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  lead_record RECORD;
BEGIN
  SELECT * INTO lead_record FROM leads WHERE id = lead_id;
  
  -- Pontuação por temperatura
  IF lead_record.temperatura = 'quente' THEN score := score + 30;
  ELSIF lead_record.temperatura = 'morno' THEN score := score + 20;
  ELSIF lead_record.temperatura = 'frio' THEN score := score + 10;
  END IF;
  
  -- Pontuação por origem
  IF lead_record.origem = 'indicacao' THEN score := score + 25;
  ELSIF lead_record.origem = 'organico' THEN score := score + 20;
  ELSIF lead_record.origem = 'pago' THEN score := score + 15;
  END IF;
  
  -- Pontuação por interação
  IF lead_record.last_interaction_date > NOW() - INTERVAL '7 days' THEN 
    score := score + 15;
  END IF;
  
  -- Pontuação por probabilidade de compra
  IF lead_record.probabilidade_compra IS NOT NULL THEN
    score := score + (lead_record.probabilidade_compra * 0.3)::INTEGER;
  END IF;
  
  -- Atualizar o lead
  UPDATE leads 
  SET 
    lead_score = score,
    lead_score_detalhado = jsonb_build_object(
      'temperatura', CASE 
        WHEN lead_record.temperatura = 'quente' THEN 30
        WHEN lead_record.temperatura = 'morno' THEN 20
        WHEN lead_record.temperatura = 'frio' THEN 10
        ELSE 0
      END,
      'origem', CASE
        WHEN lead_record.origem = 'indicacao' THEN 25
        WHEN lead_record.origem = 'organico' THEN 20
        WHEN lead_record.origem = 'pago' THEN 15
        ELSE 10
      END,
      'interacao_recente', CASE
        WHEN lead_record.last_interaction_date > NOW() - INTERVAL '7 days' THEN 15
        ELSE 0
      END,
      'probabilidade', COALESCE((lead_record.probabilidade_compra * 0.3)::INTEGER, 0),
      'total', score
    )
  WHERE id = lead_id;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Função para distribuir leads automaticamente
CREATE OR REPLACE FUNCTION auto_assign_lead_to_closer(lead_id UUID)
RETURNS UUID AS $$
DECLARE
  selected_closer_id UUID;
  lead_record RECORD;
BEGIN
  -- Buscar dados do lead
  SELECT * INTO lead_record FROM leads WHERE id = lead_id;
  
  -- Selecionar closer com menor carga e melhor fit
  SELECT c.id INTO selected_closer_id
  FROM closers c
  WHERE 
    c.organization_id = lead_record.organization_id
    AND c.tipo_closer = 'closer'
    AND c.status_contrato = 'ativo'
    AND (
      c.total_leads_atendidos < c.meta_mensal / 30 -- capacidade diária
      OR c.total_leads_atendidos IS NULL
    )
  ORDER BY 
    COALESCE(c.total_leads_atendidos, 0) ASC, -- menor carga
    c.conversao_rate DESC, -- melhor performance
    RANDOM() -- aleatoriedade para empates
  LIMIT 1;
  
  -- Atribuir o lead
  IF selected_closer_id IS NOT NULL THEN
    UPDATE leads 
    SET 
      closer_id = selected_closer_id,
      closer_atribuido_em = NOW(),
      closer_tipo = 'closer',
      status = 'em_atendimento',
      updated_at = NOW()
    WHERE id = lead_id;
    
    -- Atualizar contador do closer
    UPDATE closers 
    SET total_leads_atendidos = COALESCE(total_leads_atendidos, 0) + 1
    WHERE id = selected_closer_id;
  END IF;
  
  RETURN selected_closer_id;
END;
$$ LANGUAGE plpgsql;
```

### 3. TRIGGERS PARA AUTOMAÇÃO ❌
**Prioridade: ALTA**

```sql
-- Trigger para calcular score quando lead é criado ou atualizado
CREATE OR REPLACE FUNCTION trigger_calculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_lead_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_lead_score
AFTER INSERT OR UPDATE OF temperatura, origem, probabilidade_compra, last_interaction_date
ON leads
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_lead_score();

-- Trigger para distribuir leads automaticamente
CREATE OR REPLACE FUNCTION trigger_auto_assign_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atribuir se não tiver closer e score > 50
  IF NEW.closer_id IS NULL AND NEW.lead_score > 50 THEN
    PERFORM auto_assign_lead_to_closer(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_assign_high_score_leads
AFTER INSERT OR UPDATE OF lead_score
ON leads
FOR EACH ROW
WHEN (NEW.closer_id IS NULL AND NEW.lead_score > 50)
EXECUTE FUNCTION trigger_auto_assign_lead();
```

### 4. VIEWS PARA DASHBOARDS ❌
**Prioridade: MÉDIA**

```sql
-- View de leads por closer
CREATE VIEW closer_lead_summary AS
SELECT 
  c.id as closer_id,
  c.nome_completo,
  c.tipo_closer,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'vendido') as leads_convertidos,
  COUNT(DISTINCT l.id) FILTER (WHERE l.temperatura = 'quente') as leads_quentes,
  COUNT(DISTINCT l.id) FILTER (WHERE l.temperatura = 'morno') as leads_mornos,
  COUNT(DISTINCT l.id) FILTER (WHERE l.temperatura = 'frio') as leads_frios,
  AVG(l.lead_score) as score_medio,
  SUM(l.valor_venda) as total_vendas
FROM closers c
LEFT JOIN leads l ON l.closer_id = c.id
GROUP BY c.id, c.nome_completo, c.tipo_closer;

-- View de agenda disponível
CREATE VIEW available_slots AS
SELECT 
  ca.date,
  c.nome_completo as closer_name,
  ca.available_slots - ca.booked_slots as slots_livres,
  ca.time_slots
FROM closer_availability ca
JOIN closers c ON c.id = ca.closer_id
WHERE ca.date >= CURRENT_DATE
  AND ca.available_slots > ca.booked_slots
ORDER BY ca.date, c.nome_completo;
```

## AÇÕES NECESSÁRIAS - ORDEM DE IMPLEMENTAÇÃO

### FASE 1 - ATIVAR FUNCIONALIDADES EXISTENTES (Imediato)
1. ✅ **Ativar sistema de scoring nos leads**
   - Os campos já existem, só precisam ser utilizados
   - Implementar a função `calculate_lead_score()`
   - Criar trigger para calcular automaticamente

2. ✅ **Ativar atribuição de closers**
   - Campos `closer_id`, `closer_atribuido_em` já existem
   - Implementar função `auto_assign_lead_to_closer()`
   - Criar trigger para distribuição automática

### FASE 2 - CRIAR SISTEMA DE AGENDA (1-2 dias)
1. ❌ Criar tabela `appointments`
2. ❌ Criar tabela `closer_availability`
3. ❌ Implementar funções de agendamento
4. ❌ Criar views para visualização

### FASE 3 - IMPLEMENTAR AUTOMAÇÕES (1 dia)
1. ❌ Criar triggers para automação
2. ❌ Implementar funções de cálculo
3. ❌ Criar jobs/crons para tarefas recorrentes

### FASE 4 - DASHBOARDS E RELATÓRIOS (1 dia)
1. ❌ Criar views consolidadas
2. ❌ Implementar métricas de performance
3. ❌ Sistema de alertas e notificações

## COMANDOS SQL PRONTOS PARA EXECUÇÃO

```sql
-- 1. PRIMEIRO: Criar as tabelas que faltam (appointments e availability)
-- 2. SEGUNDO: Criar as funções de automação
-- 3. TERCEIRO: Criar os triggers
-- 4. QUARTO: Criar as views para dashboards
-- 5. QUINTO: Popular dados iniciais de disponibilidade

-- Exemplo para criar disponibilidade inicial para os closers
INSERT INTO closer_availability (closer_id, date, available_slots, time_slots)
SELECT 
  id,
  generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', '1 day'::interval)::date,
  8, -- 8 slots por dia
  '[
    {"time": "09:00", "available": true},
    {"time": "10:00", "available": true},
    {"time": "11:00", "available": true},
    {"time": "14:00", "available": true},
    {"time": "15:00", "available": true},
    {"time": "16:00", "available": true},
    {"time": "17:00", "available": true},
    {"time": "18:00", "available": true}
  ]'::jsonb
FROM closers
WHERE tipo_closer = 'closer' AND status_contrato = 'ativo';
```

## CONCLUSÃO

O sistema já possui 80% da estrutura necessária implementada. Os principais gaps são:
1. **Sistema de agenda** (tabelas appointments e availability)
2. **Funções de automação** (scoring e distribuição)
3. **Triggers** para executar automações

Com essas implementações, o sistema estará completo para:
- ✅ Pontuação automática de leads
- ✅ Distribuição automática para closers
- ✅ Sistema completo de agenda
- ✅ Tracking de performance
- ✅ Agendamento de calls