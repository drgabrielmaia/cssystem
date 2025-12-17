-- Corrigir Row Level Security para tabelas do Instagram
-- Problema: RLS ativo sem políticas = ninguém consegue acessar

-- 1. DESATIVAR RLS temporariamente (solução rápida)
ALTER TABLE instagram_automations DISABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnels DISABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnel_steps DISABLE ROW LEVEL SECURITY;

-- 2. OU criar políticas adequadas (solução completa)
-- Descomente as linhas abaixo se quiser manter RLS ativo:

/*
-- Reativar RLS
ALTER TABLE instagram_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnel_steps ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acesso total (por enquanto)
CREATE POLICY "Allow all operations on instagram_automations" ON instagram_automations
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on instagram_funnels" ON instagram_funnels
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on instagram_funnel_steps" ON instagram_funnel_steps
    FOR ALL USING (true) WITH CHECK (true);
*/

-- Verificar se as tabelas novas precisam de RLS desativado
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagram_messages') THEN
        ALTER TABLE instagram_messages DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagram_conversations') THEN
        ALTER TABLE instagram_conversations DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagram_automation_logs') THEN
        ALTER TABLE instagram_automation_logs DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagram_api_config') THEN
        ALTER TABLE instagram_api_config DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;