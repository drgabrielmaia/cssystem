

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'lead_score') THEN
    ALTER TABLE leads ADD COLUMN lead_score INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'lead_score_detalhado') THEN
    ALTER TABLE leads ADD COLUMN lead_score_detalhado JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'closer_atribuido_em') THEN
    ALTER TABLE leads ADD COLUMN closer_atribuido_em TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'closers' AND column_name = 'capacidade_maxima_leads') THEN
    ALTER TABLE closers ADD COLUMN capacidade_maxima_leads INTEGER DEFAULT 50;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'closers' AND column_name = 'especialidade') THEN
    ALTER TABLE closers ADD COLUMN especialidade VARCHAR(100) DEFAULT 'geral';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'closers' AND column_name = 'nome') THEN
    ALTER TABLE closers ADD COLUMN nome VARCHAR(255) GENERATED ALWAYS AS (nome_completo) STORED;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'closers' AND column_name = 'ativo') THEN
    ALTER TABLE closers ADD COLUMN ativo BOOLEAN GENERATED ALWAYS AS (status_contrato = 'ativo') STORED;
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS lead_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  organization_id UUID REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON lead_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_history_organization_id ON lead_history(organization_id);


CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_score INTEGER := 0;
  v_details jsonb := '{}'::jsonb;
  v_temperature TEXT;
  v_interactions_count INTEGER;
  v_days_since_creation INTEGER;
  v_has_medical_score BOOLEAN;
BEGIN
  SELECT 
    l.*,
    COALESCE(l.temperatura, 'morno') as temp,
    COALESCE((l.lead_score_detalhado->>'medical_score')::integer, 0) as medical_score,
    EXTRACT(DAY FROM (NOW() - l.created_at)) as days_old,
    (SELECT COUNT(*) FROM whatsapp_messages w WHERE w.lead_id = l.id) as msg_count
  INTO v_lead
  FROM leads l
  WHERE l.id = lead_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found: %', lead_id;
  END IF;
  
  CASE v_lead.temp
    WHEN 'quente' THEN 
      v_score := v_score + 40;
      v_details := v_details || jsonb_build_object('temperature_score', 40);
    WHEN 'morno' THEN 
      v_score := v_score + 20;
      v_details := v_details || jsonb_build_object('temperature_score', 20);
    ELSE 
      v_score := v_score + 10;
      v_details := v_details || jsonb_build_object('temperature_score', 10);
  END CASE;
  
  CASE v_lead.origem
    WHEN 'instagram_ads' THEN 
      v_score := v_score + 20;
      v_details := v_details || jsonb_build_object('origin_score', 20);
    WHEN 'google_ads' THEN 
      v_score := v_score + 18;
      v_details := v_details || jsonb_build_object('origin_score', 18);
    WHEN 'facebook_ads' THEN 
      v_score := v_score + 16;
      v_details := v_details || jsonb_build_object('origin_score', 16);
    WHEN 'indicacao' THEN 
      v_score := v_score + 15;
      v_details := v_details || jsonb_build_object('origin_score', 15);
    ELSE 
      v_score := v_score + 10;
      v_details := v_details || jsonb_build_object('origin_score', 10);
  END CASE;
  
  IF v_lead.msg_count >= 10 THEN
    v_score := v_score + 20;
    v_details := v_details || jsonb_build_object('interaction_score', 20);
  ELSIF v_lead.msg_count >= 5 THEN
    v_score := v_score + 15;
    v_details := v_details || jsonb_build_object('interaction_score', 15);
  ELSIF v_lead.msg_count >= 1 THEN
    v_score := v_score + 10;
    v_details := v_details || jsonb_build_object('interaction_score', 10);
  ELSE
    v_score := v_score + 0;
    v_details := v_details || jsonb_build_object('interaction_score', 0);
  END IF;
  
  IF v_lead.days_old <= 1 THEN
    v_score := v_score + 10;
    v_details := v_details || jsonb_build_object('recency_score', 10);
  ELSIF v_lead.days_old <= 3 THEN
    v_score := v_score + 8;
    v_details := v_details || jsonb_build_object('recency_score', 8);
  ELSIF v_lead.days_old <= 7 THEN
    v_score := v_score + 5;
    v_details := v_details || jsonb_build_object('recency_score', 5);
  ELSE
    v_score := v_score + 2;
    v_details := v_details || jsonb_build_object('recency_score', 2);
  END IF;
  
  IF v_lead.medical_score > 0 THEN
    v_score := v_score + LEAST(v_lead.medical_score / 10, 10);
    v_details := v_details || jsonb_build_object('medical_form_score', LEAST(v_lead.medical_score / 10, 10));
  END IF;
  
  v_details := v_details || jsonb_build_object(
    'total_score', v_score,
    'calculated_at', NOW(),
    'lead_age_days', v_lead.days_old,
    'message_count', v_lead.msg_count,
    'temperature', v_lead.temp,
    'origin', v_lead.origem
  );
  
  UPDATE leads 
  SET 
    lead_score = v_score,
    lead_score_detalhado = v_details,
    updated_at = NOW()
  WHERE id = lead_id;
  
  RETURN v_details;
