-- =====================================================
-- SISTEMA APRIMORADO DE TRACKING DE MENTORADOS
-- Sistema completo para acompanhar evolução e feedback dos mentorados
-- =====================================================

BEGIN;

-- 1. ESTENDER TABELA MENTORADOS COM CAMPOS DETALHADOS
DO $$
BEGIN
    -- Adicionar campos específicos para tracking avançado
    ALTER TABLE public.mentorados 
    ADD COLUMN IF NOT EXISTS data_inicio_mentoria DATE,
    ADD COLUMN IF NOT EXISTS nivel_experiencia VARCHAR(50) DEFAULT 'iniciante' CHECK (nivel_experiencia IN ('iniciante', 'intermediario', 'avancado')),
    ADD COLUMN IF NOT EXISTS area_atuacao VARCHAR(100),
    ADD COLUMN IF NOT EXISTS faturamento_inicial DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS faturamento_meta DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS status_mentoria VARCHAR(50) DEFAULT 'ativo' CHECK (status_mentoria IN ('ativo', 'pausado', 'concluido', 'cancelado')),
    ADD COLUMN IF NOT EXISTS score_engajamento INTEGER DEFAULT 0 CHECK (score_engajamento >= 0 AND score_engajamento <= 100),
    ADD COLUMN IF NOT EXISTS ultima_atividade TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS dados_pessoais JSONB DEFAULT '{}'::jsonb;

    RAISE NOTICE 'Campos adicionados à tabela mentorados';
END $$;

-- 2. CRIAR TABELA DE EVOLUÇÃO FINANCEIRA
CREATE TABLE IF NOT EXISTS public.mentorado_evolucao_financeira (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Período de referência
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    
    -- Métricas financeiras
    faturamento_bruto DECIMAL(12,2) DEFAULT 0,
    faturamento_liquido DECIMAL(12,2) DEFAULT 0,
    despesas_totais DECIMAL(12,2) DEFAULT 0,
    lucro_liquido DECIMAL(12,2) DEFAULT 0,
    margem_lucro DECIMAL(5,2) DEFAULT 0,
    
    -- Métricas de negócio
    num_clientes INTEGER DEFAULT 0,
    ticket_medio DECIMAL(10,2) DEFAULT 0,
    novos_clientes INTEGER DEFAULT 0,
    clientes_perdidos INTEGER DEFAULT 0,
    
    -- Produtos/serviços
    principais_produtos JSONB DEFAULT '[]'::jsonb,
    canais_venda JSONB DEFAULT '[]'::jsonb,
    
    -- Comparação com período anterior
    crescimento_faturamento DECIMAL(5,2) DEFAULT 0,
    crescimento_clientes DECIMAL(5,2) DEFAULT 0,
    
    -- Observações do período
    principais_conquistas TEXT,
    maiores_desafios TEXT,
    acoes_implementadas TEXT,
    resultados_acoes TEXT,
    
    -- Status
    dados_verificados BOOLEAN DEFAULT false,
    verificado_por UUID REFERENCES auth.users(id),
    data_verificacao TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas
    UNIQUE(mentorado_id, ano, mes)
);

