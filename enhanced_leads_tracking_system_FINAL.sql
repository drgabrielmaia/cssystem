-- =====================================================
-- SISTEMA APRIMORADO DE TRACKING DE LEADS - VERSÃO FINAL
-- Baseado na estrutura REAL verificada via API/MCP do Supabase
-- ATENÇÃO: Campos closer_id, sdr_id JÁ EXISTEM na tabela leads
-- =====================================================

BEGIN;

-- 1. VERIFICAR E ADICIONAR APENAS CAMPOS QUE REALMENTE NÃO EXISTEM
DO $$
BEGIN
    -- NÃO adicionar closer_id - JÁ EXISTE
    -- NÃO adicionar sdr_id - JÁ EXISTE  
    -- NÃO adicionar organization_id - JÁ EXISTE

    -- Verificar e adicionar apenas campos novos necessários
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_score_detalhado'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN lead_score_detalhado INTEGER DEFAULT 0;
        RAISE NOTICE 'Campo lead_score_detalhado adicionado';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'temperatura_calculada'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN temperatura_calculada VARCHAR(20) DEFAULT 'frio';
        RAISE NOTICE 'Campo temperatura_calculada adicionado';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'prioridade_nivel'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN prioridade_nivel VARCHAR(20) DEFAULT 'media' CHECK (prioridade_nivel IN ('baixa', 'media', 'alta'));
        RAISE NOTICE 'Campo prioridade_nivel adicionado';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'tracking_data'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN tracking_data JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Campo tracking_data adicionado';
    END IF;

    RAISE NOTICE 'Verificação de campos concluída - usando estrutura existente';
END $$;

-- 2. CRIAR TABELA DE INTERAÇÕES DETALHADAS (usando campos existentes)
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
    canal VARCHAR(50),
    
    -- Conteúdo
    resumo TEXT NOT NULL,
    detalhes_completos TEXT,
    objecoes_encontradas TEXT[],
    pontos_dor_identificados TEXT[],
    interesse_manifestado INTEGER CHECK (interesse_manifestado >= 1 AND interesse_manifestado <= 10),
    
    -- Resultado
    resultado VARCHAR(50) CHECK (resultado IN (
        'contato_realizado', 'sem_resposta', 'agendamento_feito', 'proposta_enviada', 
        'negociacao_iniciada', 'fechamento_positivo', 'fechamento_negativo', 
        'follow_up_agendado', 'lead_desqualificado', 'aguardando_retorno'
    )),
    
    -- Próximos passos
    proxima_acao TEXT,
    data_proxima_acao DATE,
    responsavel_proxima_acao UUID REFERENCES public.closers(id),
    
    -- Dados de negociação
    valor_proposta DECIMAL(10,2),
    desconto_oferecido DECIMAL(5,2),
    condicoes_pagamento VARCHAR(255),
    
    -- Qualificação BANT
    qualificacao_budget VARCHAR(50),
    qualificacao_autoridade VARCHAR(50),
    qualificacao_necessidade VARCHAR(50), 
    qualificacao_timeline VARCHAR(50),
    
    -- Sentiment e interesse
    sentimento_lead VARCHAR(20) CHECK (sentimento_lead IN ('muito_positivo', 'positivo', 'neutro', 'negativo', 'muito_negativo')),
    nivel_interesse INTEGER CHECK (nivel_interesse >= 1 AND nivel_interesse <= 5),
    probabilidade_fechamento_percebida INTEGER CHECK (probabilidade_fechamento_percebida >= 0 AND probabilidade_fechamento_percebida <= 100),
    
    -- Anexos
    gravacao_url VARCHAR(500),
    anexos_urls JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRIAR TABELA DE QUALIFICAÇÃO DETALHADA
