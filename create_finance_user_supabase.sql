-- ===================================
-- 🔐 CRIAR USUÁRIO FINANCEIRO
-- ===================================
-- Execute este SQL no Supabase SQL Editor para criar usuário financeiro

-- 1. Verificar se usuário já existe na tabela
SELECT 'VERIFICANDO USUÁRIO EXISTENTE:' as info;
SELECT * FROM usuarios_financeiro WHERE email = 'admin@medicosderesultado.com.br';

-- 2. Inserir/atualizar usuário financeiro
INSERT INTO usuarios_financeiro (nome, email, cargo, permissoes, ativo)
VALUES (
  'Admin Financeiro',
  'admin@medicosderesultado.com.br',
  'Administrador',
  '["full_access", "reports", "analytics"]'::jsonb,
  true
)
ON CONFLICT (email) DO UPDATE SET
  ativo = true,
  cargo = 'Administrador',
  permissoes = '["full_access", "reports", "analytics"]'::jsonb,
  updated_at = NOW();

-- 3. CRIAR USUÁRIO NO AUTH (MANUAL)
-- Vá no Supabase Dashboard:
-- Authentication > Users > Add user
-- Email: admin@medicosderesultado.com.br
-- Password: Admin123!@# (depois trocar)
-- Auto Confirm User: YES

-- 4. Verificar resultado
SELECT 'USUÁRIO FINANCEIRO CONFIGURADO:' as resultado;
SELECT id, nome, email, cargo, ativo, created_at FROM usuarios_financeiro WHERE email = 'admin@medicosderesultado.com.br';

SELECT '✅ PRÓXIMOS PASSOS:' as instrucoes,
       '1. Vá no Supabase Dashboard > Authentication > Users' as passo1,
       '2. Add User > admin@medicosderesultado.com.br' as passo2,
       '3. Password: Admin123!@# (trocar depois)' as passo3,
       '4. Auto Confirm User: YES' as passo4,
       '5. Acesse /financeiro/login e teste' as passo5;