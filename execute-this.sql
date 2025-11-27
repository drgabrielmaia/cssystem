-- Execute este SQL no seu banco Supabase

-- 1. Adicionar campos novos na tabela leads
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS call_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS call_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS qualification_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sales_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_interaction_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_last_interaction ON leads(last_interaction_date);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_date);

-- 3. Criar tabela de mapas mentais
CREATE TABLE IF NOT EXISTS mind_maps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    legend JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{}',
    is_shared BOOLEAN DEFAULT false,
    share_token UUID DEFAULT gen_random_uuid(),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mentorado_id)
);

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_mind_maps_mentorado_id ON mind_maps(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_share_token ON mind_maps(share_token);

-- Pronto! Execute estes comandos no SQL Editor do Supabase