-- ========================================
-- MIGRAÇÃO: ADICIONAR TIPO DE FORMULÁRIO
-- ========================================

-- Adicionar coluna form_type na tabela form_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'form_templates'
        AND column_name = 'form_type'
    ) THEN
        ALTER TABLE form_templates ADD COLUMN form_type VARCHAR(20) DEFAULT 'lead';

        -- Adicionar check constraint
        ALTER TABLE form_templates ADD CONSTRAINT form_templates_form_type_check
        CHECK (form_type IN ('lead', 'nps', 'survey', 'feedback', 'other'));

        RAISE NOTICE 'Coluna form_type adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna form_type já existe.';
    END IF;
END $$;

-- Criar índice para o novo campo
CREATE INDEX IF NOT EXISTS idx_form_templates_form_type ON form_templates(form_type);

-- Atualizar templates existentes que ainda não têm tipo definido
UPDATE form_templates
SET form_type = 'lead'
WHERE form_type IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN form_templates.form_type IS 'Tipo do formulário: lead (captura), nps (satisfação), survey (pesquisa), feedback (opiniões), other (outros)';

-- Verificar se tudo foi criado corretamente
SELECT
    'form_type' as campo_adicionado,
    COUNT(*) as total_templates,
    COUNT(CASE WHEN form_type = 'lead' THEN 1 END) as formularios_lead,
    COUNT(CASE WHEN form_type = 'nps' THEN 1 END) as formularios_nps,
    COUNT(CASE WHEN form_type = 'survey' THEN 1 END) as formularios_survey,
    COUNT(CASE WHEN form_type = 'feedback' THEN 1 END) as formularios_feedback,
    COUNT(CASE WHEN form_type = 'other' THEN 1 END) as formularios_outros
FROM form_templates;

SELECT 'Migração de form_type concluída com sucesso!' as status;