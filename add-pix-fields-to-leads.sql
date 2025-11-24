-- Migration: Adicionar campos PIX na tabela leads
-- Data: 2024-11-24
-- Descrição: Adiciona campos para controle de pagamento via Pix

-- Adicionar coluna pix_key (chave Pix para devolução)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS pix_key VARCHAR(255);

-- Adicionar coluna pix_paid (status de pagamento)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS pix_paid BOOLEAN NOT NULL DEFAULT false;

-- Adicionar coluna pix_paid_at (data/hora do pagamento confirmado)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS pix_paid_at TIMESTAMP WITH TIME ZONE;

-- Adicionar comentários para documentação
COMMENT ON COLUMN leads.pix_key IS 'Chave Pix do lead para devolução (CPF, email, telefone ou chave aleatória)';
COMMENT ON COLUMN leads.pix_paid IS 'Indica se o lead pagou o valor da call via Pix';
COMMENT ON COLUMN leads.pix_paid_at IS 'Data e hora em que o pagamento via Pix foi confirmado';

-- Criar índice para consultas por status de pagamento
CREATE INDEX IF NOT EXISTS idx_leads_pix_paid ON leads(pix_paid);

-- Criar índice para consultas por data de pagamento
CREATE INDEX IF NOT EXISTS idx_leads_pix_paid_at ON leads(pix_paid_at);