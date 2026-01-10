-- ===============================================
-- Adicionar coluna admin_phone na tabela organizations
-- ===============================================
-- Execute este SQL no Supabase SQL Editor

-- Adicionar a coluna admin_phone
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_phone TEXT;

-- Definir número padrão para organizações existentes
UPDATE organizations
SET admin_phone = '+5583996910414'
WHERE admin_phone IS NULL;

-- Verificar resultado
SELECT id, name, owner_email, admin_phone FROM organizations;