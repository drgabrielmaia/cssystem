-- ========================================
-- SISTEMA DE AGENDAMENTO TIPO CALENDLY
-- ========================================

-- 1. Tabela de configurações de agenda
CREATE TABLE IF NOT EXISTS agenda_configuracoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL DEFAULT 'Agenda Principal',
    descricao TEXT,
    duracao_minutos INTEGER NOT NULL DEFAULT 60,
    buffer_antes_minutos INTEGER DEFAULT 15,
    buffer_depois_minutos INTEGER DEFAULT 15,
    horario_inicio TIME NOT NULL DEFAULT '08:00:00',
    horario_fim TIME NOT NULL DEFAULT '18:00:00',
    dias_semana INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- 0=Dom, 1=Seg, 2=Ter, etc
    antecedencia_minima_horas INTEGER DEFAULT 24,
    antecedencia_maxima_dias INTEGER DEFAULT 60,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    cor_tema VARCHAR(7) DEFAULT '#059669',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de bloqueios/indisponibilidades
CREATE TABLE IF NOT EXISTS agenda_bloqueios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agenda_id UUID REFERENCES agenda_configuracoes(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('bloqueio', 'feriado', 'ferias', 'compromisso')),
    recorrente BOOLEAN DEFAULT false,
    regra_recorrencia JSONB, -- {type: 'weekly', days: [1,2,3], until: '2024-12-31'}
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agenda_id UUID REFERENCES agenda_configuracoes(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE SET NULL,

    -- Informações do agendamento
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    data_agendada TIMESTAMP WITH TIME ZONE NOT NULL,
    duracao_minutos INTEGER NOT NULL DEFAULT 60,

    -- Informações de contato (para agendamentos externos)
    nome_completo VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),
    objetivo_call TEXT,

    -- Status e controle
    status VARCHAR(50) NOT NULL CHECK (
        status IN ('agendado', 'confirmado', 'reagendado', 'cancelado', 'concluido', 'no_show')
    ) DEFAULT 'agendado',

    -- Links e tokens
    token_agendamento VARCHAR(100) UNIQUE NOT NULL,
    link_meet VARCHAR(500),
    link_cancelamento VARCHAR(500),
    link_reagendamento VARCHAR(500),

    -- Notificações
    notificacao_enviada BOOLEAN DEFAULT false,
    lembrete_enviado BOOLEAN DEFAULT false,

    -- Metadados
    origem VARCHAR(100), -- 'lead', 'mentorado', 'publico'
    user_agent TEXT,
    ip_address INET,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by VARCHAR(200),
    motivo_cancelamento TEXT
);

-- 4. Tabela de slots de horários personalizados (para casos especiais)
CREATE TABLE IF NOT EXISTS agenda_slots_customizados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agenda_id UUID REFERENCES agenda_configuracoes(id) ON DELETE CASCADE,
    data_slot DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    disponivel BOOLEAN DEFAULT true,
    motivo VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de templates de mensagem
CREATE TABLE IF NOT EXISTS agenda_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL CHECK (
        tipo IN ('confirmacao', 'lembrete', 'reagendamento', 'cancelamento')
    ),
    titulo VARCHAR(200) NOT NULL,
    assunto VARCHAR(300),
    conteudo TEXT NOT NULL,
    variaveis JSONB, -- Lista de variáveis disponíveis como {nome}, {data}, {horario}
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de histórico de notificações
CREATE TABLE IF NOT EXISTS agenda_notificacoes_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'email', 'whatsapp', 'sms'
    template_id UUID REFERENCES agenda_templates(id) ON DELETE SET NULL,
    destinatario VARCHAR(200) NOT NULL,
    assunto VARCHAR(300),
    conteudo TEXT,
    status VARCHAR(50) NOT NULL CHECK (
        status IN ('pendente', 'enviado', 'entregue', 'falha', 'bounce')
    ) DEFAULT 'pendente',
    erro_detalhes TEXT,
    tentativas INTEGER DEFAULT 0,
    enviado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de links personalizados para cada lead/mentorado
