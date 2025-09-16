-- 📋 TABELA CHECKINS SIMPLES
-- Execute apenas este SQL no Supabase

CREATE TABLE IF NOT EXISTS checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_agendada TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'agendado',
    tipo VARCHAR(50) DEFAULT 'checkin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_checkins_mentorado ON checkins(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);

-- Desabilitar RLS para desenvolvimento
ALTER TABLE checkins DISABLE ROW LEVEL SECURITY;