END;
$$;


CREATE OR REPLACE FUNCTION auto_assign_lead_to_closer(p_lead_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_closer RECORD;
  v_result jsonb;
  v_assignment_reason TEXT;
BEGIN
  SELECT 
    l.*,
    COALESCE(l.lead_score, 0) as score,
    COALESCE(l.temperatura, 'morno') as temp
  INTO v_lead
  FROM leads l
  WHERE l.id = p_lead_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;
  
  IF v_lead.closer_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'Lead already assigned to closer',
      'closer_id', v_lead.closer_id
    );
  END IF;
  
  SELECT 
    c.id,
    c.nome_completo as nome,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('convertido', 'perdido', 'desqualificado')) as active_leads,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'convertido' AND l.updated_at > NOW() - INTERVAL '30 days') as recent_conversions,
    COALESCE(c.capacidade_maxima_leads, 50) as max_capacity,
    COALESCE(c.especialidade, 'geral') as specialty
  INTO v_closer
  FROM closers c
  LEFT JOIN leads l ON l.closer_id = c.id
  WHERE 
    c.status_contrato = 'ativo'
    AND c.organization_id = v_lead.organization_id
  GROUP BY c.id, c.nome_completo, c.capacidade_maxima_leads, c.especialidade
  HAVING COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('convertido', 'perdido', 'desqualificado')) < COALESCE(c.capacidade_maxima_leads, 50)
  ORDER BY 
    COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('convertido', 'perdido', 'desqualificado')) ASC,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'convertido' AND l.updated_at > NOW() - INTERVAL '30 days') DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    SELECT 
      c.id,
      c.nome_completo as nome
    INTO v_closer
    FROM closers c
    WHERE 
      c.status_contrato = 'ativo'
      AND c.organization_id = v_lead.organization_id
    ORDER BY RANDOM()
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'reason', 'No available closers found'
      );
    END IF;
    
    v_assignment_reason := 'Assigned to available closer (all at capacity)';
  ELSE
    v_assignment_reason := 'Assigned based on workload and performance';
  END IF;
  
  UPDATE leads
  SET 
    closer_id = v_closer.id,
    closer_atribuido_em = NOW(),
    status = CASE 
      WHEN status = 'novo' THEN 'em_atendimento'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_lead_id;
  
  INSERT INTO lead_history (
    lead_id,
    action,
    details,
    created_at,
    created_by,
    organization_id
  ) VALUES (
    p_lead_id,
    'auto_assigned',
    jsonb_build_object(
      'closer_id', v_closer.id,
      'closer_name', v_closer.nome,
      'reason', v_assignment_reason,
      'lead_score', v_lead.score,
      'temperature', v_lead.temp
    ),
    NOW(),
    'system',
    v_lead.organization_id
  );
  
  v_result := jsonb_build_object(
    'success', true,
    'closer_id', v_closer.id,
    'closer_name', v_closer.nome,
    'reason', v_assignment_reason,
    'active_leads', v_closer.active_leads
  );
  
  RETURN v_result;
END;
$$;


