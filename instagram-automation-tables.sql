-- Instagram Automation System Database Schema
-- This script creates tables for managing Instagram automations, funnels, and funnel steps

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (in reverse order due to foreign key constraints)
DROP TABLE IF EXISTS instagram_funnel_steps CASCADE;
DROP TABLE IF EXISTS instagram_funnels CASCADE;
DROP TABLE IF EXISTS instagram_automations CASCADE;

-- 1. Create instagram_automations table
CREATE TABLE instagram_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('comment_keyword', 'dm_keyword', 'new_follower', 'story_mention')),
    keywords TEXT[],
    response_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    responses_sent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for instagram_automations
CREATE INDEX idx_instagram_automations_trigger_type ON instagram_automations(trigger_type);
CREATE INDEX idx_instagram_automations_is_active ON instagram_automations(is_active);
CREATE INDEX idx_instagram_automations_created_at ON instagram_automations(created_at DESC);

-- 2. Create instagram_funnels table
CREATE TABLE instagram_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    leads_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for instagram_funnels
CREATE INDEX idx_instagram_funnels_is_active ON instagram_funnels(is_active);
CREATE INDEX idx_instagram_funnels_created_at ON instagram_funnels(created_at DESC);

-- 3. Create instagram_funnel_steps table
CREATE TABLE instagram_funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES instagram_funnels(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('message', 'delay', 'condition', 'action')),
    content TEXT,
    delay_minutes INTEGER,
    condition_rule TEXT,
    action_type TEXT,
    next_step_id UUID REFERENCES instagram_funnel_steps(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for instagram_funnel_steps
CREATE INDEX idx_instagram_funnel_steps_funnel_id ON instagram_funnel_steps(funnel_id);
CREATE INDEX idx_instagram_funnel_steps_step_order ON instagram_funnel_steps(funnel_id, step_order);
CREATE INDEX idx_instagram_funnel_steps_next_step_id ON instagram_funnel_steps(next_step_id);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_instagram_automations_updated_at
    BEFORE UPDATE ON instagram_automations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instagram_funnels_updated_at
    BEFORE UPDATE ON instagram_funnels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE instagram_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnel_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for instagram_automations
-- Allow authenticated users to view all automations
CREATE POLICY "Enable read access for authenticated users" ON instagram_automations
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert new automations
CREATE POLICY "Enable insert for authenticated users" ON instagram_automations
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update their own automations
CREATE POLICY "Enable update for authenticated users" ON instagram_automations
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete automations
CREATE POLICY "Enable delete for authenticated users" ON instagram_automations
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Create RLS policies for instagram_funnels
-- Allow authenticated users to view all funnels
CREATE POLICY "Enable read access for authenticated users" ON instagram_funnels
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert new funnels
CREATE POLICY "Enable insert for authenticated users" ON instagram_funnels
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update their own funnels
CREATE POLICY "Enable update for authenticated users" ON instagram_funnels
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete funnels
CREATE POLICY "Enable delete for authenticated users" ON instagram_funnels
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Create RLS policies for instagram_funnel_steps
-- Allow authenticated users to view all funnel steps
CREATE POLICY "Enable read access for authenticated users" ON instagram_funnel_steps
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert new funnel steps
CREATE POLICY "Enable insert for authenticated users" ON instagram_funnel_steps
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update funnel steps
CREATE POLICY "Enable update for authenticated users" ON instagram_funnel_steps
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete funnel steps
CREATE POLICY "Enable delete for authenticated users" ON instagram_funnel_steps
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Add comments to tables and columns for documentation
COMMENT ON TABLE instagram_automations IS 'Stores Instagram automation configurations with triggers and responses';
COMMENT ON COLUMN instagram_automations.trigger_type IS 'Type of trigger: comment_keyword, dm_keyword, new_follower, or story_mention';
COMMENT ON COLUMN instagram_automations.keywords IS 'Array of keywords that trigger this automation';
COMMENT ON COLUMN instagram_automations.responses_sent IS 'Counter for tracking number of responses sent';

COMMENT ON TABLE instagram_funnels IS 'Stores Instagram marketing funnels';
COMMENT ON COLUMN instagram_funnels.leads_count IS 'Number of leads that entered this funnel';
COMMENT ON COLUMN instagram_funnels.conversions_count IS 'Number of successful conversions from this funnel';

COMMENT ON TABLE instagram_funnel_steps IS 'Stores individual steps within Instagram funnels';
COMMENT ON COLUMN instagram_funnel_steps.step_type IS 'Type of step: message, delay, condition, or action';
COMMENT ON COLUMN instagram_funnel_steps.delay_minutes IS 'Delay duration in minutes (for delay type steps)';
COMMENT ON COLUMN instagram_funnel_steps.condition_rule IS 'Condition logic (for condition type steps)';
COMMENT ON COLUMN instagram_funnel_steps.action_type IS 'Type of action to perform (for action type steps)';
COMMENT ON COLUMN instagram_funnel_steps.next_step_id IS 'Reference to the next step in the funnel flow';