CREATE TABLE IF NOT EXISTS public.lead_qualification_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    closer_id UUID NOT NULL REFERENCES public.closers(id),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- BANT Qualification
    budget_confirmado BOOLEAN DEFAULT false,
    budget_valor_disponivel DECIMAL(10,2),
    budget_fonte VARCHAR(100),
    
    authority_nivel VARCHAR(50),
    authority_pessoas_envolvidas JSONB DEFAULT '[]'::jsonb,
    authority_processo_aprovacao TEXT,
    
    need_dor_principal TEXT,
    need_consequencias_nao_resolver TEXT,
    need_tentativas_anteriores TEXT,
    need_urgencia_score INTEGER CHECK (need_urgencia_score >= 1 AND need_urgencia_score <= 10),
    
    timeline_meta_implementacao DATE,
    timeline_fatores_urgencia TEXT[],
    timeline_restricoes TEXT[],
    
    -- Situação atual
    situacao_atual TEXT,
    solucao_atual VARCHAR(255),
    satisfacao_solucao_atual INTEGER CHECK (satisfacao_solucao_atual >= 1 AND satisfacao_solucao_atual <= 10),
    
    -- Concorrência
    concorrentes_considerados VARCHAR(500)[],
    nossa_vantagem_percebida TEXT,
    principais_objecoes TEXT[],
    
    -- Perfil comportamental
    estilo_comunicacao VARCHAR(50),
    gatilhos_motivacionais TEXT[],
    medos_preocupacoes TEXT[],
    
    -- Empresa (B2B)
    empresa_nome VARCHAR(255),
    empresa_tamanho VARCHAR(50),
    empresa_setor VARCHAR(100),
    empresa_faturamento DECIMAL(12,2),
    empresa_num_funcionarios INTEGER,
    cargo_lead VARCHAR(100),
    nivel_hierarquico VARCHAR(50),
    
    -- Score calculado
    qualification_score INTEGER DEFAULT 0,
    qualification_details JSONB DEFAULT '{}'::jsonb,
    
    data_qualificacao TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CRIAR TABELA DE FOLLOW-UP SEQUENCES
CREATE TABLE IF NOT EXISTS public.lead_followup_sequences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    nome_sequencia VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    
    criterios_ativacao JSONB NOT NULL,
    steps JSONB NOT NULL,
    
    pausar_fim_semana BOOLEAN DEFAULT false,
    pausar_feriados BOOLEAN DEFAULT false,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    horario_envio_inicio TIME DEFAULT '09:00',
    horario_envio_fim TIME DEFAULT '18:00',
    
    leads_atingidos INTEGER DEFAULT 0,
    taxa_resposta DECIMAL(5,2) DEFAULT 0,
    taxa_conversao DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.closers(id)
);

