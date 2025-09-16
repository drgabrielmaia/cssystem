-- ===================================
-- 🚀 CUSTOMER SUCCESS - SETUP FINAL
-- ===================================
-- Script corrigido para funcionar perfeitamente

-- 🔧 Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 👥 TABELA: mentorados
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
CREATE TABLE IF NOT EXISTS formularios_respostas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    formulario VARCHAR(100) NOT NULL,
    resposta_json JSONB NOT NULL,
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📊 TABELA: checkins
CREATE TABLE IF NOT EXISTS checkins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_agendada TIMESTAMP WITH TIME ZONE NOT NULL,
    duracao_minutos INTEGER DEFAULT 60,
    status VARCHAR(20) NOT NULL CHECK (status IN ('agendado', 'confirmado', 'realizado', 'cancelado', 'reagendado')) DEFAULT 'agendado',
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('checkin', 'mentoria', 'follow-up', 'avaliacao')) DEFAULT 'checkin',
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
CREATE TABLE IF NOT EXISTS despesas_mensais (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
    ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🎯 TABELA: metas_objetivos
CREATE TABLE IF NOT EXISTS metas_objetivos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pendente', 'em_progresso', 'concluida', 'pausada', 'cancelada')) DEFAULT 'pendente',
    data_criacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_limite DATE,
    data_conclusao DATE,
    prioridade VARCHAR(10) NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')) DEFAULT 'media',
    progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📈 TABELA: metricas_negocio
CREATE TABLE IF NOT EXISTS metricas_negocio (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    tipo_metrica VARCHAR(100) NOT NULL,
    valor_atual DECIMAL(15,2) NOT NULL,
    valor_anterior DECIMAL(15,2),
    valor_meta DECIMAL(15,2),
    unidade VARCHAR(20) NOT NULL DEFAULT 'reais',
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🔔 TABELA: notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('info', 'sucesso', 'aviso', 'erro', 'lembrete')),
    lida BOOLEAN DEFAULT FALSE,
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_leitura TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📄 TABELA: documentos
CREATE TABLE IF NOT EXISTS documentos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_documento VARCHAR(100) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    url_arquivo TEXT NOT NULL,
    descricao TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 📊 TABELAS ESPECÍFICAS DE FORMULÁRIOS
-- ===================================

-- NPS Respostas
CREATE TABLE IF NOT EXISTS nps_respostas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    nota_nps INTEGER NOT NULL CHECK (nota_nps >= 0 AND nota_nps <= 10),
    o_que_surpreendeu_positivamente TEXT,
    autoriza_depoimento BOOLEAN,
    depoimento TEXT,
    o_que_faltou_para_9_10 TEXT,
    ajuste_simples_maior_impacto TEXT,
    o_que_impediu_experiencia_9_10 TEXT,
    o_que_mudar_para_melhorar TEXT,
    pode_contatar BOOLEAN,
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Módulo IV - Vendas
CREATE TABLE IF NOT EXISTS modulo_iv_vendas_respostas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    qualificacao_pacientes INTEGER NOT NULL CHECK (qualificacao_pacientes >= 1 AND qualificacao_pacientes <= 5),
    spin_selling TEXT NOT NULL CHECK (spin_selling IN ('sim', 'parcialmente', 'nao')),
    venda_consultiva TEXT NOT NULL CHECK (venda_consultiva IN ('sim', 'parcialmente', 'nao')),
    tecnica_ancoragem TEXT CHECK (tecnica_ancoragem IN ('sim', 'parcialmente', 'nao')),
    taxa_fechamento INTEGER CHECK (taxa_fechamento >= 1 AND taxa_fechamento <= 5),
    feedback_preco TEXT,
    nps INTEGER NOT NULL CHECK (nps >= 0 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Módulo III - Gestão e Marketing
CREATE TABLE IF NOT EXISTS modulo_iii_gestao_marketing_respostas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    jornada_paciente TEXT NOT NULL CHECK (jornada_paciente IN ('sim', 'parcialmente', 'nao')),
    modelo_disney TEXT NOT NULL CHECK (modelo_disney IN ('sim', 'parcialmente', 'nao')),
    neuromarketing TEXT NOT NULL CHECK (neuromarketing IN ('sim', 'parcialmente', 'nao')),
    reduzir_noshow INTEGER NOT NULL CHECK (reduzir_noshow >= 1 AND reduzir_noshow <= 5),
    estruturar_processos TEXT NOT NULL CHECK (estruturar_processos IN ('sim', 'parcialmente', 'nao')),
    feedback_operacao TEXT,
    nps INTEGER NOT NULL CHECK (nps >= 0 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 🔧 FUNÇÃO PARA ATUALIZAR updated_at
-- ===================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===================================
-- 🎯 TRIGGERS para updated_at
-- ===================================
CREATE TRIGGER update_mentorados_updated_at BEFORE UPDATE ON mentorados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON checkins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_despesas_mensais_updated_at BEFORE UPDATE ON despesas_mensais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metas_objetivos_updated_at BEFORE UPDATE ON metas_objetivos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metricas_negocio_updated_at BEFORE UPDATE ON metricas_negocio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON documentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 📊 ÍNDICES para performance
-- ===================================
CREATE INDEX IF NOT EXISTS idx_mentorados_turma ON mentorados(turma);
CREATE INDEX IF NOT EXISTS idx_mentorados_estado_atual ON mentorados(estado_atual);
CREATE INDEX IF NOT EXISTS idx_mentorados_email ON mentorados(email);
CREATE INDEX IF NOT EXISTS idx_checkins_mentorado_id ON checkins(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_checkins_data_agendada ON checkins(data_agendada);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
CREATE INDEX IF NOT EXISTS idx_formularios_mentorado_id ON formularios_respostas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_formularios_tipo ON formularios_respostas(formulario);
CREATE INDEX IF NOT EXISTS idx_metas_mentorado_id ON metas_objetivos(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_metas_status ON metas_objetivos(status);
CREATE INDEX IF NOT EXISTS idx_metricas_mentorado_id ON metricas_negocio(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_mentorado_id ON notificacoes(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_documentos_mentorado_id ON documentos(mentorado_id);

-- ===================================
-- 🔒 RLS (Row Level Security) - DESABILITADO para desenvolvimento
-- ===================================
ALTER TABLE mentorados DISABLE ROW LEVEL SECURITY;
ALTER TABLE checkins DISABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE despesas_mensais DISABLE ROW LEVEL SECURITY;
ALTER TABLE metas_objetivos DISABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_negocio DISABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE documentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE nps_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iv_vendas_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iii_gestao_marketing_respostas DISABLE ROW LEVEL SECURITY;

-- ===================================
-- ✅ SUCESSO!
-- ===================================
-- Schema criado com sucesso!
-- Agora você pode executar a aplicação que está configurada para usar nome_completo