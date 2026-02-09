-- Adicionar organization_id às tabelas financeiras para isolamento de dados
-- URGENTE: Corrigir segurança de dados financeiros

-- 1. Adicionar organization_id à tabela de transações financeiras
ALTER TABLE transacoes_financeiras 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 2. Adicionar organization_id à tabela de categorias financeiras  
ALTER TABLE categorias_financeiras 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 3. Adicionar organization_id à tabela de usuários financeiro
ALTER TABLE usuarios_financeiro 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_organization ON transacoes_financeiras(organization_id, data_transacao);
CREATE INDEX IF NOT EXISTS idx_categorias_organization ON categorias_financeiras(organization_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_fin_organization ON usuarios_financeiro(organization_id);

-- 5. Atualizar transações existentes para a organização padrão (se existir)
-- ATENÇÃO: Isso atribui todas as transações existentes à primeira organização encontrada
-- Em produção, você deve fazer isso manualmente com cuidado
UPDATE transacoes_financeiras 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- 6. Atualizar categorias existentes para a organização padrão
UPDATE categorias_financeiras 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- 7. Atualizar usuários financeiros para a organização padrão  
UPDATE usuarios_financeiro 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- 8. Tornar organization_id obrigatório (depois de popular os dados)
-- DESCOMENTE ESTAS LINHAS APÓS EXECUTAR E VERIFICAR OS DADOS:
-- ALTER TABLE transacoes_financeiras ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE categorias_financeiras ALTER COLUMN organization_id SET NOT NULL;  
-- ALTER TABLE usuarios_financeiro ALTER COLUMN organization_id SET NOT NULL;

-- 9. Adicionar foreign keys
-- ALTER TABLE transacoes_financeiras ADD CONSTRAINT fk_transacoes_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
-- ALTER TABLE categorias_financeiras ADD CONSTRAINT fk_categorias_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
-- ALTER TABLE usuarios_financeiro ADD CONSTRAINT fk_usuarios_fin_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- 10. Atualizar RLS policies (Row Level Security)
-- Categorias financeiras - só da organização do usuário
DROP POLICY IF EXISTS "Financeiro pode gerenciar categorias" ON categorias_financeiras;
CREATE POLICY "Users can manage categories in their organization" ON categorias_financeiras 
FOR ALL USING (organization_id = (SELECT organization_id FROM organization_users WHERE user_id = auth.uid() LIMIT 1));

-- Transações financeiras - só da organização do usuário  
DROP POLICY IF EXISTS "Financeiro pode gerenciar transações" ON transacoes_financeiras;
CREATE POLICY "Users can manage transactions in their organization" ON transacoes_financeiras 
FOR ALL USING (organization_id = (SELECT organization_id FROM organization_users WHERE user_id = auth.uid() LIMIT 1));

-- Usuários financeiros - só da organização do usuário
DROP POLICY IF EXISTS "Financeiro pode gerenciar usuários" ON usuarios_financeiro;
CREATE POLICY "Users can manage financial users in their organization" ON usuarios_financeiro 
FOR ALL USING (organization_id = (SELECT organization_id FROM organization_users WHERE user_id = auth.uid() LIMIT 1));

-- 11. Comentários para documentação
COMMENT ON COLUMN transacoes_financeiras.organization_id IS 'Organização dona desta transação - isolamento de dados';
COMMENT ON COLUMN categorias_financeiras.organization_id IS 'Organização dona desta categoria - isolamento de dados';  
COMMENT ON COLUMN usuarios_financeiro.organization_id IS 'Organização dona deste usuário financeiro - isolamento de dados';