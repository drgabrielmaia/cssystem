-- Instagram Automation System - Simplified SQL for Supabase SQL Editor
-- Execute this script directly in your Supabase SQL Editor

-- 1. Create instagram_automations table
CREATE TABLE IF NOT EXISTS instagram_automations (
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

-- 2. Create instagram_funnels table
CREATE TABLE IF NOT EXISTS instagram_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    leads_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create instagram_funnel_steps table
CREATE TABLE IF NOT EXISTS instagram_funnel_steps (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_instagram_automations_trigger_type ON instagram_automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_instagram_automations_is_active ON instagram_automations(is_active);
CREATE INDEX IF NOT EXISTS idx_instagram_funnels_is_active ON instagram_funnels(is_active);
CREATE INDEX IF NOT EXISTS idx_instagram_funnel_steps_funnel_id ON instagram_funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_instagram_funnel_steps_step_order ON instagram_funnel_steps(funnel_id, step_order);

-- Enable RLS
ALTER TABLE instagram_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnel_steps ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (adjust as needed for your auth setup)
CREATE POLICY "Allow authenticated users full access to automations"
ON instagram_automations FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to funnels"
ON instagram_funnels FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to funnel steps"
ON instagram_funnel_steps FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');