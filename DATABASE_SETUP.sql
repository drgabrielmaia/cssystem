-- ===================================
-- 🚀 CUSTOMER SUCCESS - SCHEMA COMPLETO
-- ===================================
-- Script para criação completa do banco de dados
-- Execute este script no Supabase SQL Editor

-- 🔧 Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 👥 TABELA: mentorados
-- Armazena informações dos mentorados
CREATE TABLE IF NOT EXISTS mentorados (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    data_nascimento DATE,
    telefone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    endereco TEXT,
    crm VARCHAR(20),
    origem_conhecimento TEXT,
    data_inicio_mentoria DATE,
    turma VARCHAR(100) NOT NULL,
    estado_entrada VARCHAR(50) NOT NULL CHECK (estado_entrada IN ('novo', 'interessado', 'inscrito')),
    estado_atual VARCHAR(50) NOT NULL CHECK (estado_atual IN ('ativo', 'engajado', 'pausado', 'inativo', 'concluido')),
    data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📋 TABELA: formularios_respostas  
-- Armazena respostas dos formulários (NPS, Satisfação, etc.)
CREATE TABLE IF NOT EXISTS formularios_respostas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    formulario VARCHAR(50) NOT NULL CHECK (formulario IN ('nps', 'capacitacao', 'digital', 'gestao', 'vendas', 'satisfacao')),
    resposta_json JSONB NOT NULL,
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📅 TABELA: checkins
-- Acompanhamentos, reuniões e interações com mentorados
CREATE TABLE IF NOT EXISTS checkins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_agendada TIMESTAMP WITH TIME ZONE NOT NULL,
    duracao_minutos INTEGER DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'realizado', 'cancelado', 'reagendado')),
    tipo VARCHAR(20) NOT NULL DEFAULT 'checkin' CHECK (tipo IN ('checkin', 'mentoria', 'follow-up', 'avaliacao')),
    link_reuniao TEXT,
    notas_pre_reuniao TEXT,
    notas_pos_reuniao TEXT,
    objetivos TEXT[],
    resultados_alcancados TEXT[],
    proximos_passos TEXT[],
    nota_satisfacao INTEGER CHECK (nota_satisfacao >= 1 AND nota_satisfacao <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    cancelado_por VARCHAR(255),
    motivo_cancelamento TEXT,
    data_cancelamento TIMESTAMP WITH TIME ZONE
);

-- 💰 TABELA: despesas_mensais
-- Controle financeiro mensal dos mentorados
CREATE TABLE IF NOT EXISTS despesas_mensais (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    agosto DECIMAL(10,2) DEFAULT 0,
    setembro DECIMAL(10,2) DEFAULT 0,
    outubro DECIMAL(10,2) DEFAULT 0,
    novembro DECIMAL(10,2) DEFAULT 0,
    dezembro DECIMAL(10,2) DEFAULT 0,
    janeiro DECIMAL(10,2) DEFAULT 0,
    fevereiro DECIMAL(10,2) DEFAULT 0,
    marco DECIMAL(10,2) DEFAULT 0,
    abril DECIMAL(10,2) DEFAULT 0,
    maio DECIMAL(10,2) DEFAULT 0,
    junho DECIMAL(10,2) DEFAULT 0,
    julho DECIMAL(10,2) DEFAULT 0,
    ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🎯 TABELA: metas_objetivos
-- Metas e objetivos dos mentorados
CREATE TABLE IF NOT EXISTS metas_objetivos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50) CHECK (categoria IN ('financeiro', 'profissional', 'pessoal', 'tecnico')),
    prazo_final DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'pausado', 'cancelado')),
    progresso_percentual INTEGER DEFAULT 0 CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),
    valor_meta DECIMAL(15,2),
    valor_atual DECIMAL(15,2) DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📊 TABELA: metricas_negocio
-- Métricas de negócio dos mentorados
CREATE TABLE IF NOT EXISTS metricas_negocio (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    mes_referencia DATE NOT NULL,
    faturamento DECIMAL(15,2) DEFAULT 0,
    custos DECIMAL(15,2) DEFAULT 0,
    lucro DECIMAL(15,2) DEFAULT 0,
    clientes_novos INTEGER DEFAULT 0,
    clientes_perdidos INTEGER DEFAULT 0,
    ticket_medio DECIMAL(10,2) DEFAULT 0,
    taxa_conversao DECIMAL(5,2) DEFAULT 0,
    leads_gerados INTEGER DEFAULT 0,
    vendas_realizadas INTEGER DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mentorado_id, mes_referencia)
);

-- 🔔 TABELA: notificacoes
-- Sistema de notificações e alertas
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('info', 'warning', 'error', 'success')),
    categoria VARCHAR(50) CHECK (categoria IN ('formulario', 'checkin', 'meta', 'financeiro', 'sistema')),
    lida BOOLEAN DEFAULT FALSE,
    data_leitura TIMESTAMP WITH TIME ZONE,
    url_acao TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📝 TABELA: documentos
