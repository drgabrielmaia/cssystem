-- VERIFICAR STATUS ATUAL DAS AULAS
-- Para saber quantas estão atuais e quantas estão arquivadas

-- 1. Resumo geral
SELECT 
  COUNT(*) as total_aulas,
  COUNT(*) FILTER (WHERE is_current = true) as aulas_atuais,
  COUNT(*) FILTER (WHERE is_current = false) as aulas_arquivadas
FROM video_lessons;

-- 2. Verificar se as colunas existem
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'video_lessons' 
AND column_name IN ('is_current', 'version', 'archived_at', 'archive_reason');

-- 3. Status por data de criação (últimos 30 dias)
SELECT 
  DATE(created_at) as data_criacao,
  COUNT(*) as total_aulas,
  COUNT(*) FILTER (WHERE is_current = true) as atuais,
  COUNT(*) FILTER (WHERE is_current = false) as arquivadas
FROM video_lessons
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY data_criacao DESC;

-- 4. Listar algumas aulas e seus status (para debug)
SELECT 
  id,
  title,
  is_current,
  version,
  DATE(created_at) as criada_em,
  archived_at,
  archive_reason
FROM video_lessons
ORDER BY created_at DESC
LIMIT 10;

-- Se você quiser corrigir e arquivar apenas as aulas dos dias 16 e 17 de FEVEREIRO de 2026:
-- Descomente e rode as linhas abaixo:

/*
-- CORREÇÃO: Marcar todas como atuais primeiro
UPDATE video_lessons 
SET 
  is_current = true,
  version = COALESCE(version, 'v1.0'),
  archived_at = NULL,
  archive_reason = NULL
WHERE TRUE;

-- CORREÇÃO: Arquivar APENAS as aulas criadas nos dias 16 e 17 de fevereiro de 2026
UPDATE video_lessons 
SET 
  is_current = false,
  archived_at = NOW(),
  archive_reason = 'Aula criada em 16/17 de fevereiro/2026 - arquivada automaticamente'
WHERE 
  DATE(created_at) IN ('2026-02-16', '2026-02-17');
*/