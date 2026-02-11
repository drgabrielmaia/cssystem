-- Fix leads status constraint issue
BEGIN;

-- 1. Verificar constraint atual
SELECT 
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_name LIKE '%status%' 
AND tc.table_name = 'leads';

-- 2. Remover constraint problemático se existir
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- 3. Adicionar constraint correto com todos os status válidos
ALTER TABLE leads
ADD CONSTRAINT leads_status_check
CHECK (status IN (
    'novo', 
    'contatado', 
    'contactado', 
    'interessado',
    'qualificado', 
    'proposta', 
    'proposta_enviada',
    'negociacao', 
    'vendido', 
    'perdido', 
    'vazado', 
    'agendado', 
    'call_agendada',
    'no-show', 
    'quente',
    'nao_respondeu',
    'respondeu',
    'atribuido_sdr'
));

-- 4. Atualizar qualquer status NULL para 'novo'
UPDATE leads 
SET status = 'novo' 
WHERE status IS NULL;

-- 5. Tornar status obrigatório se não for
ALTER TABLE leads 
ALTER COLUMN status SET NOT NULL;

-- 6. Verificar se funcionou
SELECT 
    'CONSTRAINT FIXED' as status,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as leads_sem_status
FROM leads;

COMMIT;

-- Comentário
COMMENT ON CONSTRAINT leads_status_check ON leads IS 'Status válidos para leads no sistema';