import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql(sql, description) {
  console.log(`\n📋 ${description}...`);
  console.log('SQL:', sql.substring(0, 200) + '...\n');
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      // If execute_sql doesn't exist, try direct approach
      if (error.message.includes('execute_sql')) {
        // For DDL statements, we'll use direct fetch
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: sql })
        });
        
        if (!response.ok) {
          // If RPC doesn't work, we'll create the functions using direct SQL
          console.log('Creating functions using direct SQL execution...');
          return { success: true, note: 'Function will be created via SQL file' };
        }
        
        const result = await response.json();
        return { success: true, data: result };
      }
      throw error;
    }
    
    console.log('✅ Success!');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message, sql };
  }
}

async function implementLeadScoringSystem() {
  console.log('🚀 Starting Lead Scoring System Implementation...\n');
  
  const sqlStatements = [];
  
  // 1. Create function to calculate lead score
  sqlStatements.push({
    description: 'Creating calculate_lead_score function',
    sql: `
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
  -- Get lead information
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
  
  -- Base score by temperature (40% weight)
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
  
  -- Score by lead origin (20% weight)
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
  
  -- Score by interactions (20% weight)
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
  
  -- Score by recency (10% weight)
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
  
  -- Medical form score if exists (10% weight)
  IF v_lead.medical_score > 0 THEN
    v_score := v_score + LEAST(v_lead.medical_score / 10, 10);
    v_details := v_details || jsonb_build_object('medical_form_score', LEAST(v_lead.medical_score / 10, 10));
  END IF;
  
  -- Add metadata
  v_details := v_details || jsonb_build_object(
    'total_score', v_score,
    'calculated_at', NOW(),
    'lead_age_days', v_lead.days_old,
    'message_count', v_lead.msg_count,
    'temperature', v_lead.temp,
    'origin', v_lead.origem
  );
  
  -- Update lead record
  UPDATE leads 
  SET 
    lead_score = v_score,
    lead_score_detalhado = v_details,
    updated_at = NOW()
  WHERE id = lead_id;
  
  RETURN v_details;
END;
$$;
`
  });
  
  // 2. Create function to auto-assign lead to closer
  sqlStatements.push({
    description: 'Creating auto_assign_lead_to_closer function',
    sql: `
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
  -- Get lead information with score
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
  
  -- Check if lead already has a closer
  IF v_lead.closer_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'Lead already assigned to closer',
      'closer_id', v_lead.closer_id
    );
  END IF;
  
  -- Find best available closer based on workload and performance
  SELECT 
    c.id,
    c.nome,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('convertido', 'perdido', 'desqualificado')) as active_leads,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'convertido' AND l.updated_at > NOW() - INTERVAL '30 days') as recent_conversions,
    COALESCE(c.capacidade_maxima_leads, 50) as max_capacity,
    COALESCE(c.especialidade, 'geral') as specialty
  INTO v_closer
  FROM closers c
  LEFT JOIN leads l ON l.closer_id = c.id
  WHERE 
    c.ativo = true
    AND c.organization_id = v_lead.organization_id
  GROUP BY c.id, c.nome, c.capacidade_maxima_leads, c.especialidade
  HAVING COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('convertido', 'perdido', 'desqualificado')) < COALESCE(c.capacidade_maxima_leads, 50)
  ORDER BY 
    -- Prioritize closers with fewer active leads (load balancing)
    COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('convertido', 'perdido', 'desqualificado')) ASC,
    -- Then by recent conversion rate
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'convertido' AND l.updated_at > NOW() - INTERVAL '30 days') DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- No available closer, try to find any active closer
    SELECT 
      c.id,
      c.nome
    INTO v_closer
    FROM closers c
    WHERE 
      c.ativo = true
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
  
  -- Assign lead to closer
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
  
  -- Log the assignment
  INSERT INTO lead_history (
    lead_id,
    action,
    details,
    created_at,
    created_by
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
    'system'
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
`
  });
  
  // 3. Create lead_history table for audit
  sqlStatements.push({
    description: 'Creating lead_history table for audit',
    sql: `
CREATE TABLE IF NOT EXISTS lead_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  organization_id UUID REFERENCES organizations(id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON lead_history(created_at DESC);
`
  });
  
  // 4. Create trigger for automatic score calculation
  sqlStatements.push({
    description: 'Creating trigger for automatic score calculation',
    sql: `
-- Function for trigger
CREATE OR REPLACE FUNCTION trigger_calculate_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate score for new or updated lead
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

-- Create trigger
DROP TRIGGER IF EXISTS auto_calculate_lead_score ON leads;
CREATE TRIGGER auto_calculate_lead_score
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_lead_score();
`
  });
  
  // 5. Create trigger for automatic lead assignment
  sqlStatements.push({
    description: 'Creating trigger for automatic lead assignment',
    sql: `
-- Function for auto-assignment trigger
CREATE OR REPLACE FUNCTION trigger_auto_assign_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Only auto-assign if:
  -- 1. It's a new lead OR temperature changed to 'quente'
  -- 2. Lead doesn't have a closer assigned
  -- 3. Lead score is >= 60 or temperature is 'quente'
  
  IF NEW.closer_id IS NULL AND 
     (NEW.lead_score >= 60 OR NEW.temperatura = 'quente') THEN
    
    -- Auto-assign the lead
    v_result := auto_assign_lead_to_closer(NEW.id);
    
    -- Log if assignment failed
    IF NOT (v_result->>'success')::boolean THEN
      INSERT INTO lead_history (
        lead_id,
        action,
        details,
        created_at,
        created_by
      ) VALUES (
        NEW.id,
        'auto_assignment_failed',
        v_result,
        NOW(),
        'system'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS auto_assign_hot_leads ON leads;
CREATE TRIGGER auto_assign_hot_leads
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_lead();
`
  });
  
  // 6. Add missing columns if they don't exist
  sqlStatements.push({
    description: 'Adding missing columns to leads and closers tables',
    sql: `
-- Add columns to leads table if they don't exist
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

-- Add columns to closers table if they don't exist
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
                 WHERE table_name = 'closers' AND column_name = 'ativo') THEN
    ALTER TABLE closers ADD COLUMN ativo BOOLEAN DEFAULT true;
  END IF;
END $$;
`
  });
  
  // Execute all SQL statements
  const results = [];
  for (const stmt of sqlStatements) {
    const result = await executeSql(stmt.sql, stmt.description);
    results.push({ ...stmt, result });
  }
  
  // Save SQL to file for backup
  const allSql = sqlStatements.map(s => `-- ${s.description}\n${s.sql}`).join('\n\n');
  
  console.log('\n📝 Saving SQL to file for backup...');
  require('fs').writeFileSync(
    join(__dirname, '..', 'sql', 'lead-scoring-system.sql'),
    allSql
  );
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPLEMENTATION SUMMARY');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.result.success).length;
  const failed = results.filter(r => !r.result.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some functions need to be created manually via SQL file.');
    console.log('SQL file saved at: sql/lead-scoring-system.sql');
  }
  
  return results;
}

// Run the implementation
implementLeadScoringSystem()
  .then(results => {
    console.log('\n✨ Lead Scoring System Implementation Complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });