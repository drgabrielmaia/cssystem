-- Fix database inconsistencies and remove mocked data

-- 1. Remove mocked form responses that don't have valid mentorado_id references
DELETE FROM formularios_respostas 
WHERE mentorado_id NOT IN (SELECT id FROM mentorados);

-- 2. Remove mocked responses from specific tables that don't have valid references
DELETE FROM nps_respostas 
WHERE mentorado_id NOT IN (SELECT id FROM mentorados);

DELETE FROM modulo_iv_vendas_respostas 
WHERE mentorado_id NOT IN (SELECT id FROM mentorados);

DELETE FROM modulo_iii_gestao_marketing_respostas 
WHERE mentorado_id NOT IN (SELECT id FROM mentorados);

-- 3. Check if there are real mentorados without proper nome field
-- First, let's see what the actual structure is
-- You may need to adjust this based on actual database structure

-- 4. Remove any orphaned data
DELETE FROM formularios_respostas 
WHERE formulario IN ('modulo_iv_vendas', 'modulo_iii_gestao_marketing', 'nps_feedback')
AND mentorado_id IN (
  SELECT m.id FROM mentorados m 
  WHERE m.nome_completo IS NULL OR m.nome_completo = ''
);

-- 5. Clean up any test/mock data that references non-existent users
-- Remove responses that were created with mock names like 'Ana Paula Silva', 'Carlos Eduardo Santos', etc.
DELETE FROM formularios_respostas 
WHERE data_envio < NOW() - INTERVAL '1 hour'  -- Only if these are old entries
AND formulario IN ('modulo_iv_vendas', 'modulo_iii_gestao_marketing', 'nps_feedback');

-- 6. Show current state
SELECT 'Current mentorados count:' as info, COUNT(*) as count FROM mentorados
UNION ALL
SELECT 'Current formularios_respostas count:' as info, COUNT(*) as count FROM formularios_respostas
UNION ALL  
SELECT 'Current nps_respostas count:' as info, COUNT(*) as count FROM nps_respostas
UNION ALL
SELECT 'Current modulo_iv_vendas_respostas count:' as info, COUNT(*) as count FROM modulo_iv_vendas_respostas
UNION ALL
SELECT 'Current modulo_iii_gestao_marketing_respostas count:' as info, COUNT(*) as count FROM modulo_iii_gestao_marketing_respostas;