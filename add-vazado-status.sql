-- Atualizar constraint de status dos leads incluindo todos os status existentes
ALTER TABLE leads
DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads
ADD CONSTRAINT leads_status_check
CHECK (status IN ('novo', 'contactado', 'qualificado', 'proposta', 'negociacao', 'vendido', 'perdido', 'vazado', 'proposta_enviada', 'agendado', 'no-show', 'quente', 'call_agendada'));