-- 3. CRIAR TABELA DE FEEDBACKS E AVALIAÇÕES
CREATE TABLE IF NOT EXISTS public.mentorado_feedbacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Tipo de feedback
    tipo_feedback VARCHAR(50) NOT NULL CHECK (tipo_feedback IN (
        'mensal', 'trimestral', 'semestral', 'anual', 'espontaneo', 'saida'
    )),
    
    -- Data do feedback
    data_feedback DATE NOT NULL,
    periodo_referencia_inicio DATE,
    periodo_referencia_fim DATE,
    
    -- Avaliação da Mentoria
    nota_geral INTEGER CHECK (nota_geral >= 1 AND nota_geral <= 10),
    nota_conteudo INTEGER CHECK (nota_conteudo >= 1 AND nota_conteudo <= 10),
    nota_suporte INTEGER CHECK (nota_suporte >= 1 AND nota_suporte <= 10),
    nota_comunidade INTEGER CHECK (nota_comunidade >= 1 AND nota_comunidade <= 10),
    
    -- Progresso e Resultados
    tempo_mentoria VARCHAR(50), -- quanto tempo está na mentoria
    maior_conquista TEXT,
    principal_dificuldade TEXT,
    expectativas_futuras TEXT,
    objetivos_proximos_meses TEXT,
    
    -- Evolução Pessoal
    nivel_confianca_antes INTEGER CHECK (nivel_confianca_antes >= 1 AND nivel_confianca_antes <= 10),
    nivel_confianca_atual INTEGER CHECK (nivel_confianca_atual >= 1 AND nivel_confianca_atual <= 10),
    principais_aprendizados TEXT,
    habilidades_desenvolvidas TEXT[],
    
    -- Recomendação
    recomendaria_mentoria BOOLEAN,
    motivo_recomendacao TEXT,
    nota_nps INTEGER CHECK (nota_nps >= 0 AND nota_nps <= 10), -- Net Promoter Score
    
    -- Feedback sobre o Mentor
    qualidade_mentoria INTEGER CHECK (qualidade_mentoria >= 1 AND qualidade_mentoria <= 10),
    disponibilidade_mentor INTEGER CHECK (disponibilidade_mentor >= 1 AND disponibilidade_mentor <= 10),
    clareza_orientacoes INTEGER CHECK (clareza_orientacoes >= 1 AND clareza_orientacoes <= 10),
    
    -- Sugestões de Melhoria
    sugestoes_melhoria TEXT,
    recursos_adicionais_desejados TEXT,
    areas_maior_dificuldade TEXT[],
    
    -- Planos Futuros
    pretende_continuar BOOLEAN,
    interesse_novos_programas BOOLEAN,
    areas_interesse_futuro TEXT[],
    
    -- Metadados
    respondido_anonimamente BOOLEAN DEFAULT false,
    tempo_resposta_minutos INTEGER,
    dispositivo_resposta VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CRIAR TABELA DE ATIVIDADES E ENGAJAMENTO
CREATE TABLE IF NOT EXISTS public.mentorado_atividades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Tipo de atividade
    tipo_atividade VARCHAR(50) NOT NULL CHECK (tipo_atividade IN (
        'login_plataforma', 'aula_assistida', 'material_baixado', 'exercicio_completado',
        'participacao_comunidade', 'mentoria_individual', 'grupo_mentoria', 'evento_participacao',
        'duvida_enviada', 'feedback_dado', 'meta_definida', 'meta_alcancada'
    )),
    
    -- Dados da atividade
    data_atividade TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duracao_minutos INTEGER,
    
    -- Detalhes específicos
    modulo_curso VARCHAR(255),
    aula_titulo VARCHAR(255),
    progresso_percentual DECIMAL(5,2),
    
    -- Engajamento
    nivel_engajamento INTEGER CHECK (nivel_engajamento >= 1 AND nivel_engajamento <= 5),
    qualidade_participacao VARCHAR(50), -- 'baixa', 'media', 'alta'
    
    -- Resultados/Feedback
    nota_atividade INTEGER CHECK (nota_atividade >= 1 AND nota_atividade <= 5),
    comentario_atividade TEXT,
    dificuldades_encontradas TEXT,
    
    -- Metadados
    dispositivo_utilizado VARCHAR(50),
    tempo_sessao_minutos INTEGER,
    ip_address VARCHAR(45),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CRIAR TABELA DE METAS E OBJETIVOS
CREATE TABLE IF NOT EXISTS public.mentorado_metas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Dados da meta
    titulo_meta VARCHAR(255) NOT NULL,
    descricao_meta TEXT,
    categoria_meta VARCHAR(100), -- 'financeira', 'pessoal', 'profissional', 'negocio'
    
    -- Cronograma
    data_criacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_inicio DATE,
    data_fim_planejada DATE,
    data_fim_real DATE,
    
    -- Valores/Métricas
    valor_inicial DECIMAL(12,2),
    valor_meta DECIMAL(12,2),
    valor_atual DECIMAL(12,2),
    unidade_medida VARCHAR(50), -- 'reais', 'clientes', 'produtos', 'percentual', etc.
    
    -- Status
    status VARCHAR(50) DEFAULT 'em_andamento' CHECK (status IN (
        'planejada', 'em_andamento', 'pausada', 'concluida', 'cancelada', 'nao_alcancada'
    )),
    percentual_conclusao DECIMAL(5,2) DEFAULT 0,
    
    -- Acompanhamento
    marcos_intermediarios JSONB DEFAULT '[]'::jsonb,
    acoes_necessarias TEXT,
    obstaculos_identificados TEXT,
    recursos_necessarios TEXT,
    
    -- Resultados
    resultado_alcancado TEXT,
    licoes_aprendidas TEXT,
    
    -- Apoio da mentoria
    suporte_recebido TEXT,
    mentor_responsavel UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CRIAR TABELA DE INTERAÇÕES COM MENTORES
