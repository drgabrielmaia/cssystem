-- 🚀 TRIGGER PARA ACABAR COM A LOUCURA DE RESTRIÇÃO DE MÓDULOS
-- Automaticamente libera novos módulos para TODOS os mentorados quando eles são criados

-- Função que será executada quando um novo módulo for criado
CREATE OR REPLACE FUNCTION auto_grant_module_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir acessos para TODOS os mentorados da organização do novo módulo
    INSERT INTO video_access_control (
        mentorado_id,
        module_id,
        has_access,
        granted_at,
        granted_by,
        created_at,
        updated_at
    )
    SELECT 
        m.id as mentorado_id,
        NEW.id as module_id,
        true as has_access,
        NOW() as granted_at,
        'auto_trigger_new_module' as granted_by,
        NOW() as created_at,
        NOW() as updated_at
    FROM mentorados m
    WHERE m.organization_id = NEW.organization_id
    AND NOT EXISTS (
        -- Evitar duplicatas caso o acesso já exista
        SELECT 1 
        FROM video_access_control vac 
        WHERE vac.mentorado_id = m.id 
        AND vac.module_id = NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger que executa a função quando um novo módulo é inserido
DROP TRIGGER IF EXISTS trigger_auto_grant_module_access ON video_modules;

CREATE TRIGGER trigger_auto_grant_module_access
    AFTER INSERT ON video_modules
    FOR EACH ROW
    WHEN (NEW.is_active = true)  -- Só para módulos ativos
    EXECUTE FUNCTION auto_grant_module_access();

-- Criar também trigger para quando um novo mentorado é criado
CREATE OR REPLACE FUNCTION auto_grant_all_modules_to_new_mentorado()
RETURNS TRIGGER AS $$
BEGIN
    -- Dar acesso a TODOS os módulos ativos da organização
    INSERT INTO video_access_control (
        mentorado_id,
        module_id,
        has_access,
        granted_at,
        granted_by,
        created_at,
        updated_at
    )
    SELECT 
        NEW.id as mentorado_id,
        vm.id as module_id,
        true as has_access,
        NOW() as granted_at,
        'auto_trigger_new_mentorado' as granted_by,
        NOW() as created_at,
        NOW() as updated_at
    FROM video_modules vm
    WHERE vm.organization_id = NEW.organization_id
    AND vm.is_active = true
    AND NOT EXISTS (
        -- Evitar duplicatas
        SELECT 1 
        FROM video_access_control vac 
        WHERE vac.mentorado_id = NEW.id 
        AND vac.module_id = vm.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para novos mentorados
DROP TRIGGER IF EXISTS trigger_auto_grant_all_modules_to_new_mentorado ON mentorados;

CREATE TRIGGER trigger_auto_grant_all_modules_to_new_mentorado
    AFTER INSERT ON mentorados
    FOR EACH ROW
    EXECUTE FUNCTION auto_grant_all_modules_to_new_mentorado();

-- Comentários explicativos
COMMENT ON FUNCTION auto_grant_module_access() IS '🚀 Função que automaticamente libera novos módulos para todos os mentorados - ACABOU A LOUCURA!';
COMMENT ON FUNCTION auto_grant_all_modules_to_new_mentorado() IS '🚀 Função que automaticamente libera todos os módulos para novos mentorados - TUDO LIBERADO!';
COMMENT ON TRIGGER trigger_auto_grant_module_access ON video_modules IS '🎯 Trigger que executa auto-liberação quando novos módulos são criados';
COMMENT ON TRIGGER trigger_auto_grant_all_modules_to_new_mentorado ON mentorados IS '🎯 Trigger que executa auto-liberação quando novos mentorados são criados';

-- Testar se os triggers funcionam (opcional)
SELECT 'Triggers criados com sucesso! 🚀 ACABOU A LOUCURA DE RESTRIÇÃO!' as status;