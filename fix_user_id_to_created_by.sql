-- Fix: Replace user_id with created_by in calculate_lead_score function
-- This script fixes the column name issue in the lead_history table inserts

-- Drop and recreate the calculate_lead_score function with the correct column name
DROP FUNCTION IF EXISTS calculate_lead_score(uuid);

CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  score integer := 0;
  lead_data record;
  org_id uuid;
  score_details jsonb;
BEGIN
  -- Get lead data
  SELECT * INTO lead_data FROM leads WHERE id = lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('total_score', 0, 'success', false, 'error', 'Lead not found');
  END IF;
  
  org_id := lead_data.organization_id;
  
  -- Basic scoring rules
  -- Has phone number: +10
  IF lead_data.telefone IS NOT NULL AND lead_data.telefone != '' THEN
    score := score + 10;
  END IF;
  
  -- Has email: +10
  IF lead_data.email IS NOT NULL AND lead_data.email != '' THEN
    score := score + 10;
  END IF;
  
  -- Has company: +15
  IF lead_data.empresa IS NOT NULL AND lead_data.empresa != '' THEN
    score := score + 15;
  END IF;
  
  -- Has position/role: +15
  IF lead_data.cargo IS NOT NULL AND lead_data.cargo != '' THEN
    score := score + 15;
  END IF;
  
  -- Temperature-based scoring
  IF lead_data.temperatura = 'quente' THEN
    score := score + 30;
  ELSIF lead_data.temperatura = 'morno' THEN
    score := score + 20;
  ELSIF lead_data.temperatura = 'frio' THEN
    score := score + 10;
  END IF;
  
  -- Interest level scoring
  IF lead_data.nivel_interesse = 'alto' THEN
    score := score + 25;
  ELSIF lead_data.nivel_interesse = 'medio' THEN
    score := score + 15;
  ELSIF lead_data.nivel_interesse = 'baixo' THEN
    score := score + 5;
  END IF;
  
  -- Budget available: +20
  IF lead_data.orcamento_disponivel > 0 THEN
    score := score + 20;
  END IF;
  
  -- Is decision maker: +25
  IF lead_data.decisor_principal = true THEN
    score := score + 25;
  END IF;
  
  -- Has main pain point: +15
  IF lead_data.dor_principal IS NOT NULL AND lead_data.dor_principal != '' THEN
    score := score + 15;
  END IF;
  
  -- Build score details
  score_details := jsonb_build_object(
    'telefone', CASE WHEN lead_data.telefone IS NOT NULL THEN 10 ELSE 0 END,
    'email', CASE WHEN lead_data.email IS NOT NULL THEN 10 ELSE 0 END,
    'empresa', CASE WHEN lead_data.empresa IS NOT NULL THEN 15 ELSE 0 END,
    'cargo', CASE WHEN lead_data.cargo IS NOT NULL THEN 15 ELSE 0 END,
    'temperatura', CASE 
      WHEN lead_data.temperatura = 'quente' THEN 30
      WHEN lead_data.temperatura = 'morno' THEN 20
      WHEN lead_data.temperatura = 'frio' THEN 10
      ELSE 0
    END,
    'nivel_interesse', CASE
      WHEN lead_data.nivel_interesse = 'alto' THEN 25
      WHEN lead_data.nivel_interesse = 'medio' THEN 15
      WHEN lead_data.nivel_interesse = 'baixo' THEN 5
      ELSE 0
    END,
    'orcamento', CASE WHEN lead_data.orcamento_disponivel > 0 THEN 20 ELSE 0 END,
    'decisor', CASE WHEN lead_data.decisor_principal = true THEN 25 ELSE 0 END,
    'dor_principal', CASE WHEN lead_data.dor_principal IS NOT NULL THEN 15 ELSE 0 END,
    'total_score', score,
    'calculated_at', now()
  );
  
  -- Update the lead with the calculated score
  UPDATE leads 
  SET 
    lead_score = score,
    lead_score_detalhado = score_details
  WHERE id = lead_id;
  
  -- Log the action using created_by instead of user_id
  INSERT INTO lead_history (lead_id, action, details, created_by, organization_id)
  VALUES (
    lead_id,
    'score_calculated',
    jsonb_build_object(
      'score', score,
      'temperatura', lead_data.temperatura,
      'nivel_interesse', lead_data.nivel_interesse,
      'tem_orcamento', lead_data.orcamento_disponivel > 0,
      'e_decisor', lead_data.decisor_principal,
      'function', 'calculate_lead_score'
    ),
    NULL, -- created_by is NULL for system-generated actions
    org_id
  );
  
  RETURN jsonb_build_object('total_score', score, 'success', true, 'details', score_details);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error using created_by instead of user_id
    INSERT INTO lead_history (lead_id, action, details, created_by, organization_id)
    VALUES (
      lead_id,
      'score_error',
      jsonb_build_object(
        'error', SQLERRM,
        'function', 'calculate_lead_score'
      ),
      NULL, -- created_by is NULL for system errors
      COALESCE(org_id, (SELECT organization_id FROM leads WHERE id = lead_id LIMIT 1))
    );
    
    RETURN jsonb_build_object('total_score', 0, 'success', false, 'error', SQLERRM);
END;
$$;

-- Check and fix any other functions that might use user_id
-- Update distribute_lead_to_sdr if it exists
DROP FUNCTION IF EXISTS distribute_lead_to_sdr(uuid);

-- Update distribute_lead_to_closer if it exists
DROP FUNCTION IF EXISTS distribute_lead_to_closer(uuid);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_lead_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_lead_score(uuid) TO anon;
GRANT EXECUTE ON FUNCTION calculate_lead_score(uuid) TO service_role;

-- Test the function to make sure it works
-- SELECT calculate_lead_score(id) FROM leads LIMIT 1;

COMMENT ON FUNCTION calculate_lead_score IS 'Calculates lead score based on multiple factors - Fixed to use created_by instead of user_id';