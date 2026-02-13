-- Create scoring configuration system
-- Allows customizable scoring rules and form questions

-- Table to store scoring configurations
CREATE TABLE IF NOT EXISTS scoring_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Basic field scores
    telefone_score INTEGER DEFAULT 10,
    email_score INTEGER DEFAULT 10,
    empresa_score INTEGER DEFAULT 15,
    cargo_score INTEGER DEFAULT 15,
    
    -- Temperature scoring
    temperatura_quente_score INTEGER DEFAULT 30,
    temperatura_morno_score INTEGER DEFAULT 20,
    temperatura_frio_score INTEGER DEFAULT 10,
    
    -- Interest level scoring
    nivel_interesse_alto_score INTEGER DEFAULT 25,
    nivel_interesse_medio_score INTEGER DEFAULT 15,
    nivel_interesse_baixo_score INTEGER DEFAULT 5,
    
    -- Other factors
    orcamento_disponivel_score INTEGER DEFAULT 20,
    decisor_principal_score INTEGER DEFAULT 25,
    dor_principal_score INTEGER DEFAULT 15,
    
    -- Assignment rules
    low_score_threshold INTEGER DEFAULT 60,
    low_score_closer_id UUID, -- Paulo Guimarães ou outro
    high_score_closer_id UUID, -- Closer principal
    
    -- Form settings
    form_title VARCHAR(255) DEFAULT 'Qualificação de Lead',
    form_description TEXT DEFAULT 'Preencha os dados para calcular automaticamente o score e agendar sua call',
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (low_score_closer_id) REFERENCES closers(id),
    FOREIGN KEY (high_score_closer_id) REFERENCES closers(id)
);

-- Table for custom form questions
CREATE TABLE IF NOT EXISTS form_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scoring_config_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- 'text', 'email', 'tel', 'number', 'select', 'radio', 'checkbox', 'textarea'
    is_required BOOLEAN DEFAULT false,
    score_points INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    placeholder_text VARCHAR(255),
    help_text VARCHAR(255),
    
    -- For select/radio options
    options JSONB, -- [{"value": "alto", "label": "Alto", "score": 25}]
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (scoring_config_id) REFERENCES scoring_configurations(id) ON DELETE CASCADE
);

