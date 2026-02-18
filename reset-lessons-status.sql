-- SQL PARA RESETAR STATUS DAS AULAS
-- Marcar todas as aulas como ARQUIVADAS inicialmente
-- Depois o admin vai ativando manualmente as que são atuais

-- 1. Primeiro, garantir que as colunas existem
ALTER TABLE video_lessons 
ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS replaced_by uuid,
ADD COLUMN IF NOT EXISTS archive_reason text;

-- 2. Marcar TODAS as aulas como ARQUIVADAS
UPDATE video_lessons 
SET 
  is_current = false,
  version = COALESCE(version, 'v1.0'),
  archived_at = COALESCE(archived_at, NOW()),
  archive_reason = COALESCE(archive_reason, 'Arquivado por padrão - aguardando ativação manual')
WHERE TRUE;

-- 3. Criar índices para performance (se ainda não existem)
CREATE INDEX IF NOT EXISTS idx_video_lessons_is_current ON video_lessons(is_current);
CREATE INDEX IF NOT EXISTS idx_video_lessons_version ON video_lessons(version);
CREATE INDEX IF NOT EXISTS idx_video_lessons_archived_at ON video_lessons(archived_at);

-- 4. Verificar resultado
SELECT 
  COUNT(*) as total_aulas,
  COUNT(*) FILTER (WHERE is_current = true) as aulas_atuais,
  COUNT(*) FILTER (WHERE is_current = false) as aulas_arquivadas
FROM video_lessons;

-- RESULTADO ESPERADO:
-- total_aulas: [número total]
-- aulas_atuais: 0
-- aulas_arquivadas: [mesmo número do total]