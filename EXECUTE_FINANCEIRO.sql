-- SQL para criar tabelas do sistema financeiro
-- Execute este script no Supabase para habilitar o dashboard financeiro

-- Tabela de usuários do financeiro
CREATE TABLE IF NOT EXISTS usuarios_financeiro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cargo VARCHAR(100),
    permissoes JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de transações financeiras
CREATE TABLE IF NOT EXISTS transacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    valor DECIMAL(15,2) NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    fornecedor VARCHAR(255),
    centro_custo VARCHAR(100),
    data_transacao DATE NOT NULL,
    data_vencimento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'liquidado', 'atrasado', 'cancelado', 'pago')),
    recorrente BOOLEAN DEFAULT false,
    periodicidade VARCHAR(20) CHECK (periodicidade IN ('mensal', 'trimestral', 'semestral', 'anual')),
    anexos JSONB DEFAULT '[]',
    observacoes TEXT,
    created_by UUID REFERENCES usuarios_financeiro(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de contas a pagar
CREATE TABLE IF NOT EXISTS contas_pagar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fornecedor VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    categoria VARCHAR(100),
    centro_custo VARCHAR(100),
    status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'atrasado', 'renegociado')),
    numero_documento VARCHAR(100),
    observacoes TEXT,
    anexos JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de contas a receber
CREATE TABLE IF NOT EXISTS contas_receber (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    categoria VARCHAR(100),
    status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'recebido', 'atrasado', 'cancelado')),
    numero_documento VARCHAR(100),
    observacoes TEXT,
    anexos JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    categoria VARCHAR(100) NOT NULL,
    valor_orcado DECIMAL(15,2) NOT NULL,
    valor_realizado DECIMAL(15,2) DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ano, mes, categoria)
);

-- Tabela de centros de custo
CREATE TABLE IF NOT EXISTS centros_custo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    responsavel VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes_financeiras(data_transacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes_financeiras(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes_financeiras(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);

-- Inserir usuário padrão do financeiro (você pode alterar)
INSERT INTO usuarios_financeiro (nome, email, cargo, permissoes)
VALUES (
    'Administrador Financeiro',
    'financeiro@empresa.com',
    'Gerente Financeiro',
    '{"dashboard": true, "transacoes": true, "orcamentos": true, "relatorios": true}'
) ON CONFLICT (email) DO NOTHING;

-- Inserir alguns centros de custo padrão
INSERT INTO centros_custo (codigo, nome, descricao) VALUES
('ADM', 'Administrativo', 'Despesas administrativas gerais'),
('MKT', 'Marketing', 'Investimentos em marketing e publicidade'),
('TI', 'Tecnologia', 'Infraestrutura e sistemas'),
('RH', 'Recursos Humanos', 'Folha de pagamento e benefícios'),
('COM', 'Comercial', 'Vendas e relacionamento com clientes')
ON CONFLICT (codigo) DO NOTHING;

-- Inserir algumas categorias de exemplo como transações
INSERT INTO transacoes_financeiras (tipo, valor, descricao, categoria, data_transacao, status) VALUES
('entrada', 50000.00, 'Receita de Vendas', 'Receita', CURRENT_DATE - INTERVAL '5 days', 'liquidado'),
('entrada', 25000.00, 'Consultoria Projeto A', 'Serviços', CURRENT_DATE - INTERVAL '3 days', 'liquidado'),
('saida', 8000.00, 'Aluguel Escritório', 'Infraestrutura', CURRENT_DATE - INTERVAL '2 days', 'pago'),
('saida', 3500.00, 'Marketing Digital', 'Marketing', CURRENT_DATE - INTERVAL '1 day', 'pendente'),
('entrada', 15000.00, 'Pagamento Cliente XYZ', 'Receita', CURRENT_DATE, 'pendente')
ON CONFLICT DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE usuarios_financeiro IS 'Usuários autorizados a acessar o dashboard financeiro';
COMMENT ON TABLE transacoes_financeiras IS 'Registro de todas as transações financeiras (entradas e saídas)';
COMMENT ON TABLE contas_pagar IS 'Controle de contas a pagar';
COMMENT ON TABLE contas_receber IS 'Controle de contas a receber';
COMMENT ON TABLE orcamentos IS 'Orçamentos mensais por categoria';
COMMENT ON TABLE centros_custo IS 'Centros de custo para categorização de despesas';