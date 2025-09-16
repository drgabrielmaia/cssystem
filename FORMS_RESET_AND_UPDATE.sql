-- ========================================
-- 🔄 FORMS RESET AND UPDATE
-- ========================================
-- Script para limpar e recriar todas as tabelas de formulários
-- com os campos corretos e dados atualizados

-- 🗑️ DROPAR TODAS AS TABELAS DE FORMULÁRIOS EXISTENTES
DROP TABLE IF EXISTS nps_respostas CASCADE;
DROP TABLE IF EXISTS modulo_iv_vendas_respostas CASCADE;
DROP TABLE IF EXISTS modulo_iii_gestao_marketing_respostas CASCADE;
DROP TABLE IF EXISTS modulo_ii_posicionamento_digital_respostas CASCADE;
DROP TABLE IF EXISTS modulo_capacitacao_tecnica_respostas CASCADE;

-- 🧹 LIMPAR DADOS ANTIGOS DA TABELA GENÉRICA
DELETE FROM formularios_respostas
WHERE formulario IN (
    'nps_geral',
    'modulo_iv_vendas',
    'modulo_iii_gestao_marketing',
    'modulo_ii_posicionamento_digital',
    'modulo_capacitacao_tecnica',
    'digital',
    'vendas',
    'gestao',
    'capacitacao',
    'capacitacao-tecnica',
    'posicionamento-digital'
);

-- 📊 RECRIAR TABELA NPS
CREATE TABLE nps_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    nota_nps INTEGER NOT NULL CHECK (nota_nps >= 1 AND nota_nps <= 10),
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

