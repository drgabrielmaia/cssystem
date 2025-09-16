-- ===================================
-- 🔧 CORRIGIR FOREIGN KEY RELATIONSHIP
-- ===================================

-- Primeiro, remover constraint existente se houver
ALTER TABLE formularios_respostas DROP CONSTRAINT IF EXISTS fk_formularios_mentorado;

-- Adicionar foreign key correta
ALTER TABLE formularios_respostas 
ADD CONSTRAINT fk_formularios_mentorado 
FOREIGN KEY (mentorado_id) 
REFERENCES mentorados(id) 
ON DELETE CASCADE;

-- Verificar se foi criada
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='formularios_respostas';

-- Atualizar estatísticas da tabela
ANALYZE formularios_respostas;
ANALYZE mentorados;