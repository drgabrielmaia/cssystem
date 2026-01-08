-- Script para adicionar o campo turma na tabela mentorados
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar a coluna turma na tabela mentorados
ALTER TABLE mentorados 
ADD COLUMN IF NOT EXISTS turma TEXT DEFAULT 'Turma 1';

-- 2. Criar índice para melhor performance em queries
CREATE INDEX IF NOT EXISTS idx_mentorados_turma 
ON mentorados(turma);

-- 3. Criar índice composto para queries com organization_id e turma
CREATE INDEX IF NOT EXISTS idx_mentorados_org_turma 
ON mentorados(organization_id, turma);

-- 4. Atualizar registros existentes com valores padrão baseados na data de criação
-- Isso agrupa mentorados em turmas baseado no período de entrada
UPDATE mentorados
SET turma = CASE 
    WHEN EXTRACT(YEAR FROM created_at) = 2024 AND EXTRACT(MONTH FROM created_at) <= 6 THEN 'Turma 2024.1'
    WHEN EXTRACT(YEAR FROM created_at) = 2024 AND EXTRACT(MONTH FROM created_at) > 6 THEN 'Turma 2024.2'
    WHEN EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) <= 6 THEN 'Turma 2025.1'
    WHEN EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) > 6 THEN 'Turma 2025.2'
    ELSE 'Turma Geral'
END
WHERE turma IS NULL OR turma = 'Turma 1';

-- 5. Verificar o resultado
SELECT 
    turma,
    COUNT(*) as total_mentorados,
    MIN(created_at) as primeira_entrada,
    MAX(created_at) as ultima_entrada
FROM mentorados
GROUP BY turma
ORDER BY turma;

-- 6. Comentário para documentação
COMMENT ON COLUMN mentorados.turma IS 'Identificação da turma ou grupo do mentorado';
