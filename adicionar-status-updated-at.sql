-- ========================================
-- ADICIONAR CAMPO status_updated_at NA TABELA LEADS
-- ========================================
-- Para rastrear quando cada lead mudou de status pela última vez

-- 1. Adicionar o novo campo
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Migrar dados existentes: usar updated_at como valor inicial para status_updated_at
UPDATE leads
SET status_updated_at = updated_at
WHERE status_updated_at IS NULL;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_leads_status_updated_at ON leads(status_updated_at);

-- 4. Criar trigger para atualizar status_updated_at automaticamente quando status mudar
CREATE OR REPLACE FUNCTION update_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou, atualizar status_updated_at
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_updated_at = NOW();
    END IF;

    -- Sempre atualizar updated_at
    NEW.updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar o trigger
DROP TRIGGER IF EXISTS trigger_update_status_updated_at ON leads;
CREATE TRIGGER trigger_update_status_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_status_updated_at();

-- 6. Para novos inserts, definir status_updated_at igual ao created_at
CREATE OR REPLACE FUNCTION set_initial_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Para novos registros, status_updated_at = created_at
    NEW.status_updated_at = COALESCE(NEW.created_at, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_initial_status_updated_at ON leads;
CREATE TRIGGER trigger_set_initial_status_updated_at
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION set_initial_status_updated_at();

-- 7. Verificação dos dados migrados
SELECT
    'MIGRAÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN status_updated_at IS NOT NULL THEN 1 END) as leads_com_status_updated_at,
    COUNT(CASE WHEN status_updated_at IS NULL THEN 1 END) as leads_sem_status_updated_at,
    MIN(status_updated_at) as primeira_data,
    MAX(status_updated_at) as ultima_data
FROM leads;

-- 8. Exemplos de como o campo será usado
SELECT
    nome_completo,
    status,
    data_primeiro_contato,
    status_updated_at,
    updated_at,
    created_at,
    -- Diferença entre quando foi criado e quando mudou status pela última vez
    EXTRACT(DAYS FROM status_updated_at - created_at) as dias_ate_ultimo_status
FROM leads
WHERE status_updated_at IS NOT NULL
ORDER BY status_updated_at DESC
LIMIT 10;

-- 9. Comentários para documentação
COMMENT ON COLUMN leads.status_updated_at IS 'Data e hora da última mudança de status do lead';
COMMENT ON TRIGGER trigger_update_status_updated_at ON leads IS 'Atualiza status_updated_at automaticamente quando o status muda';
COMMENT ON TRIGGER trigger_set_initial_status_updated_at ON leads IS 'Define status_updated_at igual ao created_at para novos leads';

-- 10. Query de exemplo para Social Seller com novo campo
-- Esta query mostrará leads que mudaram de status na última semana
/*
SELECT
    COUNT(*) as leads_com_atividade_semana,
    status,
    COUNT(*) as quantidade
FROM leads
WHERE status_updated_at >= (NOW() - INTERVAL '7 days')
GROUP BY status
ORDER BY quantidade DESC;
*/

-- 11. IMPORTANTE: Teste manual após executar
-- Execute uma atualização de status em um lead para testar o trigger:
-- UPDATE leads SET status = 'qualificado' WHERE id = 'seu-lead-id';
-- SELECT status_updated_at, updated_at FROM leads WHERE id = 'seu-lead-id';
-- Verifique se status_updated_at foi atualizado automaticamente

COMMIT;