CREATE TABLE IF NOT EXISTS public.mentorado_interacoes_mentor (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Tipo da interação
    tipo_interacao VARCHAR(50) NOT NULL CHECK (tipo_interacao IN (
        'mentoria_individual', 'grupo_mentoria', 'duvida_chat', 'call_emergencia',
        'revisao_progresso', 'definicao_metas', 'feedback_performance', 'orientacao_estrategica'
    )),
    
    -- Dados da interação
    data_interacao TIMESTAMPTZ NOT NULL,
    duracao_minutos INTEGER,
    canal VARCHAR(50), -- 'presencial', 'zoom', 'whatsapp', 'chat_plataforma'
    
    -- Conteúdo
    topicos_abordados TEXT[],
    resumo_interacao TEXT NOT NULL,
    duvidas_esclarecidas TEXT,
    orientacoes_dadas TEXT,
    
    -- Próximos passos
    proximos_passos TEXT,
    data_proximo_followup DATE,
    
    -- Avaliação
    avaliacao_mentorado INTEGER CHECK (avaliacao_mentorado >= 1 AND avaliacao_mentorado <= 5),
    avaliacao_mentor INTEGER CHECK (avaliacao_mentor >= 1 AND avaliacao_mentor <= 5),
    comentario_mentorado TEXT,
    comentario_mentor TEXT,
    
    -- Anexos e materiais
    materiais_compartilhados JSONB DEFAULT '[]'::jsonb,
    gravacao_disponivel BOOLEAN DEFAULT false,
    gravacao_url VARCHAR(500),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CRIAR TABELA DE MARCOS E CONQUISTAS
CREATE TABLE IF NOT EXISTS public.mentorado_conquistas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Dados da conquista
    titulo_conquista VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100), -- 'financeira', 'pessoal', 'profissional', 'reconhecimento'
    
    -- Data e contexto
    data_conquista DATE NOT NULL,
    contexto_conquista TEXT,
    desafios_superados TEXT,
    
    -- Valor/Impacto
    valor_numerico DECIMAL(12,2),
    unidade_medida VARCHAR(50),
    impacto_negocio TEXT,
    impacto_pessoal TEXT,
    
    -- Reconhecimento
    publicamente_reconhecida BOOLEAN DEFAULT false,
    compartilhada_comunidade BOOLEAN DEFAULT false,
    certificacao_relacionada VARCHAR(255),
    
    -- Mentoria
    contribuicao_mentoria TEXT,
    mentor_envolvido UUID REFERENCES auth.users(id),
    
    -- Comprovação
    evidencias_urls JSONB DEFAULT '[]'::jsonb,
    testemunhos JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_mentorado_evolucao_mentorado_id ON public.mentorado_evolucao_financeira(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_mentorado_evolucao_periodo ON public.mentorado_evolucao_financeira(ano DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_mentorado_evolucao_faturamento ON public.mentorado_evolucao_financeira(faturamento_bruto DESC);

CREATE INDEX IF NOT EXISTS idx_mentorado_feedbacks_mentorado_id ON public.mentorado_feedbacks(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_mentorado_feedbacks_data ON public.mentorado_feedbacks(data_feedback DESC);
CREATE INDEX IF NOT EXISTS idx_mentorado_feedbacks_tipo ON public.mentorado_feedbacks(tipo_feedback);
CREATE INDEX IF NOT EXISTS idx_mentorado_feedbacks_nps ON public.mentorado_feedbacks(nota_nps DESC);

CREATE INDEX IF NOT EXISTS idx_mentorado_atividades_mentorado_id ON public.mentorado_atividades(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_mentorado_atividades_data ON public.mentorado_atividades(data_atividade DESC);
CREATE INDEX IF NOT EXISTS idx_mentorado_atividades_tipo ON public.mentorado_atividades(tipo_atividade);

CREATE INDEX IF NOT EXISTS idx_mentorado_metas_mentorado_id ON public.mentorado_metas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_mentorado_metas_status ON public.mentorado_metas(status);
CREATE INDEX IF NOT EXISTS idx_mentorado_metas_data_fim ON public.mentorado_metas(data_fim_planejada);

CREATE INDEX IF NOT EXISTS idx_mentorado_interacoes_mentorado_id ON public.mentorado_interacoes_mentor(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_mentorado_interacoes_mentor_id ON public.mentorado_interacoes_mentor(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorado_interacoes_data ON public.mentorado_interacoes_mentor(data_interacao DESC);

CREATE INDEX IF NOT EXISTS idx_mentorado_conquistas_mentorado_id ON public.mentorado_conquistas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_mentorado_conquistas_data ON public.mentorado_conquistas(data_conquista DESC);
CREATE INDEX IF NOT EXISTS idx_mentorado_conquistas_categoria ON public.mentorado_conquistas(categoria);

-- 9. CRIAR TRIGGERS PARA UPDATED_AT
CREATE TRIGGER update_mentorado_evolucao_updated_at 
    BEFORE UPDATE ON public.mentorado_evolucao_financeira
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentorado_feedbacks_updated_at 
    BEFORE UPDATE ON public.mentorado_feedbacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentorado_metas_updated_at 
    BEFORE UPDATE ON public.mentorado_metas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. FUNÇÃO PARA CALCULAR SCORE DE ENGAJAMENTO
CREATE OR REPLACE FUNCTION calculate_mentorado_engagement_score(p_mentorado_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_atividades_mes INTEGER;
    v_ultima_atividade INTERVAL;
    v_metas_ativas INTEGER;
    v_feedback_recente BOOLEAN;
    v_progressao_financeira DECIMAL;
BEGIN
    -- Atividades no último mês
    SELECT COUNT(*) INTO v_atividades_mes
    FROM mentorado_atividades
    WHERE mentorado_id = p_mentorado_id
    AND data_atividade >= NOW() - INTERVAL '30 days';
    
    -- Pontuação baseada em atividade (máximo 30 pontos)
    v_score := v_score + LEAST(v_atividades_mes * 2, 30);
    
    -- Última atividade
    SELECT NOW() - MAX(data_atividade) INTO v_ultima_atividade
    FROM mentorado_atividades
    WHERE mentorado_id = p_mentorado_id;
    
    -- Penalização por inatividade
    IF v_ultima_atividade IS NOT NULL THEN
        IF v_ultima_atividade < INTERVAL '7 days' THEN
            v_score := v_score + 20;
        ELSIF v_ultima_atividade < INTERVAL '30 days' THEN
            v_score := v_score + 10;
        END IF;
    END IF;
    
    -- Metas ativas (máximo 20 pontos)
    SELECT COUNT(*) INTO v_metas_ativas
    FROM mentorado_metas
    WHERE mentorado_id = p_mentorado_id
    AND status IN ('em_andamento', 'planejada');
    
    v_score := v_score + LEAST(v_metas_ativas * 5, 20);
    
    -- Feedback recente (10 pontos)
    SELECT EXISTS(
        SELECT 1 FROM mentorado_feedbacks
        WHERE mentorado_id = p_mentorado_id
        AND data_feedback >= CURRENT_DATE - INTERVAL '90 days'
    ) INTO v_feedback_recente;
    
    IF v_feedback_recente THEN
        v_score := v_score + 10;
    END IF;
    
    -- Progressão financeira (máximo 20 pontos)
    SELECT 
        COALESCE(
            (SELECT crescimento_faturamento 
             FROM mentorado_evolucao_financeira 
             WHERE mentorado_id = p_mentorado_id 
             ORDER BY ano DESC, mes DESC 
             LIMIT 1), 0
        ) INTO v_progressao_financeira;
    
    IF v_progressao_financeira > 20 THEN
        v_score := v_score + 20;
    ELSIF v_progressao_financeira > 0 THEN
        v_score := v_score + 10;
    END IF;
    
    -- Garantir que o score esteja entre 0 e 100
    v_score := GREATEST(0, LEAST(100, v_score));
    
    -- Atualizar na tabela mentorados
    UPDATE mentorados 
    SET score_engajamento = v_score,
        ultima_atividade = (
            SELECT MAX(data_atividade) 
            FROM mentorado_atividades 
            WHERE mentorado_id = p_mentorado_id
        )
    WHERE id = p_mentorado_id;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- 11. FUNÇÃO PARA CALCULAR CRESCIMENTO DO MENTORADO
CREATE OR REPLACE FUNCTION calculate_mentorado_growth(p_mentorado_id UUID, p_periodo_meses INTEGER DEFAULT 12)
RETURNS TABLE(
    crescimento_faturamento DECIMAL,
    crescimento_clientes DECIMAL,
    evolucao_ticket_medio DECIMAL,
    periodo_referencia VARCHAR
) AS $$
DECLARE
    v_inicio DECIMAL;
    v_atual DECIMAL;
    v_clientes_inicio INTEGER;
    v_clientes_atual INTEGER;
    v_ticket_inicio DECIMAL;
    v_ticket_atual DECIMAL;
BEGIN
    -- Buscar dados do período inicial
    SELECT faturamento_bruto, num_clientes, ticket_medio
    INTO v_inicio, v_clientes_inicio, v_ticket_inicio
    FROM mentorado_evolucao_financeira
    WHERE mentorado_id = p_mentorado_id
    AND (ano * 12 + mes) = (
        SELECT MIN(ano * 12 + mes)
        FROM mentorado_evolucao_financeira
        WHERE mentorado_id = p_mentorado_id
        AND (ano * 12 + mes) >= (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER * 12 + EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER - p_periodo_meses)
    );
    
    -- Buscar dados do período atual
    SELECT faturamento_bruto, num_clientes, ticket_medio
    INTO v_atual, v_clientes_atual, v_ticket_atual
    FROM mentorado_evolucao_financeira
    WHERE mentorado_id = p_mentorado_id
    ORDER BY ano DESC, mes DESC
    LIMIT 1;
    
    -- Calcular crescimentos
    RETURN QUERY SELECT 
        CASE 
            WHEN v_inicio > 0 THEN ((v_atual - v_inicio) / v_inicio * 100)
            ELSE 0
        END as crescimento_faturamento,
        CASE 
            WHEN v_clientes_inicio > 0 THEN ((v_clientes_atual - v_clientes_inicio)::DECIMAL / v_clientes_inicio * 100)
            ELSE 0
        END as crescimento_clientes,
        CASE 
            WHEN v_ticket_inicio > 0 THEN ((v_ticket_atual - v_ticket_inicio) / v_ticket_inicio * 100)
            ELSE 0
        END as evolucao_ticket_medio,
        format('%s meses', p_periodo_meses) as periodo_referencia;
END;
$$ LANGUAGE plpgsql;

-- 12. RLS POLICIES
ALTER TABLE public.mentorado_evolucao_financeira ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorado_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorado_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorado_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorado_interacoes_mentor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorado_conquistas ENABLE ROW LEVEL SECURITY;

-- Policies genéricas (podem ser refinadas conforme necessário)
CREATE POLICY "mentorado_data_view" ON public.mentorado_evolucao_financeira
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
        OR mentorado_id = auth.uid()
    );

CREATE POLICY "mentorado_feedbacks_view" ON public.mentorado_feedbacks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
        OR mentorado_id = auth.uid()
    );

-- Policies similares para outras tabelas...

-- 13. GRANTS
GRANT ALL ON public.mentorado_evolucao_financeira TO authenticated;
GRANT ALL ON public.mentorado_feedbacks TO authenticated;
GRANT ALL ON public.mentorado_atividades TO authenticated;
GRANT ALL ON public.mentorado_metas TO authenticated;
GRANT ALL ON public.mentorado_interacoes_mentor TO authenticated;
GRANT ALL ON public.mentorado_conquistas TO authenticated;

-- 14. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE public.mentorado_evolucao_financeira IS 'Evolução financeira mensal dos mentorados com métricas detalhadas';
COMMENT ON TABLE public.mentorado_feedbacks IS 'Feedbacks e avaliações periódicas dos mentorados sobre a mentoria';
COMMENT ON TABLE public.mentorado_atividades IS 'Registro de todas as atividades e engajamento na plataforma';
COMMENT ON TABLE public.mentorado_metas IS 'Metas e objetivos definidos pelos mentorados';
COMMENT ON TABLE public.mentorado_interacoes_mentor IS 'Registro de interações diretas com mentores';
COMMENT ON TABLE public.mentorado_conquistas IS 'Marcos e conquistas alcançadas durante a mentoria';

COMMIT;

-- INSTRUÇÕES DE USO:
-- 1. Execute este SQL no Supabase
-- 2. Teste as funções de cálculo de engajamento e crescimento
-- 3. Configure coleta automática de dados de atividade
-- 4. Implemente dashboards de acompanhamento