-- 💰 RECRIAR TABELA MÓDULO IV - VENDAS
CREATE TABLE modulo_iv_vendas_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    qualificacao_pacientes INTEGER NOT NULL CHECK (qualificacao_pacientes >= 1 AND qualificacao_pacientes <= 5),
    spin_selling TEXT NOT NULL CHECK (spin_selling IN ('sim', 'parcialmente', 'nao')),
    venda_consultiva TEXT NOT NULL CHECK (venda_consultiva IN ('sim', 'parcialmente', 'nao')),
    tecnica_ancoragem TEXT CHECK (tecnica_ancoragem IN ('sim', 'parcialmente', 'nao')),
    taxa_fechamento INTEGER CHECK (taxa_fechamento >= 1 AND taxa_fechamento <= 5),
    feedback_preco TEXT,
    nps INTEGER NOT NULL CHECK (nps >= 1 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🎯 RECRIAR TABELA MÓDULO III - GESTÃO E MARKETING
CREATE TABLE modulo_iii_gestao_marketing_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    jornada_paciente TEXT NOT NULL CHECK (jornada_paciente IN ('sim', 'parcialmente', 'nao')),
    modelo_disney TEXT NOT NULL CHECK (modelo_disney IN ('sim', 'parcialmente', 'nao')),
    neuromarketing TEXT NOT NULL CHECK (neuromarketing IN ('sim', 'parcialmente', 'nao')),
    reduzir_noshow INTEGER NOT NULL CHECK (reduzir_noshow >= 1 AND reduzir_noshow <= 5),
    estruturar_processos TEXT NOT NULL CHECK (estruturar_processos IN ('sim', 'parcialmente', 'nao')),
    feedback_operacao TEXT,
    nps INTEGER NOT NULL CHECK (nps >= 1 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🚀 RECRIAR TABELA MÓDULO II - POSICIONAMENTO DIGITAL (ATUALIZADA)
CREATE TABLE modulo_ii_posicionamento_digital_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    proposta_valor INTEGER NOT NULL CHECK (proposta_valor >= 1 AND proposta_valor <= 5),
    bio_cta INTEGER NOT NULL CHECK (bio_cta >= 1 AND bio_cta <= 5),
    funil_editorial TEXT NOT NULL CHECK (funil_editorial IN ('sim', 'nao')),
    formatos_aprendidos TEXT NOT NULL, -- Campo texto livre para formatos
    confianca_publicar INTEGER NOT NULL CHECK (confianca_publicar >= 1 AND confianca_publicar <= 5),
    bloqueio_consistencia TEXT NOT NULL,
    nps INTEGER NOT NULL CHECK (nps >= 1 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🔬 RECRIAR TABELA MÓDULO CAPACITAÇÃO TÉCNICA (ATUALIZADA)
CREATE TABLE modulo_capacitacao_tecnica_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    clareza_tratamentos INTEGER NOT NULL CHECK (clareza_tratamentos >= 1 AND clareza_tratamentos <= 5),
    nivel_seguranca INTEGER NOT NULL CHECK (nivel_seguranca >= 1 AND nivel_seguranca <= 5),
    parte_tecnica_mais_ajudou TEXT NOT NULL, -- Campo texto livre
    faltou_seguranca TEXT NOT NULL,
    barreira_implementar TEXT NOT NULL,
    nps INTEGER NOT NULL CHECK (nps >= 1 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📈 CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_nps_mentorado_id ON nps_respostas(mentorado_id);
CREATE INDEX idx_nps_nota ON nps_respostas(nota_nps);
CREATE INDEX idx_nps_data_resposta ON nps_respostas(data_resposta);

CREATE INDEX idx_modulo_iv_mentorado_id ON modulo_iv_vendas_respostas(mentorado_id);
CREATE INDEX idx_modulo_iv_data_resposta ON modulo_iv_vendas_respostas(data_resposta);
CREATE INDEX idx_modulo_iv_nps ON modulo_iv_vendas_respostas(nps);

CREATE INDEX idx_modulo_iii_mentorado_id ON modulo_iii_gestao_marketing_respostas(mentorado_id);
CREATE INDEX idx_modulo_iii_data_resposta ON modulo_iii_gestao_marketing_respostas(data_resposta);
CREATE INDEX idx_modulo_iii_nps ON modulo_iii_gestao_marketing_respostas(nps);

CREATE INDEX idx_modulo_ii_mentorado_id ON modulo_ii_posicionamento_digital_respostas(mentorado_id);
CREATE INDEX idx_modulo_ii_data_resposta ON modulo_ii_posicionamento_digital_respostas(data_resposta);
CREATE INDEX idx_modulo_ii_nps ON modulo_ii_posicionamento_digital_respostas(nps);

CREATE INDEX idx_capacitacao_mentorado_id ON modulo_capacitacao_tecnica_respostas(mentorado_id);
CREATE INDEX idx_capacitacao_data_resposta ON modulo_capacitacao_tecnica_respostas(data_resposta);
CREATE INDEX idx_capacitacao_nps ON modulo_capacitacao_tecnica_respostas(nps);

-- 🔒 CONFIGURAR RLS (ROW LEVEL SECURITY)
ALTER TABLE nps_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iv_vendas_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iii_gestao_marketing_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_ii_posicionamento_digital_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_capacitacao_tecnica_respostas ENABLE ROW LEVEL SECURITY;

-- 🛡️ CRIAR POLÍTICAS DE SEGURANÇA
CREATE POLICY "Permitir tudo para usuarios autenticados nps"
    ON nps_respostas FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Permitir tudo para usuarios autenticados modulo_iv"
    ON modulo_iv_vendas_respostas FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Permitir tudo para usuarios autenticados modulo_iii"
    ON modulo_iii_gestao_marketing_respostas FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Permitir tudo para usuarios autenticados modulo_ii"
    ON modulo_ii_posicionamento_digital_respostas FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Permitir tudo para usuarios autenticados capacitacao"
    ON modulo_capacitacao_tecnica_respostas FOR ALL
    TO authenticated
    USING (true);

-- ✅ SCRIPT CONCLUÍDO
--
-- 🔄 PRINCIPAIS MUDANÇAS:
-- • NPS agora vai de 1-10 (não mais 0-10)
-- • Campo 'formatos_aprendidos' agora é texto livre
-- • Campo 'parte_tecnica_mais_ajudou' agora é texto livre
-- • Todas as tabelas foram limpas e recriadas
-- • Dados antigos foram removidos da tabela genérica
--
-- ⚠️  ATENÇÃO: Este script remove todos os dados existentes!
-- Faça backup antes de executar em produção.