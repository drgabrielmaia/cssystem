-- Adicionar organization_id na tabela form_templates
BEGIN;

-- 1. Adicionar coluna organization_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_templates' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE form_templates 
        ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Coluna organization_id adicionada em form_templates';
    END IF;
END $$;

-- 2. Buscar o ID da organização do admin@admin.com especificamente
-- e atualizar todos os templates existentes
UPDATE form_templates 
SET organization_id = (
    SELECT o.id 
    FROM organizations o 
    JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.email = 'admin@admin.com'
    LIMIT 1
)
WHERE organization_id IS NULL;

-- 3. Tornar organization_id obrigatório após migração
ALTER TABLE form_templates 
ALTER COLUMN organization_id SET NOT NULL;

-- 4. Criar índice
CREATE INDEX IF NOT EXISTS idx_form_templates_organization_id 
ON form_templates(organization_id);

-- 5. Adicionar RLS policy
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_form_templates_policy" ON form_templates
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- 6. Grant permissions
GRANT ALL ON form_templates TO authenticated;

-- 7. Verificação detalhada
SELECT 
    'MIGRATION COMPLETED' as status,
    COUNT(*) as total_templates,
    COUNT(organization_id) as templates_with_org_id
FROM form_templates;

-- 8. Verificar se templates estão na organização do admin@admin.com
SELECT 
    ft.name as template_name,
    ft.slug,
    o.name as organization_name,
    ou.email as admin_email,
    'SUCCESS: Templates na organização do admin@admin.com' as result
FROM form_templates ft
JOIN organizations o ON ft.organization_id = o.id
JOIN organization_users ou ON o.id = ou.organization_id
WHERE ou.email = 'admin@admin.com'
ORDER BY ft.name;

COMMIT;

-- Comentário
COMMENT ON COLUMN form_templates.organization_id IS 'ID da organização proprietária do template';