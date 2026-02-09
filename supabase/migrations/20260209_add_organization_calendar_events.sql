-- ======================================================
-- URGENTE: Adicionar organization_id na calendar_events
-- ======================================================

-- 1. Adicionar coluna organization_id
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 2. Atualizar todos os eventos existentes para Admin Organization
-- (ID: 9c8c0033-15ea-4e33-a55f-28d81a19693b)
UPDATE calendar_events 
SET organization_id = '9c8c0033-15ea-4e33-a55f-28d81a19693b'
WHERE organization_id IS NULL;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id 
ON calendar_events(organization_id);

-- 4. Verificar resultado
-- SELECT COUNT(*) as total_events, organization_id 
-- FROM calendar_events 
-- GROUP BY organization_id;