CREATE OR REPLACE FUNCTION trigger_calculate_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       OLD.temperatura IS DISTINCT FROM NEW.temperatura OR
       OLD.origem IS DISTINCT FROM NEW.origem OR
       OLD.status IS DISTINCT FROM NEW.status
     )) THEN
    PERFORM calculate_lead_score(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_calculate_lead_score ON leads;
CREATE TRIGGER auto_calculate_lead_score
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_lead_score();


CREATE OR REPLACE FUNCTION trigger_auto_assign_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  
  IF NEW.closer_id IS NULL AND 
     (NEW.lead_score >= 60 OR NEW.temperatura = 'quente') THEN
    
    v_result := auto_assign_lead_to_closer(NEW.id);
    
    IF NOT (v_result->>'success')::boolean THEN
      INSERT INTO lead_history (
        lead_id,
        action,
        details,
        created_at,
        created_by,
        organization_id
      ) VALUES (
        NEW.id,
        'auto_assignment_failed',
        v_result,
        NOW(),
        'system',
        NEW.organization_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_assign_hot_leads ON leads;
CREATE TRIGGER auto_assign_hot_leads
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_lead();


CREATE OR REPLACE FUNCTION test_lead_scoring_system(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  lead_id UUID,
  nome VARCHAR,
  temperatura VARCHAR,
  score INTEGER,
  score_details JSONB,
  closer_assigned UUID,
  assignment_result JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH scored_leads AS (
    SELECT 
      l.id,
      l.nome_completo,
      l.temperatura,
      calculate_lead_score(l.id) as score_result
    FROM leads l
    WHERE l.organization_id IS NOT NULL
    ORDER BY l.created_at DESC
    LIMIT limit_count
  ),
  assigned_leads AS (
    SELECT 
      sl.id,
      sl.nome_completo,
      sl.temperatura,
      (sl.score_result->>'total_score')::integer as score,
      sl.score_result,
      CASE 
        WHEN (sl.score_result->>'total_score')::integer >= 60 OR sl.temperatura = 'quente' THEN
          auto_assign_lead_to_closer(sl.id)
        ELSE
          jsonb_build_object('success', false, 'reason', 'Score too low for auto-assignment')
      END as assignment
    FROM scored_leads sl
  )
  SELECT 
    al.id as lead_id,
    al.nome_completo as nome,
    al.temperatura,
    al.score,
    al.score_result as score_details,
    (SELECT closer_id FROM leads WHERE id = al.id) as closer_assigned,
    al.assignment as assignment_result
  FROM assigned_leads al;
END;
$$;


CREATE OR REPLACE FUNCTION recalculate_all_lead_scores()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  FOR v_lead IN SELECT id FROM leads WHERE organization_id IS NOT NULL
  LOOP
    PERFORM calculate_lead_score(v_lead.id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_lead_distribution_stats()
RETURNS TABLE (
  closer_id UUID,
  closer_name VARCHAR,
  active_leads INTEGER,
  hot_leads INTEGER,
  warm_leads INTEGER,
  cold_leads INTEGER,
  avg_score NUMERIC,
  capacity INTEGER,
  utilization_percent NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as closer_id,
    c.nome_completo as closer_name,
    COUNT(l.id) FILTER (WHERE l.status NOT IN ('convertido', 'perdido', 'desqualificado'))::INTEGER as active_leads,
    COUNT(l.id) FILTER (WHERE l.temperatura = 'quente' AND l.status NOT IN ('convertido', 'perdido', 'desqualificado'))::INTEGER as hot_leads,
    COUNT(l.id) FILTER (WHERE l.temperatura = 'morno' AND l.status NOT IN ('convertido', 'perdido', 'desqualificado'))::INTEGER as warm_leads,
    COUNT(l.id) FILTER (WHERE l.temperatura = 'frio' AND l.status NOT IN ('convertido', 'perdido', 'desqualificado'))::INTEGER as cold_leads,
    AVG(l.lead_score) as avg_score,
    COALESCE(c.capacidade_maxima_leads, 50) as capacity,
    ROUND((COUNT(l.id) FILTER (WHERE l.status NOT IN ('convertido', 'perdido', 'desqualificado'))::NUMERIC / NULLIF(COALESCE(c.capacidade_maxima_leads, 50), 0)) * 100, 2) as utilization_percent
  FROM closers c
  LEFT JOIN leads l ON l.closer_id = c.id
  WHERE c.status_contrato = 'ativo'
  GROUP BY c.id, c.nome_completo, c.capacidade_maxima_leads
  ORDER BY utilization_percent DESC;
END;
$$;





