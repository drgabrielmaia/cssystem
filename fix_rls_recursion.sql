-- Script para corrigir o problema de recursão infinita nas políticas RLS
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, desabilitar temporariamente as políticas problemáticas
ALTER TABLE organization_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE mentorados DISABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_respostas DISABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas que podem causar recursão
DROP POLICY IF EXISTS "Users can view own organization users" ON organization_users;
DROP POLICY IF EXISTS "Users can view organization mentorados" ON mentorados;
DROP POLICY IF EXISTS "Users can view organization formularios" ON formularios_respostas;

-- 3. Recriar políticas de forma não recursiva para organization_users
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org users" 
ON organization_users FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can view same org users" 
ON organization_users FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
        LIMIT 1
    )
);

-- 4. Recriar políticas para mentorados sem recursão
ALTER TABLE mentorados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org mentorados" 
ON mentorados FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
        LIMIT 1
    )
);

CREATE POLICY "Users can insert org mentorados" 
ON mentorados FOR INSERT 
WITH CHECK (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
        LIMIT 1
    )
);

CREATE POLICY "Users can update org mentorados" 
ON mentorados FOR UPDATE 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
        LIMIT 1
    )
);

-- 5. Recriar políticas para formularios_respostas
ALTER TABLE formularios_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org formularios" 
ON formularios_respostas FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
        LIMIT 1
    )
);

CREATE POLICY "Users can insert org formularios" 
ON formularios_respostas FOR INSERT 
WITH CHECK (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
        LIMIT 1
    )
);

-- 6. Criar função auxiliar para obter organization_id do usuário (mais eficiente)
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

-- 7. Alternativa: usar a função nas políticas (opcional, mais eficiente)
-- Descomente se quiser usar esta abordagem:
/*
DROP POLICY IF EXISTS "Users can view org mentorados" ON mentorados;
CREATE POLICY "Users can view org mentorados" 
ON mentorados FOR SELECT 
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can view org formularios" ON formularios_respostas;
CREATE POLICY "Users can view org formularios" 
ON formularios_respostas FOR SELECT 
USING (organization_id = get_user_organization_id());
*/

-- 8. Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('organization_users', 'mentorados', 'formularios_respostas')
ORDER BY tablename, policyname;
