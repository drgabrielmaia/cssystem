-- Criar tabela de usuários do sistema financeiro
CREATE TABLE IF NOT EXISTS usuarios_financeiro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cargo VARCHAR(255),
    senha_hash TEXT, -- Para futuro sistema de login
    permissoes JSONB DEFAULT '{"dashboard": true, "transacoes": false, "orcamentos": false, "relatorios": false, "usuarios": false}',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_financeiro_email ON usuarios_financeiro(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_financeiro_ativo ON usuarios_financeiro(ativo);

-- Inserir usuário administrador padrão
INSERT INTO usuarios_financeiro (nome, email, cargo, permissoes, ativo)
VALUES (
    'Administrador',
    'admin@financeiro.com',
    'Administrador Financeiro',
    '{"dashboard": true, "transacoes": true, "orcamentos": true, "relatorios": true, "usuarios": true}',
    true
) ON CONFLICT (email) DO NOTHING;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_usuarios_financeiro_updated_at ON usuarios_financeiro;
CREATE TRIGGER update_usuarios_financeiro_updated_at
    BEFORE UPDATE ON usuarios_financeiro
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE usuarios_financeiro IS 'Tabela de usuários com acesso ao sistema financeiro';
COMMENT ON COLUMN usuarios_financeiro.permissoes IS 'Permissões do usuário em formato JSON: dashboard, transacoes, orcamentos, relatorios, usuarios';
COMMENT ON COLUMN usuarios_financeiro.senha_hash IS 'Hash da senha do usuário para futuro sistema de autenticação';
COMMENT ON COLUMN usuarios_financeiro.ativo IS 'Status ativo/inativo do usuário';