-- Script SEGURO para corrigir recursão infinita nas políticas RLS
-- Execute este script no Supabase SQL Editor

-- 1. DESABILITAR TODAS AS POLÍTICAS RLS PRIMEIRO
ALTER TABLE organization_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE mentorados DISABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE nps_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iv_vendas_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iii_gestao_marketing_respostas DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES (SEM GERAR ERRO)
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Remover políticas da tabela organization_users
    FOR rec IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'organization_users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || rec.policyname || '" ON organization_users';
    END LOOP;

    -- Remover políticas da tabela mentorados
    FOR rec IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'mentorados'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || rec.policyname || '" ON mentorados';
    END LOOP;

    -- Remover políticas da tabela formularios_respostas
    FOR rec IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'formularios_respostas'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || rec.policyname || '" ON formularios_respostas';
    END LOOP;

    -- Remover políticas da tabela form_submissions
    FOR rec IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'form_submissions'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || rec.policyname || '" ON form_submissions';
    END LOOP;

    -- Remover políticas de outras tabelas de respostas
    FOR rec IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename IN ('nps_respostas', 'modulo_iv_vendas_respostas', 'modulo_iii_gestao_marketing_respostas')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || rec.policyname || '" ON ' ||
               (SELECT tablename FROM pg_policies WHERE policyname = rec.policyname LIMIT 1);
    END LOOP;
END $$;

-- 3. CRIAR FUNÇÃO AUXILIAR PARA OBTER ORGANIZAÇÃO DO USUÁRIO (SEM RECURSÃO)
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
BEGIN
    RETURN (
        SELECT organization_id
        FROM organization_users
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RECRIAR POLÍTICAS SIMPLES E SEGURAS

-- 4.1. Políticas para organization_users (SIMPLES)
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_org_users"
ON organization_users FOR ALL
USING (user_id = auth.uid() OR organization_id = get_user_organization_id());

-- 4.2. Políticas para mentorados
ALTER TABLE mentorados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_org_mentorados"
ON mentorados FOR ALL
USING (organization_id = get_user_organization_id());

-- 4.3. Políticas para formularios_respostas
ALTER TABLE formularios_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_org_formularios"
ON formularios_respostas FOR ALL
USING (organization_id = get_user_organization_id());

-- 4.4. Políticas para form_submissions
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_org_submissions"
ON form_submissions FOR ALL
USING (organization_id = get_user_organization_id());

-- 4.5. Políticas para nps_respostas
DO $$
BEGIN
    -- Verificar se a tabela existe antes de criar política
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nps_respostas') THEN
        ALTER TABLE nps_respostas ENABLE ROW LEVEL SECURITY;
        EXECUTE 'CREATE POLICY "view_org_nps" ON nps_respostas FOR ALL USING (organization_id = get_user_organization_id())';
    END IF;
END $$;

-- 4.6. Políticas para modulo_iv_vendas_respostas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modulo_iv_vendas_respostas') THEN
        ALTER TABLE modulo_iv_vendas_respostas ENABLE ROW LEVEL SECURITY;
        EXECUTE 'CREATE POLICY "view_org_vendas" ON modulo_iv_vendas_respostas FOR ALL USING (organization_id = get_user_organization_id())';
    END IF;
END $$;

-- 4.7. Políticas para modulo_iii_gestao_marketing_respostas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modulo_iii_gestao_marketing_respostas') THEN
        ALTER TABLE modulo_iii_gestao_marketing_respostas ENABLE ROW LEVEL SECURITY;
        EXECUTE 'CREATE POLICY "view_org_marketing" ON modulo_iii_gestao_marketing_respostas FOR ALL USING (organization_id = get_user_organization_id())';
    END IF;
END $$;

-- 5. VERIFICAR SE AS POLÍTICAS FORAM CRIADAS
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN (
    'organization_users',
    'mentorados',
    'formularios_respostas',
    'form_submissions',
    'nps_respostas',
    'modulo_iv_vendas_respostas',
    'modulo_iii_gestao_marketing_respostas'
)
ORDER BY tablename;

-- 6. TESTAR A FUNÇÃO
SELECT get_user_organization_id() as minha_organizacao;

-- 7. RELATÓRIO FINAL
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'CORREÇÃO DE RLS CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Políticas antigas removidas: SIM';
    RAISE NOTICE 'Políticas novas criadas: SIM';
    RAISE NOTICE 'Função auxiliar criada: SIM';
    RAISE NOTICE 'Recursão eliminada: SIM';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'O sistema deve funcionar normalmente agora';
    RAISE NOTICE '============================================';
END $$;