-- ========================================
-- SISTEMA COMPLETO DE TRACKING DE LEADS
-- ========================================
-- Para rastrear TUDO sobre cada lead: histórico, anotações, follow-ups, etc.

-- 1. ADICIONAR CAMPOS DE TRACKING NA TABELA LEADS
ALTER TABLE leads ADD COLUMN IF NOT EXISTS proxima_acao DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_prevista_fechamento DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS motivo_nao_fechou TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dor_principal TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS orcamento_disponivel DECIMAL(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_principal VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS periodo_melhor_contato VARCHAR(50); -- manha, tarde, noite
ALTER TABLE leads ADD COLUMN IF NOT EXISTS canal_preferido VARCHAR(50); -- whatsapp, email, telefone
ALTER TABLE leads ADD COLUMN IF NOT EXISTS produto_interesse VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS concorrente VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgencia_compra VARCHAR(20) CHECK (urgencia_compra IN ('baixa', 'media', 'alta', 'urgente'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nivel_interesse INTEGER CHECK (nivel_interesse >= 1 AND nivel_interesse <= 10);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[]; -- array de tags
ALTER TABLE leads ADD COLUMN IF NOT EXISTS responsavel_vendas VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fonte_referencia TEXT; -- quem indicou especificamente
ALTER TABLE leads ADD COLUMN IF NOT EXISTS objetivo_principal TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS objecoes_principais TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS perfil_comportamental VARCHAR(50); -- analitico, expressivo, condutor, amavel

-- 2. CRIAR TABELA DE HISTÓRICO/TIMELINE DO LEAD
CREATE TABLE IF NOT EXISTS lead_historico (
    id SERIAL PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL, -- status_change, call, email, whatsapp, meeting, follow_up, note
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    resultado VARCHAR(100), -- positivo, negativo, neutro, sem_resposta
    proxima_acao_definida TEXT,
    data_proxima_acao DATE,
    duracao_minutos INTEGER, -- para calls/meetings
    temperatura_antes VARCHAR(20),
    temperatura_depois VARCHAR(20),
    tags_evento TEXT[],
    arquivos_anexos TEXT[], -- URLs ou caminhos para arquivos
    valor_negociado DECIMAL(10,2), -- se houve negociação
    desconto_oferecido DECIMAL(5,2), -- percentual
    responsavel VARCHAR(100),
    canal_contato VARCHAR(50), -- whatsapp, email, telefone, presencial
    sentiment_score INTEGER CHECK (sentiment_score >= 1 AND sentiment_score <= 10), -- humor do lead
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE FOLLOW-UPS/LEMBRETES
CREATE TABLE IF NOT EXISTS lead_followups (
    id SERIAL PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    data_agendada TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- call, email, whatsapp, meeting, proposal, contract
    prioridade VARCHAR(20) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido', 'cancelado', 'adiado')),
    resultado TEXT,
    responsavel VARCHAR(100),
    notificacao_enviada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE ANOTAÇÕES/OBSERVAÇÕES RÁPIDAS
CREATE TABLE IF NOT EXISTS lead_notes (
    id SERIAL PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    nota TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'geral', -- geral, objecao, interesse, pessoal, tecnico
    categoria VARCHAR(50), -- financeiro, timing, autoridade, necessidade
    is_important BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE, -- anotação privada do vendedor
    responsavel VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE INTERAÇÕES (emails, calls, mensagens)
CREATE TABLE IF NOT EXISTS lead_interacoes (
    id SERIAL PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- email_sent, email_received, call_made, call_received, whatsapp_sent, whatsapp_received
    assunto VARCHAR(200),
    conteudo TEXT,
    anexos TEXT[],
    duracao_segundos INTEGER, -- para calls
    status_entrega VARCHAR(50), -- enviado, entregue, lido, respondido
    origem_sistema VARCHAR(50), -- manual, automático, integração
    responsavel VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lead_historico_lead_id ON lead_historico(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_historico_created_at ON lead_historico(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON lead_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_data_agendada ON lead_followups(data_agendada);
CREATE INDEX IF NOT EXISTS idx_lead_followups_status ON lead_followups(status);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interacoes_lead_id ON lead_interacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_proxima_acao ON leads(proxima_acao);
CREATE INDEX IF NOT EXISTS idx_leads_data_prevista_fechamento ON leads(data_prevista_fechamento);

-- 7. TRIGGERS PARA HISTÓRICO AUTOMÁTICO
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log mudança de status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO lead_historico (
            lead_id, tipo_evento, status_anterior, status_novo,
            titulo, descricao, temperatura_antes, temperatura_depois,
            created_at
        ) VALUES (
            NEW.id,
            'status_change',
            OLD.status,
            NEW.status,
            'Status alterado de ' || COALESCE(OLD.status, 'novo') || ' para ' || NEW.status,
            'Mudança automática de status',
            OLD.temperatura,
            NEW.temperatura,
            NOW()
        );
    END IF;

    -- Log mudança de temperatura
    IF OLD.temperatura IS DISTINCT FROM NEW.temperatura THEN
        INSERT INTO lead_historico (
            lead_id, tipo_evento, titulo, descricao,
            temperatura_antes, temperatura_depois, created_at
        ) VALUES (
            NEW.id,
            'temperature_change',
            'Temperatura alterada de ' || COALESCE(OLD.temperatura, 'indefinido') || ' para ' || NEW.temperatura,
            'Mudança de temperatura do lead',
            OLD.temperatura,
            NEW.temperatura,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_lead_changes ON leads;
CREATE TRIGGER trigger_log_lead_changes
    AFTER UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION log_lead_status_change();

-- 8. VIEW PARA DASHBOARD COMPLETO DO LEAD
CREATE OR REPLACE VIEW lead_dashboard AS
SELECT
    l.*,
    -- Estatísticas de interações
    (SELECT COUNT(*) FROM lead_interacoes WHERE lead_id = l.id) as total_interacoes,
    (SELECT COUNT(*) FROM lead_interacoes WHERE lead_id = l.id AND tipo LIKE 'call_%') as total_calls,
    (SELECT COUNT(*) FROM lead_interacoes WHERE lead_id = l.id AND tipo LIKE 'email_%') as total_emails,
    (SELECT COUNT(*) FROM lead_interacoes WHERE lead_id = l.id AND tipo LIKE 'whatsapp_%') as total_whatsapp,

    -- Última interação
    (SELECT created_at FROM lead_interacoes WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as ultima_interacao,
    (SELECT tipo FROM lead_interacoes WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as tipo_ultima_interacao,

    -- Follow-ups pendentes
    (SELECT COUNT(*) FROM lead_followups WHERE lead_id = l.id AND status = 'pendente') as followups_pendentes,
    (SELECT data_agendada FROM lead_followups WHERE lead_id = l.id AND status = 'pendente' ORDER BY data_agendada ASC LIMIT 1) as proximo_followup,

    -- Anotações importantes
    (SELECT COUNT(*) FROM lead_notes WHERE lead_id = l.id AND is_important = true) as notas_importantes,

    -- Histórico
    (SELECT COUNT(*) FROM lead_historico WHERE lead_id = l.id) as total_historico,

    -- Tempo desde última interação
    EXTRACT(DAYS FROM NOW() - (SELECT MAX(created_at) FROM lead_interacoes WHERE lead_id = l.id)) as dias_sem_interacao

FROM leads l;

-- 9. FUNÇÃO PARA CALCULAR SCORE DO LEAD
CREATE OR REPLACE FUNCTION calcular_lead_score(lead_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    lead_data RECORD;
BEGIN
    SELECT * FROM leads WHERE id = lead_uuid INTO lead_data;

    IF lead_data IS NULL THEN
        RETURN 0;
    END IF;

    -- Temperatura (30 pontos max)
    CASE lead_data.temperatura
        WHEN 'quente' THEN score := score + 30;
        WHEN 'morno' THEN score := score + 20;
        WHEN 'frio' THEN score := score + 10;
    END CASE;

    -- Urgência (25 pontos max)
    CASE lead_data.urgencia_compra
        WHEN 'urgente' THEN score := score + 25;
        WHEN 'alta' THEN score := score + 20;
        WHEN 'media' THEN score := score + 15;
        WHEN 'baixa' THEN score := score + 5;
    END CASE;

    -- Nível de interesse (10 pontos max)
    score := score + COALESCE(lead_data.nivel_interesse, 0);

    -- Orçamento disponível (20 pontos max)
    IF lead_data.orcamento_disponivel IS NOT NULL THEN
        IF lead_data.orcamento_disponivel >= 5000 THEN score := score + 20;
        ELSIF lead_data.orcamento_disponivel >= 2000 THEN score := score + 15;
        ELSIF lead_data.orcamento_disponivel >= 1000 THEN score := score + 10;
        ELSE score := score + 5;
        END IF;
    END IF;

    -- Interações recentes (10 pontos max)
    IF (SELECT COUNT(*) FROM lead_interacoes WHERE lead_id = lead_uuid AND created_at >= NOW() - INTERVAL '7 days') > 3 THEN
        score := score + 10;
    ELSIF (SELECT COUNT(*) FROM lead_interacoes WHERE lead_id = lead_uuid AND created_at >= NOW() - INTERVAL '7 days') > 0 THEN
        score := score + 5;
    END IF;

    -- Data prevista de fechamento próxima (5 pontos max)
    IF lead_data.data_prevista_fechamento IS NOT NULL AND lead_data.data_prevista_fechamento <= NOW() + INTERVAL '30 days' THEN
        score := score + 5;
    END IF;

    RETURN LEAST(score, 100); -- Max 100 pontos
END;
$$ LANGUAGE plpgsql;

-- 10. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE lead_historico IS 'Timeline completa de todas as ações e mudanças do lead';
COMMENT ON TABLE lead_followups IS 'Agendamento de follow-ups e lembretes para o lead';
COMMENT ON TABLE lead_notes IS 'Anotações rápidas e observações sobre o lead';
COMMENT ON TABLE lead_interacoes IS 'Registro de todas as interações (calls, emails, mensagens)';
COMMENT ON COLUMN leads.proxima_acao IS 'Data da próxima ação planejada com o lead';
COMMENT ON COLUMN leads.data_prevista_fechamento IS 'Quando o lead disse que vai fechar/decidir';
COMMENT ON COLUMN leads.motivo_nao_fechou IS 'Por que o lead não fechou (objeções, timing, etc.)';
COMMENT ON COLUMN leads.dor_principal IS 'Principal problema/dor que o lead quer resolver';
COMMENT ON COLUMN leads.urgencia_compra IS 'Quão urgente é a necessidade do lead';
COMMENT ON COLUMN leads.nivel_interesse IS 'Nível de interesse de 1-10';

-- 11. EXEMPLOS DE QUERIES ÚTEIS
/*
-- Leads que precisam de follow-up hoje
SELECT * FROM leads l
JOIN lead_followups lf ON l.id = lf.lead_id
WHERE lf.data_agendada::date = CURRENT_DATE
AND lf.status = 'pendente';

-- Leads quentes que não têm interação há mais de 3 dias
SELECT * FROM lead_dashboard
WHERE temperatura = 'quente'
AND dias_sem_interacao > 3;

-- Leads com fechamento previsto nos próximos 30 dias
SELECT * FROM leads
WHERE data_prevista_fechamento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY data_prevista_fechamento;

-- Top 10 leads por score
SELECT nome_completo, calcular_lead_score(id) as score
FROM leads
ORDER BY calcular_lead_score(id) DESC
LIMIT 10;
*/

-- 12. VERIFICAÇÃO FINAL
SELECT
    'SISTEMA DE TRACKING CRIADO' as status,
    (SELECT COUNT(*) FROM leads) as total_leads,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('lead_historico', 'lead_followups', 'lead_notes', 'lead_interacoes')) as tabelas_criadas;

COMMIT;