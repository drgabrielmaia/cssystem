-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- Sistema de Versionamento de Aulas

-- Adicionar colunas de versionamento
ALTER TABLE video_lessons 
ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS replaced_by uuid,
ADD COLUMN IF NOT EXISTS archive_reason text;

-- Atualizar todas as aulas existentes
UPDATE video_lessons 
SET is_current = true, version = 'v1.0' 
WHERE is_current IS NULL OR version IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_video_lessons_is_current ON video_lessons(is_current);
CREATE INDEX IF NOT EXISTS idx_video_lessons_version ON video_lessons(version);