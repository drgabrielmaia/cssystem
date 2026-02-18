-- CORREÇÃO FINAL: Arquivar aulas dos dias 16/17 de fevereiro de 2026
-- O resto fica atual

-- 1. Primeiro, garantir que as colunas existem
ALTER TABLE video_lessons 
ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS replaced_by uuid,
ADD COLUMN IF NOT EXISTS archive_reason text;

-- 2. RESETAR: Marcar TODAS as aulas como ATUAIS
UPDATE video_lessons 
SET 
  is_current = true,
  version = COALESCE(version, 'v1.0'),
  archived_at = NULL,
  archive_reason = NULL
WHERE TRUE;

-- 3. ARQUIVAR: Apenas as aulas criadas nos dias 16 e 17 de fevereiro de 2026
UPDATE video_lessons 
SET 
  is_current = false,
  archived_at = NOW(),
  archive_reason = 'Aula criada em 16/17 de fevereiro de 2026 - arquivada'
WHERE 
  DATE(created_at) = '2026-02-16' OR DATE(created_at) = '2026-02-17';

-- 4. Verificar o que foi feito
SELECT 
  'RESUMO GERAL' as tipo,
  COUNT(*) as total_aulas,
  COUNT(*) FILTER (WHERE is_current = true) as aulas_atuais,
  COUNT(*) FILTER (WHERE is_current = false) as aulas_arquivadas
FROM video_lessons

UNION ALL

SELECT 
  'ARQUIVADAS (16/17 FEV)' as tipo,
  COUNT(*) as total_aulas,
  0 as aulas_atuais,
  COUNT(*) as aulas_arquivadas
FROM video_lessons
WHERE DATE(created_at) IN ('2026-02-16', '2026-02-17');