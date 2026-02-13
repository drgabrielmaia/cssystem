-- Fix: New closer assignment logic
-- Score < 60: Paulo Guimarães (closer fixo)
-- Score >= 60: Closer principal (configurável)

-- First, let's create a function to assign based on score
CREATE OR REPLACE FUNCTION assign_lead_by_score(p_lead_id UUID, p_primary_closer_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_paulo_closer_id UUID;
  v_primary_closer_id UUID;
  v_score INTEGER;
  v_result jsonb;
BEGIN
  -- Get lead data with score
  SELECT 
    l.*,
    COALESCE(l.lead_score, 0) as score,
    COALESCE(l.temperatura, 'morno') as temp
  INTO v_lead
  FROM leads l
  WHERE l.id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;
  
  v_score := v_lead.score;
  
  -- Find Paulo Guimarães (for score < 60)
  SELECT id INTO v_paulo_closer_id 
  FROM closers 
  WHERE LOWER(nome_completo) LIKE '%paulo%guimar%' 
    AND status_contrato = 'ativo'
    AND organization_id = v_lead.organization_id
  LIMIT 1;
  
  -- Use provided primary closer or find the best available one
  IF p_primary_closer_id IS NOT NULL THEN
    v_primary_closer_id := p_primary_closer_id;
  ELSE
    -- Find the best available closer for high score leads
    SELECT id INTO v_primary_closer_id
    FROM closers c
    LEFT JOIN leads l ON l.closer_id = c.id AND l.status NOT IN ('convertido', 'perdido', 'desqualificado')
    WHERE 
      c.status_contrato = 'ativo'
      AND c.organization_id = v_lead.organization_id
      AND c.id != COALESCE(v_paulo_closer_id, '00000000-0000-0000-0000-000000000000'::UUID)
    GROUP BY c.id, c.capacidade_maxima_leads
    HAVING COUNT(l.id) < COALESCE(c.capacidade_maxima_leads, 50)
    ORDER BY COUNT(l.id) ASC
    LIMIT 1;
  END IF;
  
  -- Assign based on score
  IF v_score < 60 THEN
    -- Low score: assign to Paulo
    IF v_paulo_closer_id IS NOT NULL THEN
      UPDATE leads 
      SET closer_id = v_paulo_closer_id, 
          status = 'atribuido',
          updated_at = NOW()
      WHERE id = p_lead_id;
      
      -- Log the assignment
      INSERT INTO lead_history (lead_id, action, details, created_by, organization_id)
      VALUES (
        p_lead_id,
        'assigned_to_closer',
        jsonb_build_object(
          'closer_id', v_paulo_closer_id,
          'assignment_type', 'low_score_auto',
          'score', v_score,
          'reason', 'Score < 60: assigned to Paulo Guimarães'
        ),
        NULL,
        v_lead.organization_id
      );
      
      RETURN jsonb_build_object(
        'success', true,
        'closer_id', v_paulo_closer_id,
        'assignment_type', 'low_score_auto',
        'score', v_score,
        'reason', 'Score < 60: assigned to Paulo Guimarães'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Paulo Guimarães not found or inactive'
      );
    END IF;
  ELSE
    -- High score: assign to primary closer
    IF v_primary_closer_id IS NOT NULL THEN
      UPDATE leads 
      SET closer_id = v_primary_closer_id,
          status = 'atribuido',
          updated_at = NOW()
      WHERE id = p_lead_id;
      
      -- Log the assignment
      INSERT INTO lead_history (lead_id, action, details, created_by, organization_id)
      VALUES (
        p_lead_id,
        'assigned_to_closer',
        jsonb_build_object(
          'closer_id', v_primary_closer_id,
          'assignment_type', 'high_score_auto',
          'score', v_score,
          'reason', 'Score >= 60: assigned to primary closer'
        ),
        NULL,
        v_lead.organization_id
      );
      
      RETURN jsonb_build_object(
        'success', true,
        'closer_id', v_primary_closer_id,
        'assignment_type', 'high_score_auto',
        'score', v_score,
        'reason', 'Score >= 60: assigned to primary closer'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No available primary closer found'
      );
    END IF;
  END IF;
END;
$$;

-- Create a function for the form submission with automatic scheduling
CREATE OR REPLACE FUNCTION process_lead_form_with_scheduling(
  p_nome_completo VARCHAR(255),
  p_email VARCHAR(255),
  p_telefone VARCHAR(20),
  p_empresa VARCHAR(255),
  p_cargo VARCHAR(100),
  p_temperatura TEXT DEFAULT 'morno',
  p_nivel_interesse TEXT DEFAULT 'medio',
  p_orcamento_disponivel DECIMAL(10,2) DEFAULT 0,
  p_decisor_principal BOOLEAN DEFAULT false,
  p_dor_principal TEXT DEFAULT NULL,
  p_preferred_datetime TIMESTAMP DEFAULT NULL,
  p_primary_closer_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_id UUID;
  v_score_result jsonb;
  v_assignment_result jsonb;
  v_appointment_result jsonb;
  v_final_result jsonb;
BEGIN
  -- Insert the lead
  INSERT INTO leads (
    nome_completo, email, telefone, empresa, cargo,
    temperatura, nivel_interesse, orcamento_disponivel,
    decisor_principal, dor_principal, organization_id,
    status, created_at, updated_at
  ) VALUES (
    p_nome_completo, p_email, p_telefone, p_empresa, p_cargo,
    p_temperatura, p_nivel_interesse, p_orcamento_disponivel,
    p_decisor_principal, p_dor_principal, p_organization_id,
    'novo', NOW(), NOW()
  ) RETURNING id INTO v_lead_id;
  
  -- Calculate score
  v_score_result := calculate_lead_score(v_lead_id);
  
  -- Assign to closer based on score
  v_assignment_result := assign_lead_by_score(v_lead_id, p_primary_closer_id);
  
  -- If assignment successful and datetime provided, schedule appointment
  IF (v_assignment_result->>'success')::boolean = true AND p_preferred_datetime IS NOT NULL THEN
    -- Create appointment
    INSERT INTO appointments (
      lead_id,
      closer_id,
      scheduled_date,
      status,
      appointment_type,
      created_at,
      organization_id
    ) VALUES (
      v_lead_id,
      (v_assignment_result->>'closer_id')::UUID,
      p_preferred_datetime,
      'agendado',
      'qualification_call',
      NOW(),
      p_organization_id
    );
    
    v_appointment_result := jsonb_build_object(
      'appointment_scheduled', true,
      'scheduled_date', p_preferred_datetime
    );
  ELSE
    v_appointment_result := jsonb_build_object(
      'appointment_scheduled', false,
      'reason', 'No datetime provided or assignment failed'
    );
  END IF;
  
  -- Build final result
  v_final_result := jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'score_result', v_score_result,
    'assignment_result', v_assignment_result,
    'appointment_result', v_appointment_result
  );
  
  RETURN v_final_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION assign_lead_by_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_lead_by_score(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION assign_lead_by_score(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION process_lead_form_with_scheduling(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, DECIMAL, BOOLEAN, TEXT, TIMESTAMP, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_lead_form_with_scheduling(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, DECIMAL, BOOLEAN, TEXT, TIMESTAMP, UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION process_lead_form_with_scheduling(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, DECIMAL, BOOLEAN, TEXT, TIMESTAMP, UUID, UUID) TO service_role;