-- Documentos e arquivos dos mentorados
CREATE TABLE IF NOT EXISTS documentos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_documento VARCHAR(50) CHECK (tipo_documento IN ('contrato', 'certificado', 'relatorio', 'apresentacao', 'outros')),
    url_arquivo TEXT NOT NULL,
    tamanho_bytes BIGINT,
    tipo_mime VARCHAR(100),
    descricao TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by VARCHAR(255)
);

-- 🔄 ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_mentorados_email ON mentorados(email);
CREATE INDEX IF NOT EXISTS idx_mentorados_turma ON mentorados(turma);
CREATE INDEX IF NOT EXISTS idx_mentorados_estado ON mentorados(estado_atual);
CREATE INDEX IF NOT EXISTS idx_formularios_mentorado ON formularios_respostas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_formularios_tipo ON formularios_respostas(formulario);
CREATE INDEX IF NOT EXISTS idx_checkins_mentorado ON checkins(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_checkins_data ON checkins(data_agendada);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
CREATE INDEX IF NOT EXISTS idx_despesas_mentorado ON despesas_mensais(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_metas_mentorado ON metas_objetivos(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_metricas_mentorado ON metricas_negocio(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_metricas_mes ON metricas_negocio(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_notificacoes_mentorado ON notificacoes(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_documentos_mentorado ON documentos(mentorado_id);

-- 🔄 TRIGGERS para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers nas tabelas que têm updated_at
CREATE TRIGGER update_mentorados_updated_at BEFORE UPDATE ON mentorados 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON checkins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON despesas_mensais 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON metas_objetivos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_metricas_updated_at BEFORE UPDATE ON metricas_negocio 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 🔐 RLS (Row Level Security) - Comentado para permitir acesso total inicialmente
-- Descomente e configure conforme suas necessidades de segurança

-- ALTER TABLE mentorados ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE formularios_respostas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE despesas_mensais ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE metas_objetivos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE metricas_negocio ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- 📊 VIEWS úteis para relatórios
CREATE OR REPLACE VIEW view_mentorados_resumo AS
SELECT 
    m.id,
    m.nome_completo,
    m.email,
    m.turma,
    m.estado_atual,
    m.data_entrada,
    COUNT(DISTINCT c.id) as total_checkins,
    COUNT(DISTINCT fr.id) as total_formularios,
    COUNT(DISTINCT mo.id) as total_metas,
    COALESCE(AVG(CASE WHEN fr.formulario = 'nps' THEN (fr.resposta_json->>'respostas'->>'nota_nps')::numeric END), 0) as nps_medio
FROM mentorados m
LEFT JOIN checkins c ON m.id = c.mentorado_id
LEFT JOIN formularios_respostas fr ON m.id = fr.mentorado_id
LEFT JOIN metas_objetivos mo ON m.id = mo.mentorado_id
GROUP BY m.id, m.nome_completo, m.email, m.turma, m.estado_atual, m.data_entrada;

-- 📈 VIEW para dashboard de métricas
CREATE OR REPLACE VIEW view_dashboard_metricas AS
SELECT 
    COUNT(*) as total_mentorados,
    COUNT(CASE WHEN estado_atual = 'ativo' THEN 1 END) as mentorados_ativos,
    COUNT(CASE WHEN estado_atual = 'engajado' THEN 1 END) as mentorados_engajados,
    COUNT(CASE WHEN estado_atual = 'pausado' THEN 1 END) as mentorados_pausados,
    COUNT(CASE WHEN estado_atual = 'inativo' THEN 1 END) as mentorados_inativos,
    COUNT(CASE WHEN data_entrada >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as novos_ultimo_mes
FROM mentorados;

-- ✅ Verificação final
SELECT 'DATABASE SETUP COMPLETED! 🎉' as status;

-- 📝 INSTRUÇÕES DE USO:
-- 1. Execute este script completo no Supabase SQL Editor
-- 2. Configure as políticas RLS conforme necessário
-- 3. Ajuste as permissões de acesso às tabelas
-- 4. Teste a aplicação conectando ao banco

COMMENT ON TABLE mentorados IS 'Tabela principal dos mentorados do programa';
COMMENT ON TABLE formularios_respostas IS 'Respostas dos formulários (NPS, satisfação, etc.)';
COMMENT ON TABLE checkins IS 'Acompanhamentos e reuniões com mentorados';
COMMENT ON TABLE despesas_mensais IS 'Controle financeiro mensal';
COMMENT ON TABLE metas_objetivos IS 'Metas e objetivos dos mentorados';
COMMENT ON TABLE metricas_negocio IS 'Métricas de performance do negócio';
COMMENT ON TABLE notificacoes IS 'Sistema de notificações e alertas';
COMMENT ON TABLE documentos IS 'Documentos e arquivos dos mentorados';