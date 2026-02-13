-- ================================================
-- CORREÇÃO DA FUNÇÃO DE TESTE - TIPOS CORRETOS
-- ================================================
-- Corrige erro de tipos entre VARCHAR(255) e TEXT
-- ================================================

-- Dropar função de teste com problema de tipos
DROP FUNCTION IF EXISTS test_lead_scoring_system(INTEGER);

-- Recriar função de teste com tipos corretos
CREATE OR REPLACE FUNCTION test_lead_scoring_system(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  lead_id UUID,
  nome VARCHAR(255),  -- Mudança: usar VARCHAR(255) ao invés de TEXT
  temperatura TEXT,
  score INTEGER,
  score_details JSONB,
  closer_assigned UUID,
  assignment_result JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH scored_leads AS (
    SELECT 
      l.id,
      l.nome_completo,
      COALESCE(l.temperatura, 'morno')::text as temp,
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
      sl.temp,
      COALESCE((sl.score_result->>'total_score')::integer, 0) as score_val,
      sl.score_result,
      CASE 
        WHEN COALESCE((sl.score_result->>'total_score')::integer, 0) >= 60 OR sl.temp = 'quente' 
        THEN auto_assign_lead_to_closer(sl.id)
        ELSE jsonb_build_object('success', false, 'reason', 'Score too low for auto-assignment')
      END as assignment
    FROM scored_leads sl
  )
  SELECT 
    al.id::UUID as lead_id,
    al.nome_completo::VARCHAR(255) as nome,
    al.temp::TEXT as temperatura,
    al.score_val::INTEGER as score,
    al.score_result::JSONB as score_details,
    (SELECT closer_id FROM leads WHERE id = al.id)::UUID as closer_assigned,
    al.assignment::JSONB as assignment_result
  FROM assigned_leads al;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FUNÇÃO DE TESTE SIMPLIFICADA PARA DEBUG
-- ================================================

CREATE OR REPLACE FUNCTION test_simple_lead_scoring(limit_count INTEGER DEFAULT 3)
RETURNS TABLE (
  lead_id UUID,
  nome TEXT,
  temperatura TEXT,
  score_old INTEGER,
  score_new JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as lead_id,
    l.nome_completo::TEXT as nome,
    COALESCE(l.temperatura, 'morno')::TEXT as temperatura,
    COALESCE(l.lead_score, 0)::INTEGER as score_old,
    calculate_lead_score(l.id) as score_new
  FROM leads l 
  WHERE l.organization_id IS NOT NULL
  ORDER BY l.created_at DESC 
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FUNÇÃO PARA TESTAR UM LEAD ESPECÍFICO
-- ================================================

CREATE OR REPLACE FUNCTION test_single_lead_score(target_lead_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  lead_info RECORD;
BEGIN
  -- Buscar informações básicas do lead
  SELECT 
    nome_completo,
    temperatura,
    origem,
    lead_score,
    created_at,
    organization_id
  INTO lead_info
  FROM leads 
  WHERE id = target_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead não encontrado',
      'lead_id', target_lead_id
    );
  END IF;

  -- Calcular novo score
  SELECT calculate_lead_score(target_lead_id) INTO result;

  -- Retornar informações completas
  RETURN jsonb_build_object(
    'success', true,
    'lead_id', target_lead_id,
    'lead_info', jsonb_build_object(
      'nome', lead_info.nome_completo,
      'temperatura', lead_info.temperatura,
      'origem', lead_info.origem,
      'score_antigo', lead_info.lead_score,
      'criado_em', lead_info.created_at
    ),
    'score_calculation', result
  );
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FUNÇÃO PARA ESTATÍSTICAS DE LEADS
-- ================================================

CREATE OR REPLACE FUNCTION get_leads_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  WITH lead_stats AS (
    SELECT 
      COUNT(*) as total_leads,
      COUNT(CASE WHEN temperatura = 'quente' THEN 1 END) as leads_quentes,
      COUNT(CASE WHEN temperatura = 'morno' THEN 1 END) as leads_mornos,
      COUNT(CASE WHEN temperatura = 'frio' THEN 1 END) as leads_frios,
      COUNT(CASE WHEN closer_id IS NOT NULL THEN 1 END) as leads_atribuidos,
      COUNT(CASE WHEN lead_score >= 60 THEN 1 END) as leads_high_score,
      AVG(COALESCE(lead_score, 0))::INTEGER as score_medio,
      MAX(COALESCE(lead_score, 0)) as score_maximo,
      MIN(COALESCE(lead_score, 0)) as score_minimo
    FROM leads 
    WHERE organization_id IS NOT NULL
  )
  SELECT jsonb_build_object(
    'total_leads', ls.total_leads,
    'por_temperatura', jsonb_build_object(
      'quente', ls.leads_quentes,
      'morno', ls.leads_mornos,
      'frio', ls.leads_frios
    ),
    'atribuicao', jsonb_build_object(
      'atribuidos', ls.leads_atribuidos,
      'nao_atribuidos', ls.total_leads - ls.leads_atribuidos,
      'taxa_atribuicao', CASE 
        WHEN ls.total_leads > 0 THEN ROUND((ls.leads_atribuidos::float / ls.total_leads * 100), 2)
        ELSE 0
      END || '%'
    ),
    'score_stats', jsonb_build_object(
      'leads_high_score', ls.leads_high_score,
      'score_medio', ls.score_medio,
      'score_maximo', ls.score_maximo,
      'score_minimo', ls.score_minimo
    ),
    'generated_at', NOW()
  ) INTO stats
  FROM lead_stats ls;

  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- COMANDO PARA TESTAR
-- ================================================

-- Testar a função corrigida
SELECT 'Funções de teste corrigidas e prontas para uso!' as status;

-- Para testar, use:
-- SELECT * FROM test_simple_lead_scoring(3);
-- SELECT * FROM get_leads_stats();
-- SELECT * FROM test_single_lead_score('ID_DO_LEAD_AQUI');