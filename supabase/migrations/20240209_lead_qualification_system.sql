-- Lead Qualification System Schema
-- Advanced lead scoring and pre-qualification system

-- Create enum for lead temperature
CREATE TYPE lead_temperature AS ENUM ('quente', 'morno', 'frio');

-- Create enum for payment intent
CREATE TYPE payment_intent AS ENUM ('a_vista', 'parcelado', 'vai_conseguir', 'nao_tem');

-- Create enum for urgency level
CREATE TYPE urgency_level AS ENUM ('imediato', 'ate_30_dias', 'ate_3_meses', 'pesquisando');

-- Create enum for business situation
CREATE TYPE business_situation AS ENUM ('tem_negocio_escalando', 'quer_comecar_com_experiencia', 'iniciante_total');

-- Main lead qualification table
CREATE TABLE lead_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  
  -- Referral and Social Proof
  origem_conhecimento VARCHAR(100) NOT NULL,
  tempo_seguindo VARCHAR(50),
  nome_indicacao VARCHAR(255),
  
  -- Business Information
  situacao_negocio business_situation NOT NULL,
  faturamento_atual DECIMAL(10, 2),
  objetivo_faturamento DECIMAL(10, 2),
  
  -- Intent and Urgency
  forma_pagamento payment_intent NOT NULL,
  urgencia urgency_level NOT NULL,
  
  -- Motivation and Experience
  motivacao_principal TEXT,
  investiu_mentoria_antes BOOLEAN DEFAULT false,
  maior_desafio TEXT,
  
  -- Scoring Results
  score_total INTEGER NOT NULL,
  temperatura lead_temperature NOT NULL,
  score_breakdown JSONB NOT NULL, -- Detailed scoring breakdown
  
  -- Psychological Profiling
  psychological_profile JSONB, -- Store behavioral analysis
  engagement_signals JSONB, -- Track engagement during form
  
  -- Form Metadata
  form_version VARCHAR(10) DEFAULT '1.0',
  completion_time INTEGER, -- Time in seconds to complete form
  abandonment_points TEXT[], -- Track where users hesitated
  device_info JSONB,
  ip_address INET,
  
  -- Status and Follow-up
  status VARCHAR(50) DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users(id),
  follow_up_date DATE,
  notes TEXT,
  
  -- Integration Fields
  crm_id VARCHAR(100),
  email_sent BOOLEAN DEFAULT false,
  whatsapp_sent BOOLEAN DEFAULT false,
  
  -- Organization support
  organization_id UUID REFERENCES organizations(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_lead_qualifications_temperatura ON lead_qualifications(temperatura);
CREATE INDEX idx_lead_qualifications_score ON lead_qualifications(score_total DESC);
CREATE INDEX idx_lead_qualifications_email ON lead_qualifications(email);
CREATE INDEX idx_lead_qualifications_whatsapp ON lead_qualifications(whatsapp);
CREATE INDEX idx_lead_qualifications_status ON lead_qualifications(status);
CREATE INDEX idx_lead_qualifications_created_at ON lead_qualifications(created_at DESC);
CREATE INDEX idx_lead_qualifications_organization ON lead_qualifications(organization_id);

-- Lead interaction tracking table
CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES lead_qualifications(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'email', 'whatsapp', 'call', 'meeting'
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  outcome VARCHAR(100),
  next_action VARCHAR(100),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Testing variations table
CREATE TABLE lead_form_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_name VARCHAR(100) NOT NULL,
  variation_code VARCHAR(20) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  traffic_percentage INTEGER DEFAULT 50, -- Percentage of traffic for this variation
  
  -- Form configuration
  questions_order JSONB,
  copy_variations JSONB,
  design_tokens JSONB,
  
  -- Performance metrics
  total_views INTEGER DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  total_hot_leads INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_views > 0 THEN (total_submissions::DECIMAL / total_views * 100)
      ELSE 0
    END
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form analytics table
CREATE TABLE lead_form_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  lead_id UUID REFERENCES lead_qualifications(id),
  variation_id UUID REFERENCES lead_form_variations(id),
  
  -- Engagement metrics
  field_interactions JSONB, -- Track time spent on each field
  field_changes JSONB, -- Track how many times each field was changed
  scroll_depth INTEGER, -- Maximum scroll percentage
  mouse_movements INTEGER, -- Total mouse movement events
  
  -- Abandonment tracking
  abandoned BOOLEAN DEFAULT false,
  abandonment_field VARCHAR(100),
  abandonment_time INTEGER, -- Seconds before abandonment
  
  -- Session info
  user_agent TEXT,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead scoring rules configuration (for dynamic scoring)
CREATE TABLE lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL,
  rule_category VARCHAR(50) NOT NULL,
  condition_field VARCHAR(100) NOT NULL,
  condition_operator VARCHAR(20) NOT NULL, -- 'equals', 'contains', 'greater_than', etc.
  condition_value TEXT NOT NULL,
  points INTEGER NOT NULL,
  weight_percentage INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  
  -- Rule metadata
  description TEXT,
  instant_hot_qualifier BOOLEAN DEFAULT false, -- If true, automatically marks as hot
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default scoring rules
INSERT INTO lead_scoring_rules (rule_name, rule_category, condition_field, condition_operator, condition_value, points, weight_percentage, instant_hot_qualifier, description)
VALUES
  -- Payment Intent (40% weight)
  ('Pagamento à Vista', 'payment_intent', 'forma_pagamento', 'equals', 'a_vista', 40, 100, true, 'Lead quer pagar à vista - qualificação instantânea como QUENTE'),
  ('Pagamento Parcelado', 'payment_intent', 'forma_pagamento', 'equals', 'parcelado', 25, 100, false, 'Lead pode parcelar'),
  ('Vai Conseguir Dinheiro', 'payment_intent', 'forma_pagamento', 'equals', 'vai_conseguir', 15, 100, false, 'Lead precisa conseguir o dinheiro'),
  ('Não Tem Dinheiro', 'payment_intent', 'forma_pagamento', 'equals', 'nao_tem', 0, 100, false, 'Lead não tem recursos'),
  
  -- Social Proof & Trust (25% weight)
  ('Indicação Mentorado', 'social_proof', 'origem_conhecimento', 'equals', 'indicacao_mentorado', 25, 100, false, 'Veio por indicação de mentorado'),
  ('Segue 1+ Ano', 'social_proof', 'tempo_seguindo', 'equals', '1_ano_mais', 20, 100, false, 'Segue há mais de 1 ano'),
  ('Segue 6+ Meses', 'social_proof', 'tempo_seguindo', 'equals', '6_meses_1_ano', 15, 100, false, 'Segue entre 6 meses e 1 ano'),
  ('Segue Menos 6 Meses', 'social_proof', 'tempo_seguindo', 'equals', 'menos_6_meses', 10, 100, false, 'Segue há menos de 6 meses'),
  
  -- Urgency & Timeline (20% weight)
  ('Urgência Imediata', 'urgency', 'urgencia', 'equals', 'imediato', 20, 100, false, 'Quer começar imediatamente'),
  ('Urgência 30 Dias', 'urgency', 'urgencia', 'equals', 'ate_30_dias', 15, 100, false, 'Quer começar em até 30 dias'),
  ('Urgência 3 Meses', 'urgency', 'urgencia', 'equals', 'ate_3_meses', 10, 100, false, 'Quer começar em até 3 meses'),
  ('Apenas Pesquisando', 'urgency', 'urgencia', 'equals', 'pesquisando', 0, 100, false, 'Está apenas pesquisando'),
  
  -- Current Situation (15% weight)
  ('Tem Negócio Escalando', 'situation', 'situacao_negocio', 'equals', 'tem_negocio_escalando', 15, 100, false, 'Já tem negócio e quer escalar'),
  ('Quer Começar com Experiência', 'situation', 'situacao_negocio', 'equals', 'quer_comecar_com_experiencia', 10, 100, false, 'Quer começar mas tem experiência'),
  ('Iniciante Total', 'situation', 'situacao_negocio', 'equals', 'iniciante_total', 5, 100, false, 'É iniciante total');

-- Email templates for lead notifications
CREATE TABLE lead_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  temperature lead_temperature NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO lead_email_templates (template_name, temperature, subject, body_html, body_text)
VALUES
  (
    'Hot Lead Notification',
    'quente',
    '🔥 LEAD QUENTE - {{nome}} - Ação Imediata Necessária',
    '<h2>Novo Lead Quente Identificado!</h2><p><strong>Nome:</strong> {{nome}}</p><p><strong>Score:</strong> {{score}}</p><p><strong>Forma de Pagamento:</strong> {{pagamento}}</p><p><strong>Urgência:</strong> {{urgencia}}</p><p><strong>WhatsApp:</strong> {{whatsapp}}</p><p><a href="{{link}}">Ver Detalhes Completos</a></p>',
    'Novo Lead Quente!\n\nNome: {{nome}}\nScore: {{score}}\nForma de Pagamento: {{pagamento}}\nUrgência: {{urgencia}}\nWhatsApp: {{whatsapp}}\n\nVer detalhes: {{link}}'
  ),
  (
    'Warm Lead Notification',
    'morno',
    '📊 Lead Morno - {{nome}} - Requer Nutrição',
    '<h2>Novo Lead Morno</h2><p><strong>Nome:</strong> {{nome}}</p><p><strong>Score:</strong> {{score}}</p><p><strong>Principais Objeções:</strong> {{objecoes}}</p><p><strong>WhatsApp:</strong> {{whatsapp}}</p><p><a href="{{link}}">Ver Detalhes</a></p>',
    'Novo Lead Morno\n\nNome: {{nome}}\nScore: {{score}}\nWhatsApp: {{whatsapp}}\n\nVer detalhes: {{link}}'
  );

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(
  p_forma_pagamento payment_intent,
  p_origem_conhecimento VARCHAR,
  p_tempo_seguindo VARCHAR,
  p_urgencia urgency_level,
  p_situacao_negocio business_situation
)
RETURNS TABLE(
  score_total INTEGER,
  temperatura lead_temperature,
  score_breakdown JSONB
) AS $$
DECLARE
  v_payment_score INTEGER := 0;
  v_social_score INTEGER := 0;
  v_urgency_score INTEGER := 0;
  v_situation_score INTEGER := 0;
  v_total_score INTEGER := 0;
  v_temperatura lead_temperature;
  v_breakdown JSONB;
BEGIN
  -- Calculate payment score (40% weight)
  v_payment_score := CASE p_forma_pagamento
    WHEN 'a_vista' THEN 40
    WHEN 'parcelado' THEN 25
    WHEN 'vai_conseguir' THEN 15
    ELSE 0
  END;
  
  -- Calculate social proof score (25% weight)
  IF p_origem_conhecimento = 'indicacao_mentorado' THEN
    v_social_score := 25;
  ELSIF p_tempo_seguindo = '1_ano_mais' THEN
    v_social_score := 20;
  ELSIF p_tempo_seguindo = '6_meses_1_ano' THEN
    v_social_score := 15;
  ELSIF p_tempo_seguindo = 'menos_6_meses' THEN
    v_social_score := 10;
  ELSE
    v_social_score := 0;
  END IF;
  
  -- Calculate urgency score (20% weight)
  v_urgency_score := CASE p_urgencia
    WHEN 'imediato' THEN 20
    WHEN 'ate_30_dias' THEN 15
    WHEN 'ate_3_meses' THEN 10
    ELSE 0
  END;
  
  -- Calculate situation score (15% weight)
  v_situation_score := CASE p_situacao_negocio
    WHEN 'tem_negocio_escalando' THEN 15
    WHEN 'quer_comecar_com_experiencia' THEN 10
    ELSE 5
  END;
  
  -- Calculate total score
  v_total_score := v_payment_score + v_social_score + v_urgency_score + v_situation_score;
  
  -- Determine temperature
  -- Instant hot qualifiers
  IF p_forma_pagamento = 'a_vista' OR 
     (p_origem_conhecimento = 'indicacao_mentorado' AND p_urgencia = 'imediato') THEN
    v_temperatura := 'quente';
  ELSIF v_total_score >= 70 THEN
    v_temperatura := 'quente';
  ELSIF v_total_score >= 40 THEN
    v_temperatura := 'morno';
  ELSE
    v_temperatura := 'frio';
  END IF;
  
  -- Build score breakdown
  v_breakdown := jsonb_build_object(
    'payment_intent', jsonb_build_object('score', v_payment_score, 'weight', '40%'),
    'social_proof', jsonb_build_object('score', v_social_score, 'weight', '25%'),
    'urgency', jsonb_build_object('score', v_urgency_score, 'weight', '20%'),
    'situation', jsonb_build_object('score', v_situation_score, 'weight', '15%'),
    'total', v_total_score,
    'max_possible', 100
  );
  
  RETURN QUERY SELECT v_total_score, v_temperatura, v_breakdown;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_qualifications_updated_at BEFORE UPDATE ON lead_qualifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_form_variations_updated_at BEFORE UPDATE ON lead_form_variations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_scoring_rules_updated_at BEFORE UPDATE ON lead_scoring_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE lead_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_form_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_email_templates ENABLE ROW LEVEL SECURITY;

-- Policies for lead_qualifications
CREATE POLICY "Users can view leads from their organization" ON lead_qualifications
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert leads" ON lead_qualifications
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Managers can update leads from their organization" ON lead_qualifications
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
    );

-- Policies for other tables (admin only for now)
CREATE POLICY "Admins can manage form variations" ON lead_form_variations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Admins can manage scoring rules" ON lead_scoring_rules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- Grant permissions
GRANT ALL ON lead_qualifications TO authenticated;
GRANT ALL ON lead_interactions TO authenticated;
GRANT ALL ON lead_form_variations TO authenticated;
GRANT ALL ON lead_form_analytics TO authenticated;
GRANT ALL ON lead_scoring_rules TO authenticated;
GRANT ALL ON lead_email_templates TO authenticated;

-- Allow anonymous users to insert lead qualifications and analytics
GRANT INSERT ON lead_qualifications TO anon;
GRANT INSERT ON lead_form_analytics TO anon;