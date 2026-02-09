-- =====================================================
-- CORRIGIR VALOR PADRÃO DA COMISSÃO BASEADO NA ESTRUTURA REAL
-- =====================================================
-- Estrutura real encontrada:
-- - commissions (já existe com commission_amount em BIGINT = centavos)
-- - commission_rules (já existe com base_value em BIGINT = centavos)
-- - organizations (verificar se tem campo comissao_fixa_indicacao)
-- =====================================================

BEGIN;

-- 1. VERIFICAR SE organizations TEM CAMPO DE COMISSÃO FIXA
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'comissao_fixa_indicacao'
    ) THEN
        ALTER TABLE organizations 
        ADD COLUMN comissao_fixa_indicacao BIGINT DEFAULT 200000; -- R$ 2.000,00 em centavos
        
        RAISE NOTICE 'Campo comissao_fixa_indicacao adicionado à organizations';
    ELSE
        -- Atualizar organizações existentes que não têm valor definido
        UPDATE organizations 
        SET comissao_fixa_indicacao = 200000 -- R$ 2.000,00
        WHERE comissao_fixa_indicacao IS NULL OR comissao_fixa_indicacao = 0;
        
        RAISE NOTICE 'Organizações atualizadas com comissão padrão R$ 2.000,00';
    END IF;
END $$;

-- 2. CRIAR/ATUALIZAR FUNÇÃO calculate_commission CORRETA
CREATE OR REPLACE FUNCTION calculate_commission(
  p_sale_amount BIGINT,
  p_organization_id UUID,
  p_commission_type TEXT DEFAULT 'referral'
) RETURNS BIGINT AS $$
DECLARE
  v_commission BIGINT;
  v_fixed_rate BIGINT;
  v_rule RECORD;
BEGIN
  -- 1. Buscar regra específica na tabela commission_rules
  SELECT INTO v_rule *
  FROM commission_rules
  WHERE organization_id = p_organization_id
    AND rule_type = 'fixed'
    AND is_active = true
  ORDER BY priority DESC
  LIMIT 1;
  
  -- 2. Se tem regra específica, usar ela
  IF v_rule.base_value IS NOT NULL THEN
    v_fixed_rate := v_rule.base_value;
  ELSE
    -- 3. Senão, buscar valor fixo da organização
    SELECT comissao_fixa_indicacao INTO v_fixed_rate
    FROM organizations
    WHERE id = p_organization_id;
    
    -- 4. Se não tem valor definido, usar padrão R$ 2.000,00
    IF v_fixed_rate IS NULL THEN
      v_fixed_rate := 200000; -- R$ 2.000,00 em centavos
    END IF;
  END IF;
  
  -- 5. Para comissões de indicação, sempre usar valor fixo
  IF p_commission_type = 'referral' THEN
    RETURN v_fixed_rate;
  END IF;
  
  -- 6. Para outros tipos, implementar lógica específica no futuro
  RETURN v_fixed_rate;
END;
$$ LANGUAGE plpgsql;

-- 3. INSERIR REGRA PADRÃO NA TABELA commission_rules PARA CADA ORGANIZAÇÃO
INSERT INTO commission_rules (
  organization_id,
  rule_name,
  rule_type,
  base_value,
  conditions,
  priority,
  is_active
)
SELECT 
  o.id,
  'Comissão Fixa Indicação Padrão',
  'fixed',
  200000, -- R$ 2.000,00 em centavos
  '{"type": "referral", "description": "Valor fixo para todas as indicações"}',
  1,
  true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM commission_rules cr 
  WHERE cr.organization_id = o.id 
  AND cr.rule_type = 'fixed'
  AND cr.rule_name = 'Comissão Fixa Indicação Padrão'
);

-- 4. ATUALIZAR FUNÇÃO process_referral_conversion (SE EXISTIR)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'process_referral_conversion'
  ) THEN
    -- Recriar a função com o valor correto
    EXECUTE '
    CREATE OR REPLACE FUNCTION process_referral_conversion(
      p_lead_id UUID,
      p_sale_amount BIGINT
    ) RETURNS UUID AS $func$
    DECLARE
      v_referral RECORD;
      v_commission_amount BIGINT;
      v_commission_id UUID;
    BEGIN
      -- Find the referral for this lead
      SELECT * INTO v_referral
      FROM referrals
      WHERE referred_lead_id = p_lead_id
      AND status IN (''pending'', ''qualified'')
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF v_referral.id IS NULL THEN
        RAISE EXCEPTION ''No referral found for lead %'', p_lead_id;
      END IF;
      
      -- Update referral status
      UPDATE referrals
      SET status = ''converted'',
          conversion_date = NOW(),
          updated_at = NOW()
      WHERE id = v_referral.id;
      
      -- Calculate commission using the corrected function
      v_commission_amount := calculate_commission(
        p_sale_amount,
        v_referral.organization_id,
        ''referral''
      );
      
      -- Create commission record
      INSERT INTO commissions (
        organization_id,
        profile_id,
        referral_id,
        lead_id,
        commission_type,
        calculation_method,
        base_amount,
        commission_amount,
        status
      ) VALUES (
        v_referral.organization_id,
        v_referral.referrer_id,
        v_referral.id,
        p_lead_id,
        ''referral'',
        ''fixed'',
        p_sale_amount,
        v_commission_amount,
        ''pending''
      ) RETURNING id INTO v_commission_id;
      
      -- Update lead
      UPDATE leads
      SET status = ''vendido''
      WHERE id = p_lead_id;
      
      RETURN v_commission_id;
    END;
    $func$ LANGUAGE plpgsql;';
    
    RAISE NOTICE 'Função process_referral_conversion atualizada';
  END IF;
END $$;

-- 5. VERIFICAÇÃO FINAL - MOSTRAR CONFIGURAÇÕES
SELECT 
  'Organizações com comissão configurada' as item,
  COUNT(*) as quantidade,
  'R$ ' || (AVG(comissao_fixa_indicacao)::DECIMAL / 100)::TEXT as valor_medio
FROM organizations
WHERE comissao_fixa_indicacao IS NOT NULL

UNION ALL

SELECT 
  'Regras de comissão ativas' as item,
  COUNT(*) as quantidade,
  'R$ ' || (AVG(base_value)::DECIMAL / 100)::TEXT as valor_medio
FROM commission_rules 
WHERE rule_type = 'fixed' AND is_active = true

UNION ALL

SELECT 
  'Comissões pendentes' as item,
  COUNT(*) as quantidade,
  'R$ ' || (AVG(commission_amount)::DECIMAL / 100)::TEXT as valor_medio
FROM commissions
WHERE status = 'pending';

-- 6. MOSTRAR EXEMPLO DE COMO A FUNÇÃO FUNCIONA
SELECT 
  'Teste da função' as descricao,
  'R$ ' || (calculate_commission(500000, org.id, 'referral')::DECIMAL / 100)::TEXT as comissao_calculada
FROM organizations org
LIMIT 1;

COMMIT;

-- COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN organizations.comissao_fixa_indicacao IS 'Comissão fixa para indicações em centavos. Padrão: 200.000 = R$ 2.000,00';
COMMENT ON FUNCTION calculate_commission(BIGINT, UUID, TEXT) IS 'Calcula comissão baseada nas regras da organização. Padrão para indicações: R$ 2.000,00';

-- INSTRUÇÕES:
-- 1. Execute este SQL
-- 2. Teste criando uma nova indicação
-- 3. Verifique se a comissão vem com R$ 2.000,00 automaticamente
-- 4. Para organizações específicas, ajuste o valor em organizations.comissao_fixa_indicacao