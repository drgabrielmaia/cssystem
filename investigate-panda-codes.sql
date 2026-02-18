-- INVESTIGAR CÓDIGOS DO PANDAVIDEO
-- Procurar por onde estão armazenados os códigos corretos

-- 1. Verificar estrutura da tabela video_lessons
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'video_lessons'
AND column_name ILIKE '%panda%'
ORDER BY column_name;

-- 2. Verificar se há códigos no campo panda_video_id
SELECT 
  id,
  title,
  panda_video_id,
  panda_video_embed_url,
  CASE 
    WHEN panda_video_id IS NOT NULL AND panda_video_id != '' THEN '✅ TEM ID'
    ELSE '❌ SEM ID'
  END as status_id
FROM video_lessons
WHERE title ILIKE '%hotseat%'
ORDER BY title;

-- 3. Verificar padrões nas URLs existentes (não-hotseat)
SELECT 
  title,
  panda_video_embed_url,
  SUBSTRING(panda_video_embed_url FROM 'v=([^&]*)') as codigo_extraido,
  LENGTH(SUBSTRING(panda_video_embed_url FROM 'v=([^&]*)')) as tamanho_codigo
FROM video_lessons
WHERE panda_video_embed_url IS NOT NULL
AND panda_video_embed_url != ''
AND panda_video_embed_url LIKE '%v=%'
LIMIT 10;

-- 4. Buscar outras tabelas que podem ter relação com PandaVideo
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (
  table_name ILIKE '%video%' 
  OR table_name ILIKE '%panda%'
  OR table_name ILIKE '%lesson%'
)
ORDER BY table_name;

-- 5. Verificar se existe algum backup ou histórico
SELECT 
  COUNT(*) as total_lessons,
  COUNT(*) FILTER (WHERE panda_video_embed_url IS NOT NULL AND panda_video_embed_url != '') as com_url,
  COUNT(*) FILTER (WHERE panda_video_id IS NOT NULL AND panda_video_id != '') as com_id,
  COUNT(*) FILTER (WHERE title ILIKE '%hotseat%') as hotseat_total,
  COUNT(*) FILTER (WHERE title ILIKE '%hotseat%' AND (panda_video_embed_url IS NULL OR panda_video_embed_url = '')) as hotseat_sem_url
FROM video_lessons;