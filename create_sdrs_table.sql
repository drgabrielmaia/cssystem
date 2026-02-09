-- ==============================================
-- SCRIPT PARA CRIAR TABELA SDRs E AJUSTAR ESTRUTURA
-- ==============================================

-- 1. Criar tabela SDRs (Sales Development Representatives)
CREATE TABLE IF NOT EXISTS sdrs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    meta_qualificacao INTEGER DEFAULT 50, -- Meta de leads qualificados por mês
    ativo BOOLEAN DEFAULT true,
    data_admissao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Métricas de performance
    total_leads_atribuidos INTEGER DEFAULT 0,
    total_leads_qualificados INTEGER DEFAULT 0,
    total_leads_convertidos INTEGER DEFAULT 0,
    taxa_qualificacao DECIMAL(5,2) DEFAULT 0, -- Percentual
    tempo_medio_qualificacao INTEGER DEFAULT 0, -- Em horas
    
    UNIQUE(email, organization_id) -- Email único por organização
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sdrs_organization_id ON sdrs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sdrs_user_id ON sdrs(user_id);
CREATE INDEX IF NOT EXISTS idx_sdrs_email ON sdrs(email);
CREATE INDEX IF NOT EXISTS idx_sdrs_ativo ON sdrs(ativo);

-- 3. Adicionar constraints de foreign key na tabela leads (se ainda não existirem)
DO $$ 
BEGIN
    -- Verifica e adiciona FK para sdr_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_sdr_id_fkey' 
        AND table_name = 'leads'
    ) THEN
        ALTER TABLE leads 
        ADD CONSTRAINT leads_sdr_id_fkey 
        FOREIGN KEY (sdr_id) 
        REFERENCES sdrs(id) 
        ON DELETE SET NULL;
    END IF;
    
    -- Verifica e adiciona FK para closer_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_closer_id_fkey' 
        AND table_name = 'leads'
    ) THEN
        ALTER TABLE leads 
        ADD CONSTRAINT leads_closer_id_fkey 
        FOREIGN KEY (closer_id) 
        REFERENCES closers(id) 
        ON DELETE SET NULL;
    END IF;
    
    -- Verifica e adiciona FK para organization_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_organization_id_fkey' 
        AND table_name = 'leads'
    ) THEN
        ALTER TABLE leads 
        ADD CONSTRAINT leads_organization_id_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Adicionar colunas faltantes na tabela leads (se necessário)
DO $$ 
BEGIN
    -- Adicionar coluna etapa_funil se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'etapa_funil'
    ) THEN
        ALTER TABLE leads 
        ADD COLUMN etapa_funil VARCHAR(50) DEFAULT 'novo'
        CHECK (etapa_funil IN ('novo', 'contactado', 'qualificado', 'proposta', 'negociacao', 'fechado', 'perdido'));
    END IF;
    
    -- Adicionar coluna motivo_perda se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'motivo_perda'
    ) THEN
        ALTER TABLE leads 
        ADD COLUMN motivo_perda VARCHAR(255);
    END IF;
    
    -- Adicionar coluna score_engajamento se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'score_engajamento'
    ) THEN
        ALTER TABLE leads 
        ADD COLUMN score_engajamento INTEGER DEFAULT 0;
    END IF;
    
    -- Adicionar coluna total_interacoes se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'total_interacoes'
    ) THEN
        ALTER TABLE leads 
        ADD COLUMN total_interacoes INTEGER DEFAULT 0;
    END IF;
END $$;

-- 5. Criar índices adicionais na tabela leads para melhor performance
CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON leads(sdr_id);
CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON leads(closer_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura);
CREATE INDEX IF NOT EXISTS idx_leads_prioridade ON leads(prioridade);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_sdr_atribuido_em ON leads(sdr_atribuido_em);
CREATE INDEX IF NOT EXISTS idx_leads_closer_atribuido_em ON leads(closer_atribuido_em);

-- 6. Criar triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para SDRs
DROP TRIGGER IF EXISTS update_sdrs_updated_at ON sdrs;
CREATE TRIGGER update_sdrs_updated_at 
BEFORE UPDATE ON sdrs 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 7. Criar view para análise de performance de SDRs
CREATE OR REPLACE VIEW sdr_performance AS
SELECT 
    s.id,
    s.nome_completo,
    s.email,
    s.organization_id,
    o.name as organization_nome,
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT CASE WHEN l.sdr_qualificado_em IS NOT NULL THEN l.id END) as leads_qualificados,
    COUNT(DISTINCT CASE WHEN l.status = 'vendido' THEN l.id END) as leads_convertidos,
    COALESCE(AVG(EXTRACT(EPOCH FROM (l.sdr_qualificado_em - l.sdr_atribuido_em))/3600)::numeric(10,2), 0) as tempo_medio_qualificacao_horas,
    CASE 
        WHEN COUNT(DISTINCT l.id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN l.sdr_qualificado_em IS NOT NULL THEN l.id END)::numeric / COUNT(DISTINCT l.id) * 100)::numeric(5,2)
        ELSE 0 
    END as taxa_qualificacao,
    DATE_TRUNC('month', CURRENT_DATE) as mes_atual
