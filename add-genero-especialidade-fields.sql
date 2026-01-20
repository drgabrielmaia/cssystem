-- Script para adicionar campos de gênero e especialidade na tabela mentorados
-- Para permitir ranking por gênero e coleta de dados adicionais

-- 1. Adicionar campos de gênero e especialidade
ALTER TABLE mentorados
ADD COLUMN IF NOT EXISTS genero TEXT CHECK (genero IN ('masculino', 'feminino', 'outro', 'nao_informado')),
ADD COLUMN IF NOT EXISTS especialidade TEXT;

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_mentorados_genero ON mentorados(genero);
CREATE INDEX IF NOT EXISTS idx_mentorados_especialidade ON mentorados(especialidade);

-- 3. Atualizar dados existentes para não informado (será solicitado no próximo login)
UPDATE mentorados
SET genero = 'nao_informado'
WHERE genero IS NULL;

-- 4. Comentários sobre as colunas
COMMENT ON COLUMN mentorados.genero IS 'Gênero do mentorado: masculino, feminino, outro ou nao_informado';
COMMENT ON COLUMN mentorados.especialidade IS 'Especialidade médica ou área de atuação do mentorado';

-- 5. Exibir estrutura atualizada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mentorados'
AND column_name IN ('genero', 'especialidade')
ORDER BY ordinal_position;