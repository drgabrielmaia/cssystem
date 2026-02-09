-- LIMPAR DADOS FINANCEIROS PARA SINCRONIZAÇÃO LIMPA
-- ATENÇÃO: Isso apaga TODOS os dados financeiros!

BEGIN;

-- 1. Limpar todas as transações financeiras
DELETE FROM transacoes_financeiras;

-- 2. Resetar categorias para padrões (manter estrutura, limpar personalizadas)
DELETE FROM categorias_financeiras WHERE nome NOT IN (
  'Mentoria', 'Clínica', 'Eventos', 'Consultoria', 'Cursos Online', 'Investimentos',
  'Marketing', 'Pessoal', 'Infraestrutura', 'Impostos', 'Equipamentos', 
  'Capacitação', 'Jurídico', 'Viagens', 'Comissões Pagas'
);

-- 3. Aplicar organization_id às categorias padrão se necessário
UPDATE categorias_financeiras 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- 4. Resetar usuários financeiros (manter admin principal)
DELETE FROM usuarios_financeiro WHERE email != 'financeiro@admin.com';

-- 5. Atualizar usuário admin com organization_id se necessário  
UPDATE usuarios_financeiro 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- 6. Verificação - mostrar estado após limpeza
SELECT 'Transações restantes' as tabela, COUNT(*) as total FROM transacoes_financeiras
UNION ALL
SELECT 'Categorias restantes', COUNT(*) FROM categorias_financeiras  
UNION ALL
SELECT 'Usuários restantes', COUNT(*) FROM usuarios_financeiro;

-- 7. Mostrar categorias que ficaram
SELECT nome, tipo, organization_id FROM categorias_financeiras ORDER BY tipo, nome;

COMMIT;

-- INSTRUÇÕES APÓS EXECUÇÃO:
-- 1. Execute add_organization_to_financial_tables.sql para adicionar organization_id
-- 2. Use o botão "Sync" no dashboard para importar dados históricos
-- 3. Verifique se os dados estão sendo filtrados corretamente por organização