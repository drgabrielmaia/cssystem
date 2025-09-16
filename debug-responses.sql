-- ===================================
-- 🔍 DEBUG: Verificar respostas dos formulários
-- ===================================

-- 1. Ver todas as tabelas relacionadas a formulários
SELECT 'Tabelas de formulários:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%respostas%' AND table_schema = 'public';

-- 2. Verificar dados na tabela genérica
SELECT 'Dados em formularios_respostas:' as info;
SELECT formulario, COUNT(*) as total, MAX(data_envio) as ultima_resposta
FROM formularios_respostas 
GROUP BY formulario;

-- 3. Ver alguns dados de exemplo
SELECT 'Exemplo de dados:' as info;
SELECT formulario, mentorado_id, data_envio, 
       CASE 
         WHEN LENGTH(resposta_json::text) > 100 
         THEN LEFT(resposta_json::text, 100) || '...' 
         ELSE resposta_json::text 
       END as resposta_preview
FROM formularios_respostas 
LIMIT 5;

-- 4. Verificar se há mentorados válidos
SELECT 'Mentorados com respostas:' as info;
SELECT m.nome_completo, COUNT(f.*) as total_respostas
FROM mentorados m
LEFT JOIN formularios_respostas f ON m.id = f.mentorado_id
GROUP BY m.id, m.nome_completo
HAVING COUNT(f.*) > 0;

-- 5. Verificar estrutura da tabela
SELECT 'Estrutura da tabela formularios_respostas:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'formularios_respostas';