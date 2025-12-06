-- ========================================
-- SISTEMA DE AGENDAMENTO INTEGRADO AO CALENDÁRIO EXISTENTE
-- ========================================

-- 1. Expandir a tabela calendar_events existente para suportar agendamentos públicos
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS tipo_call VARCHAR(50) CHECK (tipo_call IN ('vendas', 'estrategica', 'publico')) DEFAULT 'vendas',
ADD COLUMN IF NOT EXISTS origem_agendamento VARCHAR(50) DEFAULT 'manual', -- 'manual', 'link_lead', 'link_mentorado', 'link_publico'
ADD COLUMN IF NOT EXISTS token_agendamento VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS nome_contato VARCHAR(200), -- Para agendamentos públicos
ADD COLUMN IF NOT EXISTS email_contato VARCHAR(200),
ADD COLUMN IF NOT EXISTS telefone_contato VARCHAR(20),
ADD COLUMN IF NOT EXISTS whatsapp_contato VARCHAR(20),
ADD COLUMN IF NOT EXISTS objetivo_call TEXT,
ADD COLUMN IF NOT EXISTS status_confirmacao VARCHAR(50) CHECK (
    status_confirmacao IN ('agendado', 'confirmado', 'reagendado', 'cancelado', 'concluido', 'no_show')
) DEFAULT 'agendado',
ADD COLUMN IF NOT EXISTS link_meet VARCHAR(500),
ADD COLUMN IF NOT EXISTS notificacao_enviada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS valor_produto DECIMAL(10,2), -- Para identificar se é elegível para onboarding (>=5000)
ADD COLUMN IF NOT EXISTS link_cancelamento VARCHAR(500),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- 2. Criar tabela de links de agendamento (mais simples)
CREATE TABLE IF NOT EXISTS agendamento_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_link VARCHAR(100) UNIQUE NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,

    -- Configurações do link
    tipo_call_permitido VARCHAR(50) DEFAULT 'vendas', -- 'vendas', 'estrategica', 'ambos'
    titulo_personalizado VARCHAR(200),
    descricao_personalizada TEXT,
    cor_tema VARCHAR(7) DEFAULT '#059669',

    -- Controle de acesso
    ativo BOOLEAN DEFAULT true,
    expira_em TIMESTAMP WITH TIME ZONE,
    uso_unico BOOLEAN DEFAULT false, -- Se true, desativa após primeiro agendamento

    -- Estatísticas
    total_visualizacoes INTEGER DEFAULT 0,
    total_agendamentos INTEGER DEFAULT 0,
    ultimo_acesso TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint: deve ter lead_id OU mentorado_id, mas não ambos (ou nenhum para link público)
    CONSTRAINT agendamento_links_check_ids
        CHECK (
            (lead_id IS NOT NULL AND mentorado_id IS NULL) OR
            (lead_id IS NULL AND mentorado_id IS NOT NULL) OR
            (lead_id IS NULL AND mentorado_id IS NULL) -- Link público
        )
);

-- 3. Tabela de configurações de agendamento (bem simples)
CREATE TABLE IF NOT EXISTS agendamento_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    horario_inicio TIME NOT NULL DEFAULT '08:00:00',
    horario_fim TIME NOT NULL DEFAULT '18:00:00',
    dias_semana INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- 0=Dom, 1=Seg, etc
    duracao_vendas_minutos INTEGER DEFAULT 60,
    duracao_estrategica_minutos INTEGER DEFAULT 30,
    buffer_entre_calls_minutos INTEGER DEFAULT 15,
    antecedencia_minima_horas INTEGER DEFAULT 24,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Função para gerar token único
