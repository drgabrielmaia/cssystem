-- =====================================================
-- SISTEMA SIMPLES DE TRACKING DE LEADS - SEM ERROS
-- Apenas adiciona campos novos e cria tabelas novas
-- =====================================================

-- 1. ADICIONAR APENAS CAMPOS NOVOS NA TABELA LEADS (se não existirem)
DO $$
BEGIN
    -- Lead score detalhado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_score_detalhado'
    ) THEN
        ALTER TABLE leads ADD COLUMN lead_score_detalhado INTEGER DEFAULT 0;
    END IF;

    -- Temperatura calculada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'temperatura_calculada'
    ) THEN
        ALTER TABLE leads ADD COLUMN temperatura_calculada VARCHAR(20) DEFAULT 'frio';
    END IF;

    -- Prioridade nível
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'prioridade_nivel'
    ) THEN
        ALTER TABLE leads ADD COLUMN prioridade_nivel VARCHAR(20) DEFAULT 'media' CHECK (prioridade_nivel IN ('baixa', 'media', 'alta'));
    END IF;

    -- Dados de tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'tracking_data'
    ) THEN
        ALTER TABLE leads ADD COLUMN tracking_data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. CRIAR TABELA DE INTERAÇÕES (SEM FOREIGN KEYS COMPLICADAS)
CREATE TABLE IF NOT EXISTS lead_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    closer_id UUID,
    organization_id UUID,
    
    -- Tipo da interação
    tipo_interacao VARCHAR(50) NOT NULL,
    
    -- Dados da interação
    data_interacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duracao_minutos INTEGER,
    canal VARCHAR(50),
    
    -- Conteúdo
    resumo TEXT NOT NULL,
    detalhes_completos TEXT,
    interesse_manifestado INTEGER,
    
    -- Resultado
    resultado VARCHAR(50),
    
    -- Próximos passos
    proxima_acao TEXT,
    data_proxima_acao DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRIAR TABELA DE QUALIFICAÇÃO
CREATE TABLE IF NOT EXISTS lead_qualification_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    closer_id UUID,
    organization_id UUID,
    
    -- BANT Qualification
    budget_confirmado BOOLEAN DEFAULT false,
    budget_valor_disponivel DECIMAL(10,2),
    
    authority_nivel VARCHAR(50),
    need_dor_principal TEXT,
    timeline_meta_implementacao DATE,
    
    -- Score calculado
    qualification_score INTEGER DEFAULT 0,
    qualification_details JSONB DEFAULT '{}'::jsonb,
    
    data_qualificacao TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CRIAR TABELA DE NOTAS
CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    closer_id UUID,
    organization_id UUID,
    
    tipo_nota VARCHAR(50) DEFAULT 'geral',
    titulo VARCHAR(255),
    conteudo TEXT NOT NULL,
    
    visibilidade VARCHAR(20) DEFAULT 'team',
    prioridade VARCHAR(20) DEFAULT 'normal',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_data ON lead_interactions(data_interacao DESC);

CREATE INDEX IF NOT EXISTS idx_lead_qualification_lead_id ON lead_qualification_details(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_qualification_score ON lead_qualification_details(qualification_score DESC);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at DESC);

-- 6. FUNÇÃO SIMPLES PARA SCORING
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
BEGIN
    -- Score básico baseado em dados existentes
    SELECT 
        CASE 
            WHEN valor_vendido IS NOT NULL THEN 100
            WHEN status = 'vendido' THEN 90
            WHEN status = 'quente' THEN 80
            WHEN status = 'agendado' THEN 70
            WHEN status = 'contactado' THEN 50
            WHEN status = 'qualificado' THEN 60
            ELSE 30
        END INTO v_score
    FROM leads 
    WHERE id = p_lead_id;
    
    -- Atualizar o score
    UPDATE leads 
    SET lead_score_detalhado = v_score 
    WHERE id = p_lead_id;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNÇÃO PARA TEMPERATURA
CREATE OR REPLACE FUNCTION update_lead_temperature(p_lead_id UUID)
RETURNS void AS $$
DECLARE
    v_score INTEGER;
    v_nova_temperatura VARCHAR(20);
BEGIN
    -- Calcular score primeiro
    v_score := calculate_lead_score(p_lead_id);
    
    -- Determinar temperatura
    IF v_score >= 70 THEN
        v_nova_temperatura := 'quente';
    ELSIF v_score >= 50 THEN
        v_nova_temperatura := 'morno';
    ELSE
        v_nova_temperatura := 'frio';
    END IF;
    
    -- Atualizar temperatura
    UPDATE leads 
    SET temperatura_calculada = v_nova_temperatura
    WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS SIMPLES
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualification_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- Policies básicas
CREATE POLICY "lead_interactions_policy" ON lead_interactions FOR ALL USING (true);
CREATE POLICY "lead_qualification_policy" ON lead_qualification_details FOR ALL USING (true);
CREATE POLICY "lead_notes_policy" ON lead_notes FOR ALL USING (true);

-- 9. GRANTS
GRANT ALL ON lead_interactions TO authenticated;
GRANT ALL ON lead_qualification_details TO authenticated;
GRANT ALL ON lead_notes TO authenticated;

-- 10. VERIFICAÇÃO FINAL
SELECT 
    'SUCCESS' as status,
    'Enhanced lead tracking system created successfully' as message;