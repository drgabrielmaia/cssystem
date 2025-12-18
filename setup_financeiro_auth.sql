-- ===================================
-- 🔧 SETUP AUTENTICAÇÃO FINANCEIRO
-- ===================================
-- Criar usuário de autenticação para o sistema financeiro

-- 1. Verificar usuários financeiro existentes
SELECT 'USUÁRIOS FINANCEIRO CADASTRADOS:' as info;
SELECT id, nome, email, cargo, ativo FROM usuarios_financeiro;

-- 2. Inserir usuário financeiro padrão (se não existir)
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
  permissoes = '["full_access", "reports", "analytics"]'::jsonb;

-- 3. MANUAL: Criar usuário no Supabase Auth
-- Você precisa ir no Supabase Dashboard > Authentication > Users
-- e criar um usuário com:
-- Email: admin@medicosderesultado.com.br
-- Password: (definir senha segura)
-- Confirm: true

SELECT 'PRÓXIMOS PASSOS:' as instrucao,
       '1. Vá no Supabase Dashboard > Authentication > Users' as passo1,
       '2. Criar usuário: admin@medicosderesultado.com.br' as passo2,
       '3. Definir senha segura' as passo3,
       '4. Marcar como confirmado' as passo4;