CREATE OR REPLACE FUNCTION gerar_token_evento()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token_agendamento IS NULL AND NEW.origem_agendamento IN ('link_lead', 'link_mentorado', 'link_publico') THEN
        NEW.token_agendamento = encode(gen_random_bytes(32), 'hex');

        -- Gerar link de cancelamento
        NEW.link_cancelamento = format('/agenda/cancelar/%s', NEW.token_agendamento);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gerar_token_link()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token_link IS NULL OR NEW.token_link = '' THEN
        NEW.token_link = encode(gen_random_bytes(16), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar triggers
CREATE TRIGGER trigger_gerar_token_evento
    BEFORE INSERT ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION gerar_token_evento();

CREATE TRIGGER trigger_gerar_token_link_agendamento
    BEFORE INSERT ON agendamento_links
    FOR EACH ROW
    EXECUTE FUNCTION gerar_token_link();

-- 6. Função para verificar disponibilidade de horário
CREATE OR REPLACE FUNCTION verificar_disponibilidade(
    data_evento DATE,
    horario_inicio TIME,
    duracao_minutos INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    config_rec RECORD;
    evento_existente RECORD;
    dia_semana INTEGER;
    horario_fim TIME;
    datetime_inicio TIMESTAMP WITH TIME ZONE;
    datetime_fim TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Buscar configuração ativa
    SELECT * INTO config_rec FROM agendamento_config WHERE ativo = true LIMIT 1;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Verificar se o dia da semana está disponível
    dia_semana := EXTRACT(DOW FROM data_evento);
    IF NOT (dia_semana = ANY(config_rec.dias_semana)) THEN
        RETURN FALSE;
    END IF;

    -- Verificar se está dentro do horário de funcionamento
    horario_fim := horario_inicio + (duracao_minutos || ' minutes')::INTERVAL;
    IF horario_inicio < config_rec.horario_inicio OR horario_fim > config_rec.horario_fim THEN
        RETURN FALSE;
    END IF;

    -- Verificar conflitos com eventos existentes
    datetime_inicio := data_evento + horario_inicio;
    datetime_fim := data_evento + horario_fim;

    SELECT * INTO evento_existente
    FROM calendar_events
    WHERE start_datetime < datetime_fim
      AND end_datetime > datetime_inicio
      AND status_confirmacao NOT IN ('cancelado')
    LIMIT 1;

    IF FOUND THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7. View para agendamentos com informações completas
CREATE OR REPLACE VIEW view_agendamentos_completos AS
SELECT
    ce.*,
    l.nome_completo as lead_nome,
    l.email as lead_email,
    l.empresa as lead_empresa,
    m.nome_completo as mentorado_nome,
    m.email as mentorado_email,
    CASE
        WHEN ce.tipo_call = 'vendas' THEN 'Call Comercial'
        WHEN ce.tipo_call = 'estrategica' THEN 'Call Estratégica'
        ELSE 'Call Pública'
    END as tipo_call_nome,
    CASE
        WHEN ce.valor_produto >= 5000 THEN 'Elegível para Onboarding'
        ELSE 'Call de Vendas'
    END as categoria_cliente
FROM calendar_events ce
LEFT JOIN leads l ON ce.lead_id = l.id
LEFT JOIN mentorados m ON ce.mentorado_id = m.id
WHERE ce.origem_agendamento IN ('link_lead', 'link_mentorado', 'link_publico')
ORDER BY ce.start_datetime;

-- 8. Inserir configuração padrão
INSERT INTO agendamento_config (
    horario_inicio,
    horario_fim,
    dias_semana,
    duracao_vendas_minutos,
    duracao_estrategica_minutos,
    buffer_entre_calls_minutos,
    antecedencia_minima_horas
) VALUES (
    '08:00:00',
    '18:00:00',
    ARRAY[1,2,3,4,5], -- Segunda a Sexta
    60, -- 1h para call de vendas
    30, -- 30min para call estratégica
    15, -- 15min de buffer
    24  -- 24h de antecedência
) ON CONFLICT DO NOTHING;

-- 9. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_origem ON calendar_events(origem_agendamento);
CREATE INDEX IF NOT EXISTS idx_calendar_events_token ON calendar_events(token_agendamento);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status_confirmacao);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tipo_call ON calendar_events(tipo_call);
CREATE INDEX IF NOT EXISTS idx_agendamento_links_token ON agendamento_links(token_link);
CREATE INDEX IF NOT EXISTS idx_agendamento_links_ativo ON agendamento_links(ativo);

-- 10. Função para gerar slots disponíveis (para usar no frontend)
CREATE OR REPLACE FUNCTION gerar_slots_disponiveis(
    data_inicio DATE,
    data_fim DATE,
    tipo_call_param VARCHAR DEFAULT 'vendas'
) RETURNS TABLE(
    data DATE,
    horario TIME,
    disponivel BOOLEAN,
    tipo_call VARCHAR
) AS $$
DECLARE
    config_rec RECORD;
    dia_atual DATE;
    horario_atual TIME;
    duracao_minutos INTEGER;
BEGIN
    -- Buscar configuração
    SELECT * INTO config_rec FROM agendamento_config WHERE ativo = true LIMIT 1;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Definir duração baseada no tipo
    IF tipo_call_param = 'vendas' THEN
        duracao_minutos := config_rec.duracao_vendas_minutos;
    ELSE
        duracao_minutos := config_rec.duracao_estrategica_minutos;
    END IF;

    -- Iterar por cada dia
    dia_atual := data_inicio;
    WHILE dia_atual <= data_fim LOOP
        -- Verificar se o dia está disponível
        IF EXTRACT(DOW FROM dia_atual) = ANY(config_rec.dias_semana) THEN
            -- Iterar por cada horário do dia
            horario_atual := config_rec.horario_inicio;
            WHILE horario_atual + (duracao_minutos || ' minutes')::INTERVAL <= config_rec.horario_fim LOOP
                data := dia_atual;
                horario := horario_atual;
                disponivel := verificar_disponibilidade(dia_atual, horario_atual, duracao_minutos);
                tipo_call := tipo_call_param;
                RETURN NEXT;
                horario_atual := horario_atual + (duracao_minutos + config_rec.buffer_entre_calls_minutos || ' minutes')::INTERVAL;
            END LOOP;
        END IF;
        dia_atual := dia_atual + 1;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 11. Triggers para atualizar estatísticas dos links
CREATE OR REPLACE FUNCTION atualizar_stats_link()
RETURNS TRIGGER AS $$
DECLARE
    link_id UUID;
BEGIN
    -- Buscar o link que originou este agendamento
    IF NEW.origem_agendamento IN ('link_lead', 'link_mentorado', 'link_publico') THEN
        SELECT id INTO link_id
        FROM agendamento_links al
        WHERE (
            (NEW.lead_id IS NOT NULL AND al.lead_id = NEW.lead_id) OR
            (NEW.mentorado_id IS NOT NULL AND al.mentorado_id = NEW.mentorado_id) OR
            (NEW.lead_id IS NULL AND NEW.mentorado_id IS NULL AND al.lead_id IS NULL AND al.mentorado_id IS NULL)
        )
        AND al.ativo = true
        ORDER BY al.created_at DESC
        LIMIT 1;

        IF link_id IS NOT NULL THEN
            UPDATE agendamento_links
            SET total_agendamentos = total_agendamentos + 1,
                ultimo_acesso = NOW()
            WHERE id = link_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_stats_link
    AFTER INSERT ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_stats_link();

-- 12. Desabilitar RLS para desenvolvimento
ALTER TABLE agendamento_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamento_config DISABLE ROW LEVEL SECURITY;

-- 13. Comentários explicativos
COMMENT ON COLUMN calendar_events.tipo_call IS 'Tipo da call: vendas (1h), estrategica (30min), publico';
COMMENT ON COLUMN calendar_events.origem_agendamento IS 'Como foi agendado: manual, link_lead, link_mentorado, link_publico';
COMMENT ON COLUMN calendar_events.valor_produto IS 'Valor do produto para determinar elegibilidade para onboarding (>=5000)';
COMMENT ON TABLE agendamento_links IS 'Links personalizados para agendamento público';
COMMENT ON TABLE agendamento_config IS 'Configurações globais do sistema de agendamento';

SELECT 'Sistema de agendamento integrado ao calendário criado com sucesso!' as status;