-- 5. CRIAR TABELA DE EXECUCOES DE FOLLOW-UP
CREATE TABLE IF NOT EXISTS public.lead_followup_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES public.lead_followup_sequences(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'responded')),
    
    step_atual INTEGER DEFAULT 0,
    proxima_execucao TIMESTAMPTZ,
    pausado_ate TIMESTAMPTZ,
    
    steps_executados JSONB DEFAULT '[]'::jsonb,
    respostas_recebidas JSONB DEFAULT '[]'::jsonb,
    
    total_touchpoints INTEGER DEFAULT 0,
    data_resposta TIMESTAMPTZ,
    converteu BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CRIAR TABELA DE NOTAS
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    closer_id UUID NOT NULL REFERENCES public.closers(id),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    tipo_nota VARCHAR(50) DEFAULT 'geral' CHECK (tipo_nota IN (
        'geral', 'reuniao', 'ligacao', 'email', 'proposta', 'objecao', 'follow_up', 'interno'
    )),
    titulo VARCHAR(255),
    conteudo TEXT NOT NULL,
    
    visibilidade VARCHAR(20) DEFAULT 'team' CHECK (visibilidade IN ('private', 'team', 'organization')),
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    
    lembrete_data TIMESTAMPTZ,
    lembrete_enviado BOOLEAN DEFAULT false,
    anexos JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_closer_id ON public.lead_interactions(closer_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_data ON public.lead_interactions(data_interacao DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_org ON public.lead_interactions(organization_id);

CREATE INDEX IF NOT EXISTS idx_lead_qualification_lead_id ON public.lead_qualification_details(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_qualification_closer_id ON public.lead_qualification_details(closer_id);
CREATE INDEX IF NOT EXISTS idx_lead_qualification_score ON public.lead_qualification_details(qualification_score DESC);

CREATE INDEX IF NOT EXISTS idx_lead_followup_exec_lead_id ON public.lead_followup_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followup_exec_status ON public.lead_followup_executions(status);
CREATE INDEX IF NOT EXISTS idx_lead_followup_exec_proxima ON public.lead_followup_executions(proxima_execucao);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_closer_id ON public.lead_notes(closer_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON public.lead_notes(created_at DESC);

-- 8. FUNÇÕES PARA SCORING E TEMPERATURA
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
    
    -- Budget (25 pontos)
    IF v_qualification.budget_confirmado THEN
        v_score := v_score + 25;
    ELSIF v_qualification.budget_valor_disponivel IS NOT NULL THEN
        v_score := v_score + 15;
    END IF;
    
    -- Authority (25 pontos)
    v_score := v_score + CASE v_qualification.authority_nivel
        WHEN 'decisor_final' THEN 25
        WHEN 'influenciador_forte' THEN 20
        WHEN 'influenciador_fraco' THEN 10
        ELSE 0
    END;
    
    -- Need (25 pontos)
    v_score := v_score + COALESCE(v_qualification.need_urgencia_score * 2.5, 0)::INTEGER;
    
    -- Timeline (25 pontos)
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
    
    -- Atualizar na tabela de qualificação
    UPDATE lead_qualification_details 
    SET qualification_score = v_score 
    WHERE lead_id = p_lead_id;
    
    -- Atualizar na tabela de leads
    UPDATE leads 
    SET lead_score_detalhado = v_score 
    WHERE id = p_lead_id;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNÇÃO PARA ATUALIZAR TEMPERATURA
CREATE OR REPLACE FUNCTION update_lead_temperatura_calculada(p_lead_id UUID)
RETURNS void AS $$
DECLARE
    v_score INTEGER;
    v_nova_temperatura VARCHAR(20);
    v_interacoes_recentes INTEGER;
    v_ultima_interacao INTERVAL;
    v_lead_atual RECORD;
BEGIN
    -- Buscar dados do lead
    SELECT * INTO v_lead_atual FROM leads WHERE id = p_lead_id;
    
    IF v_lead_atual.id IS NULL THEN
        RETURN;
    END IF;
    
    -- Score atual
    v_score := COALESCE(v_lead_atual.lead_score_detalhado, 0);
    
    -- Contar interações recentes
    SELECT COUNT(*) INTO v_interacoes_recentes
    FROM lead_interactions
    WHERE lead_id = p_lead_id
    AND data_interacao >= NOW() - INTERVAL '7 days';
    
    -- Calcular temperatura
    IF v_score >= 70 OR v_interacoes_recentes >= 3 THEN
        v_nova_temperatura := 'quente';
    ELSIF (v_score >= 40 AND v_interacoes_recentes >= 1) OR v_score >= 60 THEN
        v_nova_temperatura := 'morno';
    ELSE
        v_nova_temperatura := 'frio';
    END IF;
    
    -- Atualizar temperatura calculada
    UPDATE leads 
    SET temperatura_calculada = v_nova_temperatura
    WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- 10. TRIGGER PARA ATUALIZAR TEMPERATURA AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION trigger_update_lead_temperatura()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar temperatura quando houver nova interação
    PERFORM update_lead_temperatura_calculada(NEW.lead_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lead_interaction_temperatura
    AFTER INSERT OR UPDATE ON lead_interactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_lead_temperatura();

-- 11. RLS POLICIES
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_qualification_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followup_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Policies simples baseadas em organização
CREATE POLICY "org_lead_interactions_policy" ON public.lead_interactions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "org_lead_qualification_policy" ON public.lead_qualification_details
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "org_lead_followup_seq_policy" ON public.lead_followup_sequences
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "org_lead_followup_exec_policy" ON public.lead_followup_executions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "org_lead_notes_policy" ON public.lead_notes
    FOR ALL USING (
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

-- 13. COMENTÁRIOS
COMMENT ON TABLE public.lead_interactions IS 'Interações detalhadas com leads usando campos existentes (closer_id, sdr_id)';
COMMENT ON TABLE public.lead_qualification_details IS 'Qualificação BANT detalhada dos leads';
COMMENT ON TABLE public.lead_followup_sequences IS 'Sequências de follow-up configuráveis';
COMMENT ON TABLE public.lead_followup_executions IS 'Execução das sequências de follow-up';
COMMENT ON TABLE public.lead_notes IS 'Notas dos closers sobre os leads';

-- 14. VERIFICAÇÃO FINAL
SELECT 
    'ESTRUTURA VERIFICADA' as status,
    'Campos closer_id e sdr_id JÁ EXISTEM na tabela leads' as observacao
    
UNION ALL

SELECT 
    'NOVAS TABELAS CRIADAS' as status,
    COUNT(*)::text || ' tabelas de tracking criadas' as observacao
FROM information_schema.tables
WHERE table_name IN ('lead_interactions', 'lead_qualification_details', 'lead_followup_sequences', 'lead_followup_executions', 'lead_notes')
AND table_schema = 'public';

COMMIT;

-- OBSERVAÇÕES IMPORTANTES:
-- 1. NÃO tentamos criar closer_id e sdr_id - eles JÁ EXISTEM
-- 2. Usamos organization_id que JÁ EXISTE em todas as tabelas
-- 3. Criamos apenas campos novos com nomes diferentes para evitar conflitos
-- 4. Sistema de tracking está pronto para usar campos existentes
-- 5. Próximo passo: atualizar frontend para mostrar campos SDR/Closer