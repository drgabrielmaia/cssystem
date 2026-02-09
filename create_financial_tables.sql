-- Criar tabelas para o sistema financeiro

-- Tabela de usuários do financeiro (se não existir)
CREATE TABLE IF NOT EXISTS usuarios_financeiro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    nivel_acesso VARCHAR(20) DEFAULT 'operador' CHECK (nivel_acesso IN ('admin', 'operador')),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de categorias financeiras
CREATE TABLE IF NOT EXISTS categorias_financeiras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    cor VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de transações financeiras
CREATE TABLE IF NOT EXISTS transacoes_financeiras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    valor DECIMAL(12,2) NOT NULL,
    descricao TEXT NOT NULL,
    categoria_id UUID REFERENCES categorias_financeiras(id),
    data_transacao DATE NOT NULL,
    metodo_pagamento VARCHAR(100),
    observacoes TEXT,
    usuario_id UUID REFERENCES usuarios_financeiro(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO categorias_financeiras (nome, tipo, cor, descricao) VALUES
-- Entradas
('Mentoria', 'entrada', '#10B981', 'Receitas de serviços de mentoria'),
('Clínica', 'entrada', '#3B82F6', 'Receitas da clínica médica'),
('Eventos', 'entrada', '#8B5CF6', 'Receitas de eventos e palestras'),
('Consultoria', 'entrada', '#F59E0B', 'Receitas de consultoria empresarial'),
('Cursos Online', 'entrada', '#EF4444', 'Receitas de cursos e treinamentos online'),
('Investimentos', 'entrada', '#06B6D4', 'Rendimentos de investimentos'),

-- Saídas
('Marketing', 'saida', '#EF4444', 'Gastos com marketing e publicidade'),
('Pessoal', 'saida', '#F97316', 'Salários, comissões e benefícios'),
('Infraestrutura', 'saida', '#84CC16', 'Aluguel, energia, internet, etc.'),
('Impostos', 'saida', '#6366F1', 'Impostos e taxas governamentais'),
('Equipamentos', 'saida', '#EC4899', 'Compra e manutenção de equipamentos'),
('Capacitação', 'saida', '#14B8A6', 'Treinamentos e cursos para equipe'),
('Jurídico', 'saida', '#A855F7', 'Serviços jurídicos e contábeis'),
('Viagens', 'saida', '#F59E0B', 'Viagens e hospedagens')
ON CONFLICT (nome) DO NOTHING;

-- Inserir usuário financeiro padrão (se não existir)
INSERT INTO usuarios_financeiro (nome, email, nivel_acesso, status) 
VALUES ('Administrador Financeiro', 'financeiro@admin.com', 'admin', 'ativo')
ON CONFLICT (email) DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes_financeiras(data_transacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria ON transacoes_financeiras(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes_financeiras(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario ON transacoes_financeiras(usuario_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categorias_financeiras_updated_at BEFORE UPDATE ON categorias_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transacoes_financeiras_updated_at BEFORE UPDATE ON transacoes_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_financeiro_updated_at BEFORE UPDATE ON usuarios_financeiro FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_financeiro ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar conforme necessário)
CREATE POLICY "Financeiro pode ver todas as categorias" ON categorias_financeiras FOR ALL USING (true);
CREATE POLICY "Financeiro pode gerenciar transações" ON transacoes_financeiras FOR ALL USING (true);
CREATE POLICY "Financeiro pode ver usuários" ON usuarios_financeiro FOR SELECT USING (true);

-- Verificar as tabelas criadas
SELECT 
    'categorias_financeiras' as tabela,
    COUNT(*) as total_registros
FROM categorias_financeiras
UNION ALL
SELECT 
    'usuarios_financeiro' as tabela,
    COUNT(*) as total_registros
FROM usuarios_financeiro
UNION ALL
SELECT 
    'transacoes_financeiras' as tabela,
    COUNT(*) as total_registros
FROM transacoes_financeiras;