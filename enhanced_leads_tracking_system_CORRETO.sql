-- =====================================================
-- SISTEMA APRIMORADO DE TRACKING DE LEADS - VERSÃO CORRIGIDA
-- Baseado na estrutura REAL do Supabase 
-- =====================================================

BEGIN;

-- 1. ESTENDER TABELA LEADS COM CAMPOS QUE NÃO EXISTEM
DO $$
BEGIN
    -- Adicionar apenas campos que realmente não existem
    
    -- Verificar e adicionar prioridade
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'prioridade'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN prioridade VARCHAR(20) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta'));
        RAISE NOTICE 'Coluna prioridade adicionada';
    END IF;

    -- Verificar e adicionar lead_score (diferente do score existente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_score'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN lead_score INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna lead_score adicionada';
    END IF;

    -- Verificar e adicionar origem (diferente de fonte)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'origem'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN origem VARCHAR(100);
        RAISE NOTICE 'Coluna origem adicionada';
    END IF;

    -- Verificar e adicionar fonte_detalhada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'fonte_detalhada'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN fonte_detalhada VARCHAR(255);
        RAISE NOTICE 'Coluna fonte_detalhada adicionada';
    END IF;

    -- Verificar e adicionar valor_potencial (diferente de valor_estimado)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'valor_potencial'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN valor_potencial DECIMAL(10,2);
        RAISE NOTICE 'Coluna valor_potencial adicionada';
    END IF;

    -- Verificar e adicionar probabilidade_fechamento
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'probabilidade_fechamento'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN probabilidade_fechamento INTEGER CHECK (probabilidade_fechamento >= 0 AND probabilidade_fechamento <= 100);
        RAISE NOTICE 'Coluna probabilidade_fechamento adicionada';
    END IF;

    -- Verificar e adicionar data_primeiro_contato
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'data_primeiro_contato'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN data_primeiro_contato TIMESTAMPTZ;
        RAISE NOTICE 'Coluna data_primeiro_contato adicionada';
    END IF;

    -- Verificar e adicionar data_ultima_interacao
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'data_ultima_interacao'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN data_ultima_interacao TIMESTAMPTZ;
        RAISE NOTICE 'Coluna data_ultima_interacao adicionada';
    END IF;

    -- Verificar e adicionar next_followup_date (diferente de data_proxima_acao)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'next_followup_date'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN next_followup_date DATE;
        RAISE NOTICE 'Coluna next_followup_date adicionada';
    END IF;

    -- Verificar e adicionar custom_fields (diferente de dados_adicionais)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'custom_fields'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Coluna custom_fields adicionada';
    END IF;

    -- Verificar e adicionar closer_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'closer_id'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN closer_id UUID REFERENCES public.closers(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna closer_id adicionada';
    END IF;

    -- Verificar e adicionar sdr_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'sdr_id'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN sdr_id UUID REFERENCES public.closers(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna sdr_id adicionada';
    END IF;

END $$;

-- 2. CRIAR TABELA DE INTERAÇÕES DETALHADAS
CREATE TABLE IF NOT EXISTS public.lead_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    closer_id UUID REFERENCES public.closers(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Tipo da interação
    tipo_interacao VARCHAR(50) NOT NULL CHECK (tipo_interacao IN (
        'ligacao', 'whatsapp', 'email', 'reuniao', 'demo', 'follow_up', 
        'proposta', 'negociacao', 'objecao', 'fechamento', 'outro'
    )),
    
    -- Dados da interação
    data_interacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duracao_minutos INTEGER,
    canal VARCHAR(50), -- telefone, whatsapp, zoom, presencial, etc.
    
    -- Conteúdo
    resumo TEXT NOT NULL,
    detalhes_completos TEXT,
    objecoes_encontradas TEXT[],
    pontos_dor_identificados TEXT[],
    interesse_manifestado INTEGER CHECK (interesse_manifestado >= 1 AND interesse_manifestado <= 10),
    
    -- Resultado da interação
    resultado VARCHAR(50) CHECK (resultado IN (
        'contato_realizado', 'sem_resposta', 'agendamento_feito', 'proposta_enviada', 
        'negociacao_iniciada', 'fechamento_positivo', 'fechamento_negativo', 
        'follow_up_agendado', 'lead_desqualificado', 'aguardando_retorno'
    )),
    
    -- Próximos passos
    proxima_acao TEXT,
    data_proxima_acao DATE,
    responsavel_proxima_acao UUID REFERENCES public.closers(id),
    
    -- Campos de negociação
    valor_proposta DECIMAL(10,2),
    desconto_oferecido DECIMAL(5,2),
    condicoes_pagamento VARCHAR(255),
    
    -- Qualificação durante a interação
    qualificacao_budget VARCHAR(50), -- 'tem_budget', 'precisa_aprovar', 'sem_budget'
    qualificacao_autoridade VARCHAR(50), -- 'decisor', 'influenciador', 'sem_autoridade'
    qualificacao_necessidade VARCHAR(50), -- 'urgente', 'importante', 'nice_to_have'
    qualificacao_timeline VARCHAR(50), -- 'imediato', '30_dias', '3_meses', 'mais_3_meses'
    
    -- Sentiment analysis e feedback
    sentimento_lead VARCHAR(20) CHECK (sentimento_lead IN ('muito_positivo', 'positivo', 'neutro', 'negativo', 'muito_negativo')),
    nivel_interesse INTEGER CHECK (nivel_interesse >= 1 AND nivel_interesse <= 5),
    probabilidade_fechamento_percebida INTEGER CHECK (probabilidade_fechamento_percebida >= 0 AND probabilidade_fechamento_percebida <= 100),
    
    -- Metadados
    gravacao_url VARCHAR(500),
    anexos_urls JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRIAR TABELA DE QUALIFICAÇÃO AVANÇADA
CREATE TABLE IF NOT EXISTS public.lead_qualification_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    closer_id UUID NOT NULL REFERENCES public.closers(id),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- BANT Qualification
    budget_confirmado BOOLEAN DEFAULT false,
    budget_valor_disponivel DECIMAL(10,2),
    budget_fonte VARCHAR(100), -- proprio, financiamento, investimento, etc.
    
    authority_nivel VARCHAR(50), -- decisor_final, influenciador_forte, influenciador_fraco, sem_influencia
    authority_pessoas_envolvidas JSONB DEFAULT '[]'::jsonb,
    authority_processo_aprovacao TEXT,
    
    need_dor_principal TEXT,
    need_consequencias_nao_resolver TEXT,
    need_tentativas_anteriores TEXT,
    need_urgencia_score INTEGER CHECK (need_urgencia_score >= 1 AND need_urgencia_score <= 10),
    
    timeline_meta_implementacao DATE,
    timeline_fatores_urgencia TEXT[],
    timeline_restricoes TEXT[],
    
    -- Situação atual do lead
    situacao_atual TEXT,
    solucao_atual VARCHAR(255),
    satisfacao_solucao_atual INTEGER CHECK (satisfacao_solucao_atual >= 1 AND satisfacao_solucao_atual <= 10),
    
    -- Concorrência
    concorrentes_considerados VARCHAR(500)[],
    nossa_vantagem_percebida TEXT,
    principais_objecoes TEXT[],
    
    -- Perfil comportamental
    estilo_comunicacao VARCHAR(50), -- analitico, expressivo, amigavel, diretor
    gatilhos_motivacionais TEXT[],
    medos_preocupacoes TEXT[],
    
    -- Informações da empresa (se B2B)
    empresa_nome VARCHAR(255),
    empresa_tamanho VARCHAR(50),
    empresa_setor VARCHAR(100),
    empresa_faturamento DECIMAL(12,2),
    empresa_num_funcionarios INTEGER,
    cargo_lead VARCHAR(100),
    nivel_hierarquico VARCHAR(50),
    
    -- Score e temperatura calculados
    qualification_score INTEGER DEFAULT 0,
    qualification_details JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    data_qualificacao TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CRIAR TABELA DE FOLLOW-UP AUTOMATIZADO
CREATE TABLE IF NOT EXISTS public.lead_followup_sequences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Configuração da sequência
    nome_sequencia VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    
    -- Critérios de ativação
    criterios_ativacao JSONB NOT NULL, -- conditions for triggering this sequence
    
    -- Configuração dos steps
    steps JSONB NOT NULL, -- array of follow-up steps with timing and content
    
    -- Configurações avançadas
    pausar_fim_semana BOOLEAN DEFAULT false,
    pausar_feriados BOOLEAN DEFAULT false,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    horario_envio_inicio TIME DEFAULT '09:00',
    horario_envio_fim TIME DEFAULT '18:00',
    
    -- Estatísticas
    leads_atingidos INTEGER DEFAULT 0,
    taxa_resposta DECIMAL(5,2) DEFAULT 0,
    taxa_conversao DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.closers(id)
);

-- 5. CRIAR TABELA DE EXECUÇÃO DE FOLLOW-UPS
CREATE TABLE IF NOT EXISTS public.lead_followup_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES public.lead_followup_sequences(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Status da execução
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'responded')),
    
    -- Controle de execução
    step_atual INTEGER DEFAULT 0,
    proxima_execucao TIMESTAMPTZ,
    pausado_ate TIMESTAMPTZ,
    
    -- Histórico de execução
    steps_executados JSONB DEFAULT '[]'::jsonb,
    respostas_recebidas JSONB DEFAULT '[]'::jsonb,
    
    -- Métricas
    total_touchpoints INTEGER DEFAULT 0,
    data_resposta TIMESTAMPTZ,
    converteu BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CRIAR TABELA DE NOTAS E OBSERVAÇÕES
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    closer_id UUID NOT NULL REFERENCES public.closers(id),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Conteúdo da nota
    tipo_nota VARCHAR(50) DEFAULT 'geral' CHECK (tipo_nota IN (
        'geral', 'reuniao', 'ligacao', 'email', 'proposta', 'objecao', 'follow_up', 'interno'
    )),
    titulo VARCHAR(255),
    conteudo TEXT NOT NULL,
    
    -- Visibilidade e prioridade
    visibilidade VARCHAR(20) DEFAULT 'team' CHECK (visibilidade IN ('private', 'team', 'organization')),
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    
    -- Alertas e lembretes
    lembrete_data TIMESTAMPTZ,
    lembrete_enviado BOOLEAN DEFAULT false,
    
    -- Anexos
    anexos JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_closer_id ON public.lead_interactions(closer_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_data ON public.lead_interactions(data_interacao DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_tipo ON public.lead_interactions(tipo_interacao);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_resultado ON public.lead_interactions(resultado);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_org ON public.lead_interactions(organization_id);

CREATE INDEX IF NOT EXISTS idx_lead_qualification_lead_id ON public.lead_qualification_details(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_qualification_closer_id ON public.lead_qualification_details(closer_id);
CREATE INDEX IF NOT EXISTS idx_lead_qualification_score ON public.lead_qualification_details(qualification_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_qualification_org ON public.lead_qualification_details(organization_id);

CREATE INDEX IF NOT EXISTS idx_lead_followup_exec_lead_id ON public.lead_followup_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followup_exec_status ON public.lead_followup_executions(status);
CREATE INDEX IF NOT EXISTS idx_lead_followup_exec_proxima ON public.lead_followup_executions(proxima_execucao);
CREATE INDEX IF NOT EXISTS idx_lead_followup_exec_org ON public.lead_followup_executions(organization_id);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_closer_id ON public.lead_notes(closer_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON public.lead_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_notes_org ON public.lead_notes(organization_id);

-- Índices para novos campos da tabela leads
CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON public.leads(closer_id) WHERE closer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON public.leads(sdr_id) WHERE sdr_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_prioridade ON public.leads(prioridade);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads(lead_score DESC) WHERE lead_score IS NOT NULL;

-- 8. CRIAR TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lead_interactions_updated_at 
    BEFORE UPDATE ON public.lead_interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_qualification_updated_at 
    BEFORE UPDATE ON public.lead_qualification_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_notes_updated_at 
    BEFORE UPDATE ON public.lead_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_followup_sequences_updated_at 
    BEFORE UPDATE ON public.lead_followup_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_followup_executions_updated_at 
    BEFORE UPDATE ON public.lead_followup_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. FUNÇÃO PARA CALCULAR SCORE DE QUALIFICAÇÃO
CREATE OR REPLACE FUNCTION calculate_lead_qualification_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_qualification RECORD;
BEGIN
    SELECT * INTO v_qualification
    FROM lead_qualification_details
    WHERE lead_id = p_lead_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_qualification.id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Budget (25 pontos máximo)
    IF v_qualification.budget_confirmado THEN
        v_score := v_score + 25;
    ELSIF v_qualification.budget_valor_disponivel IS NOT NULL THEN
        v_score := v_score + 15;
    END IF;
    
    -- Authority (25 pontos máximo)
    v_score := v_score + CASE v_qualification.authority_nivel
        WHEN 'decisor_final' THEN 25
        WHEN 'influenciador_forte' THEN 20
        WHEN 'influenciador_fraco' THEN 10
        ELSE 0
    END;
    
    -- Need (25 pontos máximo)
    v_score := v_score + COALESCE(v_qualification.need_urgencia_score * 2.5, 0)::INTEGER;
    
    -- Timeline (25 pontos máximo)
    IF v_qualification.timeline_meta_implementacao IS NOT NULL THEN
        CASE 
            WHEN v_qualification.timeline_meta_implementacao <= CURRENT_DATE + INTERVAL '30 days' THEN
                v_score := v_score + 25;
            WHEN v_qualification.timeline_meta_implementacao <= CURRENT_DATE + INTERVAL '90 days' THEN
                v_score := v_score + 15;
            ELSE
                v_score := v_score + 5;
        END CASE;
    END IF;
    
    -- Update score in qualification table
    UPDATE lead_qualification_details 
    SET qualification_score = v_score 
    WHERE lead_id = p_lead_id;
    
    -- Update lead table
    UPDATE leads 
    SET lead_score = v_score 
    WHERE id = p_lead_id;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- 10. FUNÇÃO PARA ATUALIZAR TEMPERATURA DO LEAD
CREATE OR REPLACE FUNCTION update_lead_temperatura(p_lead_id UUID)
RETURNS void AS $$
DECLARE
    v_score INTEGER;
    v_nova_temperatura VARCHAR(20);
    v_interacoes_recentes INTEGER;
    v_ultima_interacao INTERVAL;
BEGIN
    -- Pegar score atual
    SELECT lead_score INTO v_score FROM leads WHERE id = p_lead_id;
    
    -- Contar interações dos últimos 7 dias
    SELECT COUNT(*) INTO v_interacoes_recentes
    FROM lead_interactions
    WHERE lead_id = p_lead_id
    AND data_interacao >= NOW() - INTERVAL '7 days';
    
    -- Pegar intervalo desde última interação
    SELECT NOW() - MAX(data_interacao) INTO v_ultima_interacao
    FROM lead_interactions
    WHERE lead_id = p_lead_id;
    
    -- Calcular temperatura baseado em score + atividade
    IF COALESCE(v_score, 0) >= 70 OR v_interacoes_recentes >= 3 THEN
        v_nova_temperatura := 'quente';
    ELSIF (COALESCE(v_score, 0) >= 40 AND v_interacoes_recentes >= 1) OR 
          (COALESCE(v_score, 0) >= 60) OR
          (v_ultima_interacao IS NOT NULL AND v_ultima_interacao < INTERVAL '3 days') THEN
        v_nova_temperatura := 'morno';
    ELSE
        v_nova_temperatura := 'frio';
    END IF;
    
    -- Atualizar temperatura
    UPDATE leads 
    SET temperatura = v_nova_temperatura,
        data_ultima_interacao = (
            SELECT MAX(data_interacao) 
            FROM lead_interactions 
            WHERE lead_id = p_lead_id
        )
    WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- 11. RLS POLICIES
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_qualification_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followup_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Policies para lead_interactions
CREATE POLICY "lead_interactions_view" ON public.lead_interactions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "lead_interactions_manage" ON public.lead_interactions
    FOR ALL USING (
        closer_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
    );

-- Policies para outras tabelas (similares)
CREATE POLICY "lead_qualification_view" ON public.lead_qualification_details
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "lead_notes_view" ON public.lead_notes
    FOR SELECT USING (
        visibilidade = 'organization' AND organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
        OR
        (visibilidade = 'team' AND closer_id = auth.uid())
        OR
        (visibilidade = 'private' AND closer_id = auth.uid())
    );

CREATE POLICY "lead_followup_sequences_view" ON public.lead_followup_sequences
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "lead_followup_executions_view" ON public.lead_followup_executions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- 12. GRANTS
GRANT ALL ON public.lead_interactions TO authenticated;
GRANT ALL ON public.lead_qualification_details TO authenticated;
GRANT ALL ON public.lead_followup_sequences TO authenticated;
GRANT ALL ON public.lead_followup_executions TO authenticated;
GRANT ALL ON public.lead_notes TO authenticated;

-- 13. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE public.lead_interactions IS 'Registro detalhado de todas as interações com leads';
COMMENT ON TABLE public.lead_qualification_details IS 'Qualificação avançada BANT e perfil comportamental';
COMMENT ON TABLE public.lead_followup_sequences IS 'Sequências de follow-up automatizado configuráveis';
COMMENT ON TABLE public.lead_followup_executions IS 'Execução das sequências de follow-up para cada lead';
COMMENT ON TABLE public.lead_notes IS 'Notas e observações dos closers sobre os leads';

-- 14. VERIFICAÇÃO FINAL
SELECT 
    'Tabela leads estendida' as status,
    COUNT(*) as total_leads
FROM public.leads
WHERE organization_id IS NOT NULL

UNION ALL

SELECT 
    'Tabela closers disponível' as status,
    COUNT(*) as total_closers
FROM public.closers
WHERE status_contrato = 'ativo'

UNION ALL

SELECT 
    'Novas tabelas criadas' as status,
    COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_name IN ('lead_interactions', 'lead_qualification_details', 'lead_followup_sequences', 'lead_followup_executions', 'lead_notes')
AND table_schema = 'public';

COMMIT;

-- INSTRUÇÕES DE USO:
-- 1. Execute este SQL no Supabase - agora está baseado na estrutura REAL
-- 2. Teste as funções de cálculo de score com dados existentes
-- 3. Configure sequências de follow-up usando a interface criada
-- 4. Use o dashboard de performance para acompanhar os resultados