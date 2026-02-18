-- VERIFICAR URLs DAS AULAS DO HOTSEAT
-- Para identificar problemas com códigos de aula faltando

-- 1. Buscar todas as aulas do Hotseat (arquivadas e atuais)
SELECT 
  id,
  title,
  panda_video_embed_url,
  panda_video_id,
  is_current,
  DATE(created_at) as criada_em,
  archived_at,
  CASE 
    WHEN panda_video_embed_url IS NULL OR panda_video_embed_url = '' THEN '❌ URL VAZIA'
    WHEN panda_video_embed_url LIKE '%v=%' THEN '✅ TEM CÓDIGO'
    ELSE '⚠️ SEM CÓDIGO'
  END as status_url
FROM video_lessons
WHERE title ILIKE '%hotseat%'
ORDER BY title;

-- 2. Verificar URLs problemáticas
SELECT 
  id,
  title,
  panda_video_embed_url,
  LENGTH(panda_video_embed_url) as tamanho_url
FROM video_lessons
WHERE title ILIKE '%hotseat%'
AND (
  panda_video_embed_url IS NULL 
  OR panda_video_embed_url = '' 
  OR panda_video_embed_url NOT LIKE '%v=%'
)
ORDER BY title;

-- 3. Contar problemas por status
SELECT 
  CASE 
    WHEN panda_video_embed_url IS NULL OR panda_video_embed_url = '' THEN 'URL_VAZIA'
    WHEN panda_video_embed_url LIKE '%v=%' THEN 'URL_OK'
    ELSE 'SEM_CODIGO'
  END as categoria,
  COUNT(*) as quantidade
FROM video_lessons
WHERE title ILIKE '%hotseat%'
GROUP BY 1;

-- 4. Exemplo de URL correta vs incorreta
SELECT 
  'EXEMPLO' as tipo,
  'URL_CORRETA' as formato,
  'https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=CODIGO_DA_AULA' as exemplo

UNION ALL

SELECT 
  'PROBLEMA' as tipo,
  'URL_SEM_CODIGO' as formato,  
  'https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=' as exemplo;