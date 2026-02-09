-- Corrigir valor padrão da comissão para R$ 2.000,00
-- URGENTE: Atualizar função para usar R$ 2.000,00 como padrão

-- 1. Atualizar função calculate_commission para usar R$ 2.000,00 (200.000 centavos) como padrão
CREATE OR REPLACE FUNCTION calculate_commission(
  p_sale_amount BIGINT,
  p_organization_id UUID,
  p_commission_type TEXT
) RETURNS BIGINT AS $$
DECLARE
  v_commission BIGINT;
  v_fixed_rate BIGINT;
BEGIN
  -- Get organization's fixed commission rate
  SELECT comissao_fixa_indicacao INTO v_fixed_rate
  FROM organizations
  WHERE id = p_organization_id;
  
  -- If no specific rate, use default R$ 2.000,00
  IF v_fixed_rate IS NULL THEN
    v_fixed_rate := 200000; -- R$ 2.000,00 = 200.000 centavos
  END IF;
  
  -- For now, return fixed rate
  -- This can be enhanced to use commission_rules table
  RETURN v_fixed_rate;
END;
$$ LANGUAGE plpgsql;

-- 2. Atualizar organizações existentes para terem o valor padrão de R$ 2.000,00
UPDATE organizations 
SET comissao_fixa_indicacao = 200000 -- R$ 2.000,00 em centavos
WHERE comissao_fixa_indicacao IS NULL OR comissao_fixa_indicacao = 0;

-- 3. Certificar que o campo existe na tabela organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS comissao_fixa_indicacao BIGINT DEFAULT 200000;

-- 4. Comentário para documentação
COMMENT ON COLUMN organizations.comissao_fixa_indicacao IS 'Comissão fixa para indicações - valor em centavos. Padrão: 200.000 centavos = R$ 2.000,00';

-- 5. Inserir configuração padrão na tabela commission_settings se existir
INSERT INTO commission_settings (
  organization_id,
  default_commission_percentage,
  first_milestone_percentage,
  second_milestone_percentage,
  minimum_payment_percentage,
  minimum_withdrawal_amount,
  notify_on_eligible,
  notify_on_payment
)
SELECT 
  id,
  0, -- Percentual 0 porque usamos valor fixo
  100, -- 100% no primeiro marco
  0, -- 0% no segundo marco (só um pagamento)
  50, -- Mínimo 50% do pagamento para gerar comissão
  5000, -- Mínimo R$ 50,00 para saque
  true,
  true
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM commission_settings cs 
  WHERE cs.organization_id = organizations.id
);

-- 6. Verificação - mostrar organizações e suas comissões
SELECT 
  id,
  nome,
  comissao_fixa_indicacao,
  CASE 
    WHEN comissao_fixa_indicacao IS NULL THEN 'SERÁ R$ 2.000,00 (padrão)'
    ELSE 'R$ ' || (comissao_fixa_indicacao::DECIMAL / 100)::TEXT || ',00'
  END as comissao_formatada
FROM organizations;