-- Adicionar colunas para integração automática com comissões e mentoria
ALTER TABLE transacoes_financeiras 
ADD COLUMN IF NOT EXISTS referencia_externa VARCHAR(100),
ADD COLUMN IF NOT EXISTS automatico BOOLEAN DEFAULT false;

-- Criar índice para referência externa
CREATE INDEX IF NOT EXISTS idx_transacoes_referencia_externa ON transacoes_financeiras(referencia_externa);

-- Comentários para documentação
COMMENT ON COLUMN transacoes_financeiras.referencia_externa IS 'Referência externa para comissões (commission_ID) e pagamentos (payment_ID)';
COMMENT ON COLUMN transacoes_financeiras.automatico IS 'Indica se a transação foi criada automaticamente pelo sistema';

-- Atualizar categorias padrão se não existirem
INSERT INTO categorias_financeiras (nome, tipo, cor) VALUES
('Comissões Pagas', 'saida', '#EF4444'),
('Mentoria', 'entrada', '#10B981')
ON CONFLICT (nome) DO NOTHING;