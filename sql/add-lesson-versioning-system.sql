-- Sistema de Versionamento de Aulas
-- Adiciona campos para controle de versões na tabela video_lessons

-- 1. Adicionar colunas de versionamento
ALTER TABLE video_lessons 
ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS replaced_by uuid REFERENCES video_lessons(id),
ADD COLUMN IF NOT EXISTS archive_reason text;

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_video_lessons_is_current ON video_lessons(is_current);
CREATE INDEX IF NOT EXISTS idx_video_lessons_version ON video_lessons(version);
CREATE INDEX IF NOT EXISTS idx_video_lessons_archived_at ON video_lessons(archived_at);

-- 3. Atualizar todas as aulas existentes como atuais
UPDATE video_lessons 
SET is_current = true, version = 'v1.0' 
WHERE is_current IS NULL OR version IS NULL;

-- 4. Criar view para mentorados (apenas aulas atuais)
CREATE OR REPLACE VIEW current_video_lessons AS
SELECT * FROM video_lessons 
WHERE is_current = true AND is_active = true
ORDER BY module_id, order_index;

-- 5. Criar view para admins (histórico completo)
CREATE OR REPLACE VIEW admin_video_lessons AS
SELECT 
  vl.*,
  CASE 
    WHEN vl.is_current = true THEN 'Atual'
    WHEN vl.archived_at IS NOT NULL THEN 'Arquivada'
    ELSE 'Rascunho'
  END as status_display,
  replaced.*. title as replaced_by_title
FROM video_lessons vl
LEFT JOIN video_lessons replaced ON vl.replaced_by = replaced.id
ORDER BY vl.created_at DESC;

-- 6. Criar função para arquivar uma aula
CREATE OR REPLACE FUNCTION archive_video_lesson(
  lesson_id uuid,
  reason text DEFAULT NULL,
  replacement_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  UPDATE video_lessons 
  SET 
    is_current = false,
    archived_at = NOW(),
    archive_reason = reason,
    replaced_by = replacement_id
  WHERE id = lesson_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar função para restaurar uma aula
CREATE OR REPLACE FUNCTION restore_video_lesson(lesson_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE video_lessons 
  SET 
    is_current = true,
    archived_at = NULL,
    archive_reason = NULL
  WHERE id = lesson_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar função para criar nova versão de aula
CREATE OR REPLACE FUNCTION create_lesson_version(
  original_lesson_id uuid,
  new_title text,
  new_description text DEFAULT NULL,
  new_video_url text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  new_lesson_id uuid;
  original_lesson record;
BEGIN
  -- Buscar aula original
  SELECT * INTO original_lesson FROM video_lessons WHERE id = original_lesson_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aula original não encontrada: %', original_lesson_id;
  END IF;
  
  -- Arquivar versão atual
  PERFORM archive_video_lesson(original_lesson_id, 'Nova versão criada');
  
  -- Criar nova versão
  INSERT INTO video_lessons (
    module_id,
    title,
    description,
    panda_video_embed_url,
    duration_minutes,
    order_index,
    is_active,
    organization_id,
    is_current,
    version
  ) VALUES (
    original_lesson.module_id,
    new_title,
    COALESCE(new_description, original_lesson.description),
    COALESCE(new_video_url, original_lesson.panda_video_embed_url),
    original_lesson.duration_minutes,
    original_lesson.order_index,
    true,
    original_lesson.organization_id,
    true,
    'v' || (SUBSTRING(original_lesson.version FROM 2)::float + 0.1)::text
  ) RETURNING id INTO new_lesson_id;
  
  -- Atualizar aula arquivada com referência à nova
  UPDATE video_lessons 
  SET replaced_by = new_lesson_id 
  WHERE id = original_lesson_id;
  
  RETURN new_lesson_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Comentários para documentação
COMMENT ON COLUMN video_lessons.is_current IS 'Indica se esta é a versão atual da aula (visible para mentorados)';
COMMENT ON COLUMN video_lessons.version IS 'Versão da aula (v1.0, v1.1, v2.0, etc)';
COMMENT ON COLUMN video_lessons.archived_at IS 'Timestamp quando a aula foi arquivada';
COMMENT ON COLUMN video_lessons.replaced_by IS 'ID da aula que substituiu esta versão';
COMMENT ON COLUMN video_lessons.archive_reason IS 'Motivo do arquivamento (opcional)';

COMMENT ON VIEW current_video_lessons IS 'View para mentorados - apenas aulas atuais e ativas';
COMMENT ON VIEW admin_video_lessons IS 'View para admins - histórico completo com status';

COMMENT ON FUNCTION archive_video_lesson IS 'Arquiva uma aula (is_current = false)';
COMMENT ON FUNCTION restore_video_lesson IS 'Restaura uma aula arquivada';
COMMENT ON FUNCTION create_lesson_version IS 'Cria nova versão de uma aula existente';