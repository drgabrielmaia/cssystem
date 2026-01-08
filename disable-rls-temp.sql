-- Script para desativar RLS temporariamente nas tabelas que não têm organization_id
-- Execute no SQL Editor do Supabase Dashboard

-- Desativar RLS na tabela dividas
ALTER TABLE dividas DISABLE ROW LEVEL SECURITY;

-- Desativar RLS na tabela comissoes
ALTER TABLE comissoes DISABLE ROW LEVEL SECURITY;

-- Opcional: Ver o status das tabelas
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('dividas', 'comissoes');