-- Function to calculate score with custom configuration
CREATE OR REPLACE FUNCTION calculate_lead_score_with_config(
    p_lead_id UUID,
    p_scoring_config_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_lead RECORD;
    v_config RECORD;
    v_score INTEGER := 0;
    v_score_details JSONB;
    v_org_id UUID;
BEGIN
    -- Get lead data
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('total_score', 0, 'success', false, 'error', 'Lead not found');
    END IF;
    
    v_org_id := v_lead.organization_id;
    
    -- Get scoring configuration
    IF p_scoring_config_id IS NOT NULL THEN
        SELECT * INTO v_config FROM scoring_configurations WHERE id = p_scoring_config_id;
    ELSE
        SELECT * INTO v_config FROM scoring_configurations 
        WHERE organization_id = v_org_id AND is_active = true
        ORDER BY created_at DESC LIMIT 1;
    END IF;
    
    -- Use default scoring if no config found
    IF NOT FOUND THEN
        -- Use default scoring values
        v_config := ROW(
            gen_random_uuid(), v_org_id, 'Default', true, NOW(), NOW(),
            10, 10, 15, 15, -- basic scores
            30, 20, 10,     -- temperature scores
            25, 15, 5,      -- interest scores
            20, 25, 15,     -- other scores
            60, NULL, NULL, -- assignment rules
            'Qualificação de Lead', 'Formulário padrão'
        )::scoring_configurations;
    END IF;
    
    -- Calculate score based on configuration
    -- Basic fields
    IF v_lead.telefone IS NOT NULL AND v_lead.telefone != '' THEN
        v_score := v_score + v_config.telefone_score;
    END IF;
    
    IF v_lead.email IS NOT NULL AND v_lead.email != '' THEN
        v_score := v_score + v_config.email_score;
    END IF;
    
    IF v_lead.empresa IS NOT NULL AND v_lead.empresa != '' THEN
        v_score := v_score + v_config.empresa_score;
    END IF;
    
    IF v_lead.cargo IS NOT NULL AND v_lead.cargo != '' THEN
        v_score := v_score + v_config.cargo_score;
    END IF;
    
    -- Temperature
    IF v_lead.temperatura = 'quente' THEN
        v_score := v_score + v_config.temperatura_quente_score;
    ELSIF v_lead.temperatura = 'morno' THEN
        v_score := v_score + v_config.temperatura_morno_score;
    ELSIF v_lead.temperatura = 'frio' THEN
        v_score := v_score + v_config.temperatura_frio_score;
    END IF;
    
    -- Interest level
    IF v_lead.nivel_interesse = 'alto' THEN
        v_score := v_score + v_config.nivel_interesse_alto_score;
    ELSIF v_lead.nivel_interesse = 'medio' THEN
        v_score := v_score + v_config.nivel_interesse_medio_score;
    ELSIF v_lead.nivel_interesse = 'baixo' THEN
        v_score := v_score + v_config.nivel_interesse_baixo_score;
    END IF;
    
    -- Budget and decision maker
    IF v_lead.orcamento_disponivel > 0 THEN
        v_score := v_score + v_config.orcamento_disponivel_score;
    END IF;
    
    IF v_lead.decisor_principal = true THEN
        v_score := v_score + v_config.decisor_principal_score;
    END IF;
    
    IF v_lead.dor_principal IS NOT NULL AND v_lead.dor_principal != '' THEN
        v_score := v_score + v_config.dor_principal_score;
    END IF;
    
    -- Build detailed score breakdown
    v_score_details := jsonb_build_object(
        'telefone', CASE WHEN v_lead.telefone IS NOT NULL THEN v_config.telefone_score ELSE 0 END,
        'email', CASE WHEN v_lead.email IS NOT NULL THEN v_config.email_score ELSE 0 END,
        'empresa', CASE WHEN v_lead.empresa IS NOT NULL THEN v_config.empresa_score ELSE 0 END,
        'cargo', CASE WHEN v_lead.cargo IS NOT NULL THEN v_config.cargo_score ELSE 0 END,
        'temperatura', CASE 
            WHEN v_lead.temperatura = 'quente' THEN v_config.temperatura_quente_score
            WHEN v_lead.temperatura = 'morno' THEN v_config.temperatura_morno_score
            WHEN v_lead.temperatura = 'frio' THEN v_config.temperatura_frio_score
            ELSE 0
        END,
        'nivel_interesse', CASE
            WHEN v_lead.nivel_interesse = 'alto' THEN v_config.nivel_interesse_alto_score
            WHEN v_lead.nivel_interesse = 'medio' THEN v_config.nivel_interesse_medio_score
            WHEN v_lead.nivel_interesse = 'baixo' THEN v_config.nivel_interesse_baixo_score
            ELSE 0
        END,
        'orcamento', CASE WHEN v_lead.orcamento_disponivel > 0 THEN v_config.orcamento_disponivel_score ELSE 0 END,
        'decisor', CASE WHEN v_lead.decisor_principal = true THEN v_config.decisor_principal_score ELSE 0 END,
        'dor_principal', CASE WHEN v_lead.dor_principal IS NOT NULL THEN v_config.dor_principal_score ELSE 0 END,
        'total_score', v_score,
        'calculated_at', NOW(),
        'config_used', v_config.name
    );
    
    -- Update lead score
    UPDATE leads 
    SET lead_score = v_score, lead_score_detalhado = v_score_details
    WHERE id = p_lead_id;
    
    -- Log the scoring
    INSERT INTO lead_history (lead_id, action, details, created_by, organization_id)
    VALUES (
        p_lead_id,
        'score_calculated',
        jsonb_build_object(
            'score', v_score,
            'config_name', v_config.name,
            'config_id', v_config.id
        ),
        NULL,
        v_org_id
    );
    
    RETURN jsonb_build_object(
        'total_score', v_score, 
        'success', true, 
        'details', v_score_details,
        'config_used', v_config.name,
        'threshold', v_config.low_score_threshold
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('total_score', 0, 'success', false, 'error', SQLERRM);
END;
$$;

-- Function to assign lead with custom configuration
CREATE OR REPLACE FUNCTION assign_lead_with_config(
    p_lead_id UUID,
    p_scoring_config_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_lead RECORD;
    v_config RECORD;
    v_score_result JSONB;
    v_score INTEGER;
    v_closer_id UUID;
    v_assignment_type TEXT;
    v_reason TEXT;
BEGIN
    -- Get lead
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
    END IF;
    
    -- Calculate score with configuration
    v_score_result := calculate_lead_score_with_config(p_lead_id, p_scoring_config_id);
    v_score := (v_score_result->>'total_score')::INTEGER;
    
    -- Get configuration for assignment rules
    IF p_scoring_config_id IS NOT NULL THEN
        SELECT * INTO v_config FROM scoring_configurations WHERE id = p_scoring_config_id;
    ELSE
        SELECT * INTO v_config FROM scoring_configurations 
        WHERE organization_id = v_lead.organization_id AND is_active = true
        ORDER BY created_at DESC LIMIT 1;
    END IF;
    
    -- Default assignment if no config
    IF NOT FOUND THEN
        v_config.low_score_threshold := 60;
        v_config.low_score_closer_id := NULL;
        v_config.high_score_closer_id := NULL;
    END IF;
    
    -- Determine assignment
    IF v_score < v_config.low_score_threshold THEN
        v_closer_id := v_config.low_score_closer_id;
        v_assignment_type := 'low_score_auto';
        v_reason := format('Score %s < %s: assigned to low score closer', v_score, v_config.low_score_threshold);
    ELSE
        v_closer_id := v_config.high_score_closer_id;
        v_assignment_type := 'high_score_auto';
        v_reason := format('Score %s >= %s: assigned to high score closer', v_score, v_config.low_score_threshold);
    END IF;
    
    -- Assign if closer is configured
    IF v_closer_id IS NOT NULL THEN
        UPDATE leads 
        SET closer_id = v_closer_id, 
            status = 'atribuido',
            updated_at = NOW()
        WHERE id = p_lead_id;
        
        -- Log assignment
        INSERT INTO lead_history (lead_id, action, details, created_by, organization_id)
        VALUES (
            p_lead_id,
            'assigned_to_closer',
            jsonb_build_object(
                'closer_id', v_closer_id,
                'assignment_type', v_assignment_type,
                'score', v_score,
                'threshold', v_config.low_score_threshold,
                'reason', v_reason,
                'config_id', v_config.id
            ),
            NULL,
            v_lead.organization_id
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'closer_id', v_closer_id,
            'assignment_type', v_assignment_type,
            'score', v_score,
            'threshold', v_config.low_score_threshold,
            'reason', v_reason
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', format('No closer configured for %s score range', v_assignment_type),
            'score', v_score,
            'threshold', v_config.low_score_threshold
        );
    END IF;
END;
$$;

-- Create default configuration for existing organizations
INSERT INTO scoring_configurations (
    organization_id, 
    name, 
    is_active,
    form_title,
    form_description
)
SELECT 
    id,
    'Configuração Padrão',
    true,
    'Qualificação de Lead',
    'Preencha os dados para calcular automaticamente o score e agendar sua call'
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM scoring_configurations WHERE is_active = true);

-- Grant permissions
GRANT ALL ON scoring_configurations TO authenticated, anon, service_role;
GRANT ALL ON form_questions TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION calculate_lead_score_with_config TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION assign_lead_with_config TO authenticated, anon, service_role;