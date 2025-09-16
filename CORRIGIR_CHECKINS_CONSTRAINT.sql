-- 🔧 CORRIGIR CONSTRAINT DE TIPOS NO CHECKINS
-- Execute este SQL no Supabase

-- Remover a constraint antiga
ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_tipo_check;

-- Adicionar nova constraint com os tipos corretos
ALTER TABLE checkins ADD CONSTRAINT checkins_tipo_check
CHECK (tipo IN ('checkin', 'mentoria', 'follow-up', 'avaliacao', 'onboarding', 'consultoria_imagem'));