FROM sdrs s
LEFT JOIN organizations o ON s.organization_id = o.id
LEFT JOIN leads l ON s.id = l.sdr_id 
    AND l.sdr_atribuido_em >= DATE_TRUNC('month', CURRENT_DATE)
WHERE s.ativo = true
GROUP BY s.id, s.nome_completo, s.email, s.organization_id, o.name;

-- 8. Criar view para leads por etapa do funil
CREATE OR REPLACE VIEW leads_funil AS
SELECT 
    l.organization_id,
    o.name as organization_nome,
    l.status,
    l.temperatura,
    l.prioridade,
    COUNT(*) as total,
    AVG(l.lead_score) as score_medio,
    l.sdr_id,
    s.nome_completo as sdr_nome,
    l.closer_id,
    c.nome_completo as closer_nome
FROM leads l
LEFT JOIN organizations o ON l.organization_id = o.id
LEFT JOIN sdrs s ON l.sdr_id = s.id
LEFT JOIN closers c ON l.closer_id = c.id
GROUP BY 
    l.organization_id, 
    o.name,
    l.status, 
    l.temperatura, 
    l.prioridade,
    l.sdr_id,
    s.nome_completo,
    l.closer_id,
    c.nome_completo;

-- 9. Adicionar políticas RLS para SDRs
ALTER TABLE sdrs ENABLE ROW LEVEL SECURITY;

-- Política para SDRs verem apenas sua própria organização
CREATE POLICY "SDRs podem ver apenas sua organização" ON sdrs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM sdrs 
            WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
            SELECT organization_id 
            FROM closers 
            WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
            SELECT organization_id 
            FROM organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- Política para inserir SDRs (apenas admins da organização)
CREATE POLICY "Apenas admins podem criar SDRs" ON sdrs
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT id 
            FROM organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- Política para atualizar SDRs
CREATE POLICY "Admins podem atualizar SDRs de sua organização" ON sdrs
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT id 
            FROM organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- Política para deletar SDRs
CREATE POLICY "Admins podem deletar SDRs de sua organização" ON sdrs
    FOR DELETE
    USING (
        organization_id IN (
            SELECT id 
            FROM organizations 
            WHERE owner_id = auth.uid()
        )
    );

-- 10. Ajustar políticas RLS na tabela leads para SDRs
DROP POLICY IF EXISTS "SDRs podem ver leads atribuídos a eles" ON leads;
CREATE POLICY "SDRs podem ver leads atribuídos a eles" ON leads
    FOR SELECT
    USING (
        sdr_id IN (
            SELECT id 
            FROM sdrs 
            WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
            SELECT organization_id 
            FROM sdrs 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "SDRs podem atualizar leads atribuídos a eles" ON leads;
CREATE POLICY "SDRs podem atualizar leads atribuídos a eles" ON leads
    FOR UPDATE
    USING (
        sdr_id IN (
            SELECT id 
            FROM sdrs 
            WHERE user_id = auth.uid()
        )
    );

-- 11. Função para atribuir leads automaticamente aos SDRs
CREATE OR REPLACE FUNCTION atribuir_lead_sdr(
    p_lead_id UUID,
    p_organization_id UUID
) RETURNS UUID AS $$
DECLARE
    v_sdr_id UUID;
BEGIN
    -- Seleciona o SDR com menos leads atribuídos no mês atual
    SELECT id INTO v_sdr_id
    FROM sdrs
    WHERE organization_id = p_organization_id
        AND ativo = true
    ORDER BY (
        SELECT COUNT(*) 
        FROM leads 
        WHERE sdr_id = sdrs.id 
        AND sdr_atribuido_em >= DATE_TRUNC('month', CURRENT_DATE)
    ) ASC
    LIMIT 1;
    
    IF v_sdr_id IS NOT NULL THEN
        UPDATE leads
        SET 
            sdr_id = v_sdr_id,
            sdr_atribuido_em = NOW()
        WHERE id = p_lead_id;
        
        -- Atualiza contador do SDR
        UPDATE sdrs
        SET total_leads_atribuidos = total_leads_atribuidos + 1
        WHERE id = v_sdr_id;
    END IF;
    
    RETURN v_sdr_id;
END;
$$ LANGUAGE plpgsql;

-- 12. Função para calcular métricas de SDRs
CREATE OR REPLACE FUNCTION atualizar_metricas_sdr(p_sdr_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE sdrs
    SET 
        total_leads_qualificados = (
            SELECT COUNT(*) 
            FROM leads 
            WHERE sdr_id = p_sdr_id 
            AND sdr_qualificado_em IS NOT NULL
        ),
        total_leads_convertidos = (
            SELECT COUNT(*) 
            FROM leads 
            WHERE sdr_id = p_sdr_id 
            AND status = 'vendido'
        ),
        taxa_qualificacao = CASE 
            WHEN total_leads_atribuidos > 0 
            THEN (total_leads_qualificados::numeric / total_leads_atribuidos * 100)::numeric(5,2)
            ELSE 0 
        END,
        tempo_medio_qualificacao = (
            SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (sdr_qualificado_em - sdr_atribuido_em))/3600)::integer, 0)
            FROM leads 
            WHERE sdr_id = p_sdr_id 
            AND sdr_qualificado_em IS NOT NULL
        )
    WHERE id = p_sdr_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FIM DO SCRIPT
-- ==============================================