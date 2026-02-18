-- CORRIGIR URLs DAS AULAS DO HOTSEAT
-- Baseado nos IDs fornecidos pelo usuário

-- PRIMEIRA PARTE: Verificar as aulas específicas mencionadas
SELECT 
  id,
  title,
  panda_video_embed_url,
  panda_video_id
FROM video_lessons
WHERE id IN (
  'e485f07e-975f-468c-87c3-74610d20a8f5', -- Hotseat 01
  '9ab3f106-0d75-483b-919e-ba3bffded3d2', -- Hotseat 02  
  '797d06fe-ceca-4ec5-af02-d4889f351b96', -- Hotseat 03
  'a2bb52bb-a2a4-4851-8769-566dd461feb5', -- Hotseat 04 - Protocolos I
  'a0ab5cfd-af72-45a2-83f4-c504f773f378', -- Hotseat 05 - Protocolos II
  'c91a5b66-a44a-4486-8ae6-8dd2063e726a', -- Hotseat 06 - Avaliando Funis
  'b0ff9a22-2ac4-4fc3-af34-2c1777eeb570', -- Hotseat 07- Avaliando Protocolos
  'a3ceb2a6-cee2-40d6-9c2a-96deb36c106d', -- Hotseat 08 - Montagem de Protocolos
  '1b30d985-d7a0-468b-b73b-655d31eee24f', -- Hotseat 09 - Marcos Strider
  '945879e5-88b1-446a-895d-d3281f6a9bdb', -- Hotseat 10 - Direito médico
  'a69507b8-f9b2-437d-94fb-3a41e52e845b', -- Hotseat 11 - Tráfego pago 1
  'eb1f8df4-f013-450b-84ae-5aa8da0a95cf', -- Hotseat 12 - Tráfego pago 2
  'b9c3afaf-71a1-4db8-b9e5-8078276849e2'  -- Hotseat 13 - Avaliando protocolos
)
ORDER BY title;

-- CORREÇÃO MANUAL (descomente se necessário):
-- Se as URLs estão vazias ou incorretas, você pode corrigir manualmente:

/*
-- Exemplo de correção - substitua pelos códigos corretos do PandaVideo:

UPDATE video_lessons 
SET panda_video_embed_url = 'https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=CODIGO_HOTSEAT_01'
WHERE id = 'e485f07e-975f-468c-87c3-74610d20a8f5' AND title ILIKE '%hotseat 01%';

UPDATE video_lessons 
SET panda_video_embed_url = 'https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=CODIGO_HOTSEAT_02'  
WHERE id = '9ab3f106-0d75-483b-919e-ba3bffded3d2' AND title ILIKE '%hotseat 02%';

-- Continue para as outras aulas...
-- Você precisará dos códigos reais do PandaVideo para cada aula
*/

-- VERIFICAÇÃO: Buscar se há padrão nos códigos existentes
SELECT 
  title,
  panda_video_embed_url,
  SUBSTRING(panda_video_embed_url FROM 'v=([^&]*)') as codigo_extraido
FROM video_lessons
WHERE title ILIKE '%hotseat%'
AND panda_video_embed_url IS NOT NULL
AND panda_video_embed_url != ''
ORDER BY title;