CREATE TABLE IF NOT EXISTS agenda_links_personalizados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agenda_id UUID REFERENCES agenda_configuracoes(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,

    token_link VARCHAR(100) UNIQUE NOT NULL,
    slug_personalizado VARCHAR(100) UNIQUE, -- Ex: 'call-joao-silva'

    titulo_customizado VARCHAR(200),
    descricao_customizada TEXT,
    duracao_customizada INTEGER,

    ativo BOOLEAN DEFAULT true,
    expira_em TIMESTAMP WITH TIME ZONE,

    -- Estatísticas
    total_visualizacoes INTEGER DEFAULT 0,
    total_agendamentos INTEGER DEFAULT 0,
    ultimo_acesso TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint: deve ter lead_id OU mentorado_id, mas não ambos
    CONSTRAINT agenda_links_lead_ou_mentorado
        CHECK ((lead_id IS NOT NULL AND mentorado_id IS NULL) OR
               (lead_id IS NULL AND mentorado_id IS NOT NULL))
);

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_agendada ON agendamentos(data_agendada);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_lead_id ON agendamentos(lead_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_mentorado_id ON agendamentos(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_token ON agendamentos(token_agendamento);
CREATE INDEX IF NOT EXISTS idx_agenda_bloqueios_data ON agenda_bloqueios(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_agenda_links_token ON agenda_links_personalizados(token_link);
CREATE INDEX IF NOT EXISTS idx_agenda_links_slug ON agenda_links_personalizados(slug_personalizado);

-- 9. Funções para geração automática de tokens e links
CREATE OR REPLACE FUNCTION gerar_token_agendamento()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token_agendamento IS NULL OR NEW.token_agendamento = '' THEN
        NEW.token_agendamento = encode(gen_random_bytes(32), 'hex');
    END IF;

    -- Gerar links automaticamente
    IF NEW.link_cancelamento IS NULL THEN
        NEW.link_cancelamento = format('/agenda/cancelar/%s', NEW.token_agendamento);
    END IF;

    IF NEW.link_reagendamento IS NULL THEN
        NEW.link_reagendamento = format('/agenda/reagendar/%s', NEW.token_agendamento);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gerar_token_link_personalizado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token_link IS NULL OR NEW.token_link = '' THEN
        NEW.token_link = encode(gen_random_bytes(16), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Criar triggers
CREATE TRIGGER trigger_gerar_token_agendamento
    BEFORE INSERT ON agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION gerar_token_agendamento();

CREATE TRIGGER trigger_gerar_token_link
    BEFORE INSERT ON agenda_links_personalizados
    FOR EACH ROW
    EXECUTE FUNCTION gerar_token_link_personalizado();

CREATE TRIGGER trigger_agendamentos_updated_at
    BEFORE UPDATE ON agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_agenda_configuracoes_updated_at
    BEFORE UPDATE ON agenda_configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Views para relatórios
CREATE OR REPLACE VIEW view_agendamentos_completos AS
SELECT
    a.*,
    l.nome_completo as lead_nome,
    l.email as lead_email,
    l.telefone as lead_telefone,
    m.nome as mentorado_nome,
    m.email as mentorado_email,
    ac.nome as agenda_nome,
    ac.cor_tema
FROM agendamentos a
LEFT JOIN leads l ON a.lead_id = l.id
LEFT JOIN mentorados m ON a.mentorado_id = m.id
LEFT JOIN agenda_configuracoes ac ON a.agenda_id = ac.id;

CREATE OR REPLACE VIEW view_agenda_estatisticas AS
SELECT
    DATE(data_agendada) as data,
    COUNT(*) as total_agendamentos,
    COUNT(*) FILTER (WHERE status = 'agendado') as agendados,
    COUNT(*) FILTER (WHERE status = 'confirmado') as confirmados,
    COUNT(*) FILTER (WHERE status = 'concluido') as concluidos,
    COUNT(*) FILTER (WHERE status = 'cancelado') as cancelados,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
    ROUND(AVG(duracao_minutos), 2) as duracao_media
FROM agendamentos
WHERE data_agendada >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(data_agendada)
ORDER BY data DESC;

-- 13. Inserir configuração padrão
INSERT INTO agenda_configuracoes (
    nome,
    descricao,
    duracao_minutos,
    horario_inicio,
    horario_fim,
    dias_semana,
    antecedencia_minima_horas
) VALUES (
    'Reuniões de Negócios',
    'Agendamento de calls comerciais e reuniões estratégicas',
    60,
    '08:00:00',
    '18:00:00',
    ARRAY[1,2,3,4,5], -- Segunda a Sexta
    24
) ON CONFLICT DO NOTHING;

-- 14. Inserir templates padrão
INSERT INTO agenda_templates (tipo, titulo, assunto, conteudo, variaveis) VALUES
('confirmacao',
 'Confirmação de Agendamento',
 'Sua reunião foi agendada - {data} às {horario}',
 'Olá {nome}!

Sua reunião foi agendada com sucesso:

📅 Data: {data}
⏰ Horário: {horario}
⏱️ Duração: {duracao} minutos
🎯 Objetivo: {objetivo}

Detalhes da reunião:
- Link para a call: {link_meet}
- Caso precise cancelar: {link_cancelamento}
- Para reagendar: {link_reagendamento}

Estamos ansiosos para nossa conversa!

Atenciosamente,
Equipe Customer Success',
 '["nome", "data", "horario", "duracao", "objetivo", "link_meet", "link_cancelamento", "link_reagendamento"]'::jsonb),

('lembrete',
 'Lembrete de Reunião - Amanhã',
 'Lembrete: Reunião amanhã às {horario}',
 'Olá {nome}!

Este é um lembrete de que você tem uma reunião agendada:

📅 Data: {data} (amanhã)
⏰ Horário: {horario}
⏱️ Duração: {duracao} minutos

Link da reunião: {link_meet}

Nos vemos lá!

Atenciosamente,
Equipe Customer Success',
 '["nome", "data", "horario", "duracao", "link_meet"]'::jsonb),

('cancelamento',
 'Reunião Cancelada',
 'Sua reunião do dia {data} foi cancelada',
 'Olá {nome},

Informamos que sua reunião agendada para o dia {data} às {horario} foi cancelada.

Motivo: {motivo}

Para agendar uma nova reunião, acesse: {link_reagendamento}

Atenciosamente,
Equipe Customer Success',
 '["nome", "data", "horario", "motivo", "link_reagendamento"]'::jsonb)

ON CONFLICT DO NOTHING;

-- 15. Desabilitar RLS para desenvolvimento
ALTER TABLE agenda_configuracoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_bloqueios DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_slots_customizados DISABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_notificacoes_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_links_personalizados DISABLE ROW LEVEL SECURITY;

-- 16. Comentários
COMMENT ON TABLE agenda_configuracoes IS 'Configurações gerais da agenda (horários, dias disponíveis, etc.)';
COMMENT ON TABLE agenda_bloqueios IS 'Bloqueios e indisponibilidades na agenda';
COMMENT ON TABLE agendamentos IS 'Agendamentos realizados pelos leads/mentorados';
COMMENT ON TABLE agenda_links_personalizados IS 'Links personalizados para cada lead/mentorado';
COMMENT ON TABLE agenda_templates IS 'Templates de mensagens para notificações';

SELECT 'Sistema de agendamento tipo Calendly criado com sucesso!' as status;