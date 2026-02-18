-- SQL PARA RESETAR STATUS DAS AULAS
-- Arquivar apenas aulas dos dias 16 e 17 de fevereiro
-- O restante fica como atual

-- 1. Primeiro, garantir que as colunas existem
ALTER TABLE video_lessons 
ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS replaced_by uuid,
ADD COLUMN IF NOT EXISTS archive_reason text;

-- 2. Marcar TODAS as aulas como ATUAIS primeiro (padrão)
UPDATE video_lessons 
SET 
  is_current = true,
  version = COALESCE(version, 'v1.0'),
  archived_at = NULL,
  archive_reason = NULL
WHERE TRUE;

-- 3. Arquivar APENAS as aulas criadas nos dias 16 e 17 de fevereiro de 2025
UPDATE video_lessons 
SET 
  is_current = false,
  archived_at = NOW(),
  archive_reason = 'Aula criada em 16/17 de fevereiro - arquivada automaticamente'
WHERE 
  DATE(created_at) IN ('2025-02-16', '2025-02-17');

-- 3. Criar índices para performance (se ainda não existem)
CREATE INDEX IF NOT EXISTS idx_video_lessons_is_current ON video_lessons(is_current);
CREATE INDEX IF NOT EXISTS idx_video_lessons_version ON video_lessons(version);
CREATE INDEX IF NOT EXISTS idx_video_lessons_archived_at ON video_lessons(archived_at);

-- 4. Verificar resultado geral
SELECT 
  COUNT(*) as total_aulas,
  COUNT(*) FILTER (WHERE is_current = true) as aulas_atuais,
  COUNT(*) FILTER (WHERE is_current = false) as aulas_arquivadas
FROM video_lessons;

-- 5. Verificar aulas arquivadas por data de criação
SELECT 
  DATE(created_at) as data_criacao,
  COUNT(*) as total_aulas,
  COUNT(*) FILTER (WHERE is_current = false) as arquivadas
FROM video_lessons
WHERE DATE(created_at) IN ('2025-02-16', '2025-02-17')
GROUP BY DATE(created_at)
ORDER BY data_criacao;

-- RESULTADO ESPERADO:
-- Aulas dos dias 16/17 de fevereiro: ARQUIVADAS
-- Todas as outras aulas: ATUAIS