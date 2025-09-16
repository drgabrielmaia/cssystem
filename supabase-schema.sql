-- Customer Success Management System Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela mentorados (seguindo especificações exatas)
CREATE TABLE IF NOT EXISTS mentorados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    turma TEXT NOT NULL,
    estado_entrada TEXT NOT NULL,
    estado_atual TEXT NOT NULL DEFAULT 'ativo',
    data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
    observacoes_privadas TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Criar tabela formularios_respostas
CREATE TABLE IF NOT EXISTS formularios_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    formulario TEXT NOT NULL,
    resposta_json JSONB NOT NULL,
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_mentorados_turma ON mentorados(turma);
CREATE INDEX IF NOT EXISTS idx_mentorados_estado_atual ON mentorados(estado_atual);
CREATE INDEX IF NOT EXISTS idx_formularios_mentorado_id ON formularios_respostas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_formularios_tipo ON formularios_respostas(formulario);
CREATE INDEX IF NOT EXISTS idx_formularios_data_envio ON formularios_respostas(data_envio);

-- Desabilitar RLS temporariamente para desenvolvimento
ALTER TABLE mentorados DISABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_respostas DISABLE ROW LEVEL SECURITY;


-- Criar tabela para respostas NPS
CREATE TABLE IF NOT EXISTS nps_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    nota_nps INTEGER NOT NULL CHECK (nota_nps >= 0 AND nota_nps <= 10),
    o_que_surpreendeu_positivamente TEXT,
    autoriza_depoimento BOOLEAN,
    depoimento TEXT,
    o_que_faltou_para_9_10 TEXT,
    ajuste_simples_maior_impacto TEXT,
    o_que_impediu_experiencia_9_10 TEXT,
    o_que_mudar_para_melhorar TEXT,
    pode_contatar BOOLEAN,
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance da tabela NPS
CREATE INDEX IF NOT EXISTS idx_nps_mentorado_id ON nps_respostas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_nps_nota ON nps_respostas(nota_nps);
CREATE INDEX IF NOT EXISTS idx_nps_data_resposta ON nps_respostas(data_resposta);

-- RLS para tabela NPS
ALTER TABLE nps_respostas ENABLE ROW LEVEL SECURITY;

-- Inserir dados de exemplo
INSERT INTO mentorados (nome_completo, email, telefone, turma, estado_entrada, estado_atual, data_entrada, data_inicio_mentoria) VALUES 
('Ana Paula Silva', 'ana.paula@email.com', '(11) 99999-1111', 'Turma A', 'novo', 'ativo', '2024-08-15', '2024-08-20'),
('Carlos Eduardo Santos', 'carlos.eduardo@email.com', '(11) 99999-2222', 'Turma A', 'novo', 'engajado', '2024-08-10', '2024-08-12'),
('Mariana Costa', 'mariana.costa@email.com', '(11) 99999-3333', 'Turma B', 'interessado', 'ativo', '2024-07-25', '2024-08-01'),
('João Victor Lima', 'joao.victor@email.com', '(11) 99999-4444', 'Turma A', 'novo', 'pausado', '2024-08-05', '2024-08-08'),
('Fernanda Oliveira', 'fernanda.oliveira@email.com', '(11) 99999-5555', 'Turma B', 'interessado', 'ativo', '2024-07-20', '2024-07-25'),
('Rafael Pereira', 'rafael.pereira@email.com', '(11) 99999-6666', 'Turma C', 'novo', 'inativo', '2024-06-30', '2024-07-05'),
('Juliana Martins', 'juliana.martins@email.com', '(11) 99999-7777', 'Turma B', 'interessado', 'engajado', '2024-08-01', '2024-08-03'),
('Bruno Rodrigues', 'bruno.rodrigues@email.com', '(11) 99999-8888', 'Turma A', 'novo', 'ativo', '2024-08-12', '2024-08-15'),
('Camila Ferreira', 'camila.ferreira@email.com', '(11) 99999-9999', 'Turma C', 'interessado', 'cancelado', '2024-06-15', '2024-06-20'),
('Diego Almeida', 'diego.almeida@email.com', '(11) 99999-0000', 'Turma B', 'novo', 'ativo', '2024-08-18', '2024-08-20');

-- Inserir algumas respostas de formulários
INSERT INTO formularios_respostas (mentorado_id, formulario, resposta_json) 
SELECT 
  m.id,
  'modulo_iv_vendas',
  '{"qualificacao_pacientes": 4, "spin_selling": "sim", "venda_consultiva": "parcialmente", "taxa_fechamento": 3, "nps": 9}'::jsonb
FROM mentorados m 
WHERE m.nome_completo = 'Ana Paula Silva';

INSERT INTO formularios_respostas (mentorado_id, formulario, resposta_json)
SELECT 
  m.id,
  'modulo_iii_gestao_marketing', 
  '{"jornada_paciente": "sim", "modelo_disney": "sim", "neuromarketing": "parcialmente", "reduzir_noshow": 4, "nps": 8}'::jsonb
FROM mentorados m 
WHERE m.nome_completo = 'Carlos Eduardo Santos';

INSERT INTO formularios_respostas (mentorado_id, formulario, resposta_json)
SELECT 
  m.id,
  'nps_feedback',
  '{"nota_nps": 10, "o_que_surpreendeu_positivamente": "A mentoria superou minhas expectativas", "autoriza_depoimento": true, "pode_contatar": true}'::jsonb
FROM mentorados m 
WHERE m.nome_completo = 'Mariana Costa';


-- Criar tabelas específicas para cada módulo de feedback

-- Tabela para respostas do Módulo IV - Vendas
CREATE TABLE IF NOT EXISTS modulo_iv_vendas_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    qualificacao_pacientes INTEGER NOT NULL CHECK (qualificacao_pacientes >= 1 AND qualificacao_pacientes <= 5),
    spin_selling TEXT NOT NULL CHECK (spin_selling IN ('sim', 'parcialmente', 'nao')),
    venda_consultiva TEXT NOT NULL CHECK (venda_consultiva IN ('sim', 'parcialmente', 'nao')),
    tecnica_ancoragem TEXT CHECK (tecnica_ancoragem IN ('sim', 'parcialmente', 'nao')),
    taxa_fechamento INTEGER CHECK (taxa_fechamento >= 1 AND taxa_fechamento <= 5),
    feedback_preco TEXT,
    nps INTEGER NOT NULL CHECK (nps >= 1 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para respostas do Módulo III - Gestão e Marketing
CREATE TABLE IF NOT EXISTS modulo_iii_gestao_marketing_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    jornada_paciente TEXT NOT NULL CHECK (jornada_paciente IN ('sim', 'parcialmente', 'nao')),
    modelo_disney TEXT NOT NULL CHECK (modelo_disney IN ('sim', 'parcialmente', 'nao')),
    neuromarketing TEXT NOT NULL CHECK (neuromarketing IN ('sim', 'parcialmente', 'nao')),
    reduzir_noshow INTEGER NOT NULL CHECK (reduzir_noshow >= 1 AND reduzir_noshow <= 5),
    estruturar_processos TEXT NOT NULL CHECK (estruturar_processos IN ('sim', 'parcialmente', 'nao')),
    feedback_operacao TEXT,
    nps INTEGER NOT NULL CHECK (nps >= 1 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para respostas do Módulo II - Posicionamento Digital
CREATE TABLE IF NOT EXISTS modulo_ii_posicionamento_digital_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    proposta_valor INTEGER NOT NULL CHECK (proposta_valor >= 1 AND proposta_valor <= 5),
    bio_cta INTEGER NOT NULL CHECK (bio_cta >= 1 AND bio_cta <= 5),
    funil_editorial TEXT NOT NULL CHECK (funil_editorial IN ('sim', 'nao')),
    formatos_aprendidos TEXT[] NOT NULL, -- Array de formatos: stories, reels, carrossel, estatico
    confianca_publicar INTEGER NOT NULL CHECK (confianca_publicar >= 1 AND confianca_publicar <= 5),
    bloqueio_consistencia TEXT NOT NULL,
    nps INTEGER NOT NULL CHECK (nps >= 1 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para respostas do Módulo Capacitação Técnica
CREATE TABLE IF NOT EXISTS modulo_capacitacao_tecnica_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    clareza_tratamentos INTEGER NOT NULL CHECK (clareza_tratamentos >= 1 AND clareza_tratamentos <= 5),
    nivel_seguranca INTEGER NOT NULL CHECK (nivel_seguranca >= 1 AND nivel_seguranca <= 5),
    parte_tecnica_mais_ajudou TEXT NOT NULL,
    faltou_seguranca TEXT NOT NULL,
    barreira_implementar TEXT NOT NULL,
    nps INTEGER NOT NULL CHECK (nps >= 1 AND nps <= 10),
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance das novas tabelas
CREATE INDEX IF NOT EXISTS idx_modulo_iv_mentorado_id ON modulo_iv_vendas_respostas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_modulo_iv_data_resposta ON modulo_iv_vendas_respostas(data_resposta);
CREATE INDEX IF NOT EXISTS idx_modulo_iv_nps ON modulo_iv_vendas_respostas(nps);

CREATE INDEX IF NOT EXISTS idx_modulo_iii_mentorado_id ON modulo_iii_gestao_marketing_respostas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_modulo_iii_data_resposta ON modulo_iii_gestao_marketing_respostas(data_resposta);
CREATE INDEX IF NOT EXISTS idx_modulo_iii_nps ON modulo_iii_gestao_marketing_respostas(nps);

CREATE INDEX IF NOT EXISTS idx_modulo_ii_mentorado_id ON modulo_ii_posicionamento_digital_respostas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_modulo_ii_data_resposta ON modulo_ii_posicionamento_digital_respostas(data_resposta);
CREATE INDEX IF NOT EXISTS idx_modulo_ii_nps ON modulo_ii_posicionamento_digital_respostas(nps);

CREATE INDEX IF NOT EXISTS idx_capacitacao_mentorado_id ON modulo_capacitacao_tecnica_respostas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_capacitacao_data_resposta ON modulo_capacitacao_tecnica_respostas(data_resposta);
CREATE INDEX IF NOT EXISTS idx_capacitacao_nps ON modulo_capacitacao_tecnica_respostas(nps);

-- RLS para as novas tabelas
ALTER TABLE modulo_iv_vendas_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iii_gestao_marketing_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_ii_posicionamento_digital_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_capacitacao_tecnica_respostas ENABLE ROW LEVEL SECURITY;

-- Políticas para as novas tabelas
CREATE POLICY "Permitir tudo para usuarios autenticados modulo_iv" 
    ON modulo_iv_vendas_respostas FOR ALL 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir tudo para usuarios autenticados modulo_iii" 
    ON modulo_iii_gestao_marketing_respostas FOR ALL 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir tudo para usuarios autenticados modulo_ii" 
    ON modulo_ii_posicionamento_digital_respostas FOR ALL 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir tudo para usuarios autenticados capacitacao" 
    ON modulo_capacitacao_tecnica_respostas FOR ALL 
    TO authenticated 
    USING (true);

-- Tabela para controle de despesas/dependências mensais
CREATE TABLE IF NOT EXISTS despesas_mensais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    agosto DECIMAL(10,2) DEFAULT 0,
    setembro DECIMAL(10,2) DEFAULT 0,
    outubro DECIMAL(10,2) DEFAULT 0,
    novembro DECIMAL(10,2) DEFAULT 0,
    dezembro DECIMAL(10,2) DEFAULT 0,
    janeiro DECIMAL(10,2) DEFAULT 0,
    fevereiro DECIMAL(10,2) DEFAULT 0,
    marco DECIMAL(10,2) DEFAULT 0,
    abril DECIMAL(10,2) DEFAULT 0,
    maio DECIMAL(10,2) DEFAULT 0,
    junho DECIMAL(10,2) DEFAULT 0,
    julho DECIMAL(10,2) DEFAULT 0,
    ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados iniciais das despesas
INSERT INTO despesas_mensais (nome, agosto, setembro, outubro, novembro, dezembro, janeiro, fevereiro, marco, abril, maio, junho, julho, ano) VALUES
('Taillan', 10964.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2025),
('Fernanda Silveira', 4000.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2025),
('Marcelo', 2500.00, 2500.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2025),
('Kauê', 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 0, 0, 0, 2025),
('Julia', 10000.00, 10000.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2025),
('Pedro', 5000.00, 5000.00, 10000.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2025),
('Ewerton', 0, 5520.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2025),
('Marcus', 0, 0, 20000.00, 20000.00, 10000.00, 0, 0, 0, 0, 0, 0, 0, 2025),
('João Paulo', 0, 0, 45000.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2025);

-- Índices para performance da tabela despesas
CREATE INDEX IF NOT EXISTS idx_despesas_nome ON despesas_mensais(nome);
CREATE INDEX IF NOT EXISTS idx_despesas_ano ON despesas_mensais(ano);
CREATE INDEX IF NOT EXISTS idx_despesas_updated_at ON despesas_mensais(updated_at);

-- RLS para tabela despesas
ALTER TABLE despesas_mensais ENABLE ROW LEVEL SECURITY;

-- Política para tabela despesas
CREATE POLICY "Permitir tudo para usuarios autenticados despesas" 
    ON despesas_mensais FOR ALL 
    TO authenticated 
    USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela despesas_mensais
CREATE TRIGGER update_despesas_mensais_updated_at 
    BEFORE UPDATE ON despesas_mensais 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


    INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Ana Paula Albino Guedes ', NULL, '(73) 99950-5926', 'anapaula-albino@hotmail.com', '099.309.956-41', NULL, 'Rua dos Oitis, 14, Residencial Terras da Bahia, Teixeira de Freitas, BA, 45995-352', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Guilherme Cezar Soares ', NULL, '(83) 99874-1008', 'guilhermecezarsoares@gmail.com', '039.007.374-10', NULL, 'Rua Martins Júnior, 387, Liberdade, Campina Grande, PB, 58414-055', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Lorena Torríco Iriarte', NULL, '(11) 99441-0048', 'Iti_9@hotmail.com', '554.813.022-68', NULL, 'Rua Priscila Ferreira de Sousa Biondo, 149, Parque dos Príncipes, São Paulo, SP, 05396-080', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Sandra de Souza Anadão Possmoser', NULL, '(69) 99315-0528', 'sandrapossmoser30@hotmail.com', '007.151.602-65', NULL, 'Avenida capitao Silvio Gonçalves de Farias, 966, Bela floresta, Ouro Preto do Oeste, RO, 76920-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Darlan Correia do Carmo', NULL, '(82) 99976-1294', 'darlancorreia@gmail.com', '064.370.204-07', NULL, 'Rua Francisco Alexandre, 200, Baixa Grande, Arapiraca, AL, 57307-220', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Guilherme Miranzi de Almeida Martins  da Costa', NULL, '(88) 99961-4918', 'guimiranzi@hotmail.com', '071.014.056-81', NULL, 'Rua Metilde Ferreira, 800, Planalto, Juazeiro do Norte, CE, 63047-120', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Débora Camargo Nardy de Freitas Salgado', NULL, '(14) 99656-2889', 'deboranardy@yahoo.com.br', '289.528.178-50', NULL, 'Rua Goiás, 344, Pinheiro Machado, Avaré, SP, 18705-400', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Thais Christina Sousa Madeira', NULL, '(41) 99274-1585', 'thaiscsmadeira@gmail.com', '026.303.743-60', NULL, 'Rua Coronel Joaquim Ignácio Taborda Ribas, 727, Bigorrilho, Curitiba, PR, 80730-330', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Marcela Filgueiras Mendes Vilhena', NULL, '(12) 98131-7348', 'marcelafilgueiras@gmail.com', '052.385.096-42', NULL, 'Avenida Renno junior, 338, Medicina, Itajubá, Mg, 27502-128', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Larissa Luana Castro Matias', NULL, '(69) 99371-1649', 'larissa.luana.matias@hotmail.com', '022.341.922-26', NULL, 'Theodoro Bischoff, 333333333The333, Bom pastor, Igrejinha, RsRS, 95650-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Mariana Alves Pineze', NULL, '(18) 98166-5824', 'mapineze@hotmail.com', '369.034.668-19', NULL, 'Rua Amparo, 214 ap 64, Baeta Neves, São Bernardo do Campo, SP, 09751-350', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Jessica Sztajn Bittencourt ', NULL, '(21) 98014-7679', 'jsztajn@gmail.com', '118.311.437-04', NULL, 'Rua do Guriri, 2090, Peró, Cabo Frio, RJ, 28922-370', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Michel Rodrigues Furtado', NULL, '(34) 99111-5064', 'mrodriguesfurtado@icloud.com', '100.300.636-12', NULL, 'Rua Vereador Clêinio Carvalho, 142, Alto dos Caiçaras, Patos de Minas, MG, 38702-209', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Lidiane Cristina dos Santos', NULL, '(81) 97904-3363', '123.Ic96@gmail.com', '724.384.522-34', NULL, 'José Leitão de Melo, 304, Rodoviária, Macaparana, PE, 55865-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Caroline Dutra da Costa ', NULL, '(21) 97956-3715', 'caroline.dutrac@hotmail.com', '155.111.267-13', NULL, 'Rua Jorge de Oliveira, 111 apt 201, Jardim Guanabara, Rio de Janeiro, RJ, 21941-030', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Carine Marinho Dutra Vilarindo', NULL, '(98) 99175-2136', 'carine-marinho@hotmail.com', '017.024.493-86', NULL, 'Rua Parnarama, 13, Parque Pindorama, São Luís, MA, 65041-174', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Rogério de Lima Rogério', NULL, '(55) 99710-7867', 'rogeriod.l.r1989@gmail.com', '958.721.322-04', NULL, 'Goiás, 830, Centro, Irineópolis, SC, 89440-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Andréa Silva dos Santos', NULL, '(11) 98156-0597', 'dra.andrea_santos@hotmail.com', '300.473.478-80', NULL, 'Avenida Bartholomeu de Carlos, 901, Jardim Flor da Montanha, Guarulhos, SPSP, 07097-420', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Andressa Fernanda Biscaino de Alcântara Ferreira', NULL, '(18) 98163-6695', 'andressa.fbaf@hotmail.com', '404.701.408-79', NULL, 'Rua Paulo Valdivino Pereira, 74, Rotta do Sol, Presidente Prudente, SP, 19072-044', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Amanda Pinheiro Santos', NULL, '(21) 99923-5880', 'amandapinheiro3112@gmail.com', '042.450.527-40', NULL, 'Rua Silvia Pozzano, 2820, bl 1/802, Recreio dos Bandeirantes, Rio de Janeiro, RJ, 22790-671', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Nathalia Prezoutto Venancio Rodrigues', NULL, '(15) 99661-7028', 'nathaliaprezoutto@hotmail.com', '400.842.188-27', NULL, 'Rua Antônio Roberto Munhoz Soares, 190, Jardim Fogaça, Itapetininga, SP, 18202-270', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Felipe Ferreira Carega', NULL, '(21) 98344-2827', 'dr.felipecarega@gmail.com', '057.989.795-80', NULL, 'Rua Aroazes, 200 - APT 302, Barra Olímpica, Rio de Janeiro, RJ, 22775-060', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Débora de Souza Ferreira ', NULL, '(73) 98162-2640', 'deborarxt@gmail.com', '052.110.151-42', NULL, 'Rua Wilton Pimenta, 45, Caixa D''Água, Jequié, BA, 45203-424', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Fernanda Silva da Silveira Pinto', NULL, '(71) 99117-9334', 'fernandasspinto96@gmail.com', '859.902.095-17', NULL, 'Alameda Marine, 70, Costa Azul, Salvador, BA, 41760-037', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Kristian Solart de Freitas', NULL, '(92) 99999-0837', 'kristiansolartdefreitas@gmail.com', '968.225.032.34', NULL, 'Rua Joviânia, 442, Novo Aleixo, Manaus, AM, 69098-154', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Marcelo Vieira de Sousa', NULL, '(83) 99887-3565', 'drvieiramarcelo10@gmail.com', '087.454.434-32', NULL, 'Avenida Maria Rosa, 379, Manaíra, João Pessoa, PB, 58038-461', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Eduardo Brusiquesi Martins ', NULL, '(35) 99114-1615', 'eduardo_brusiquese@hotmail.com', '122.536.876-69', NULL, 'Monsenhor Silvio Puntel, 230, Morada do sol, Cássia, MG, 37980-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Bruno Angelo Silva ', NULL, '(77) 99818-3228', 'brunoangelo06@hotmail.com', '072.739.905-58', NULL, 'Rua Jose Alencar Gomes da Silva, apto 403 C, 308, Jardim Paraíso, Luís Eduardo Magalhães, BA, 47855-782', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Bruna Evllyn Freitas de Oliveira ', NULL, '(31) 99727-7543', 'brunaevellyn@icloud.com', '150.598.857-80', NULL, 'Rua Hilton Rodrigues, 122, Pituba, Salvador, BA, 41830-630', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Ton Jeferson da Cunha Carvalho', NULL, '(71) 99185-4185', 'tonjeferson@gmail.com', '016.526.225-78', NULL, 'Rua Júlio Rodrigues, 224, Pituaçu, Salvador, BA, 41741-439', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Ivonildes Fernandes de Melo Neta ', NULL, '(75) 99985-7290', 'ivonildesmelo@hotmail.com', '046.142.191-79', NULL, 'Avenida Cardeal da Silva, 1825, Rio Vermelho, Salvador, BA, 41950-495', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Bernardo Alencar Wanderley Estanislau da Costa', NULL, '(22) 98857-6934', 'bawaec@hotmail.com', '140.762.117-31', NULL, 'Rua Tupi, 201, Bananeiras (Iguabinha), Araruama, RJ, 28971-796', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Thiago Pereira Guimarães', NULL, '(21) 97587-8735', 'thiagopgrio@gmail.com', '057.605.657-02', NULL, 'Avenida Hildebrando de Araújo Góes, 55, Barra da Tijuca, Rio de Janeiro, RJ, 22793-250', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Diogo Machado Amaral', NULL, '(11) 93077-9986', 'diogotelex1@gmail.com', '359.724.718-09', NULL, 'Rua Manoel de Abreu, 620, Vila Santa Margarida, Ferraz de Vasconcelos, SP, 08543-350', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Ana Luiza Lacerda Mari', NULL, '(31) 99195-9788', 'aninhallacerda@hotmail.com', '129.047.666-77', NULL, 'Praca dona carmem, 70, Jardim Maily, Piúma, ES, 29285-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Gustavo Henrique Xavier Denuncio', NULL, '(11) 97585-8764', 'xaviermwind@gmail.com', '397.744.888-90', NULL, 'Rua Antonieta Leitão, 293, Nossa Senhora do Ó, São Paulo, SP, 02925-160', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Rubens Cleyton da Silva Mendes', NULL, '(31) 99936-3295', 'rubens.ws@gmail.com', '013.315.636-23', NULL, 'Rua Cristal, 135, São Joaquim, Contagem, MG, 32113-080', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Marcelo Mari de Castro', NULL, '(31) 99624-7674', 'marcelomaricastro@gmail.com', '857.982.156-87', NULL, 'Praça Dona Carmem, 70, Jardim Maily, Piúma, ES, 29285-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('João Paulo Guimarães Pena', NULL, '(83) 98198-4142', 'jpgpena2014@gmail.com', '689.781.112-20', NULL, 'Avenida Ingá, 613, Manaíra, João Pessoa, PB, 58038-251', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Ali Rena Roman Kerdy', NULL, '(81) 99143-7563', 'ali.roman.kerdy@gmail.com', '700.148.802-02', NULL, 'Major Tomás, 340, Centro, Cachoeirinha, PE, 55380-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Karina dos Santos Rocha Ferreira ', NULL, '(11) 98357-4130', 'kari.ferreira@yahoo.com.br', '302.013.078-63', NULL, 'Rua Vergueiro, 2986 ap.112, Vila Mariana, São Paulo, SP, 04102-001', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Jhordan Soares de Moura', NULL, '(33) 99196-4631', 'jhordan.gv@hotmail.com', '121.284.756-35', NULL, 'Theodoro bischoff, 333333The, Bom pastor, Igrejinha, RsRS, 95650-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Rafael Faria Gil', NULL, '(11) 94710-0600', 'rafaelfariagil@gmail.com', '220.482.618-92', NULL, 'Rua Rosa Barbieri Paiotti, 604, Urbanova, São José dos Campos, SP, 12244-050', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Tailan Fernandes de Almeida', NULL, '(83) 98783-0195', 'taillanalmeida06@gmail.com', '083.271.844-07', NULL, 'Rua getulio vargas, 108, Centro, Coremas, PB, 58770-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Renan Alves Garcia ', NULL, '(21) 97592-8919', 'remedgarcia@outlook.com', '129.115.836-71', NULL, 'Rua Zulmira Mendes, 901, Braga, Cabo Frio, RJ, 28908-105', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Rafael Brito Mitzcu', NULL, '(83) 98763-9511', 'rafaelmitzcun@gmail.com', '005.900.319-45', NULL, 'Rua Cassimiro de Abreu, 300, Brisamar, João Pessoa, PB, 58033-330', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Dionline Borges Paulo', NULL, '(86) 98123-9676', 'dionlineborges19@gmail.com', '001.991.716-370', NULL, 'Rua Anselmo Peretti, 2283, Parque Ideal, Teresina, PI, 64078-680', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Fernanda Maria Carvalho Possani', NULL, '(35) 98876-5577', 'fernandamcpossani@hotmail.com', '786.293.226-91', NULL, 'Capitao cirilo, 475, Alto Alegre, Andradas, Mg, 37839-434', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Carlos Eduardo de Sousa Martins', NULL, '(61) 33577-971', 'eduardo.martins@firmadeadvogadors.com.br', '039.711.611-03', NULL, 'Quadra QR 408 Conjunto 11, 04, Samambaia Norte (Samambaia), Brasília, DF, 72318-312', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Isabella Gonçalves Andrade ', NULL, '(62) 99641-1500', 'draisabellagandrade@gmail.com', '042.431.461-44', NULL, 'Rua X 7 quadra x 12 lote 19, 19, Jardim Brasil, Goiânia, GO, 74730-390', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Jonas Ferro da Silva Neto', NULL, '(62) 99609-5683', 'jonas.netto@hotmail.com', '701.691.841-61', NULL, 'Rua 239, 239, Setor Leste Universitário, Goiânia, GO, 74605-070', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Marcela Mascaro Fachini', NULL, '(17) 99609-8281', 'ma_mascaro@hotmail.com', '221.912.368-55', NULL, 'Rua José da Silveira Baldy, 753, Jardim São Marco, São José do Rio Preto, SP, 15081-440', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Caroline Berardi Chaibub', NULL, '(11) 95310-1100', 'carolineberardi@hotmail.com', '409.312.638-08', NULL, 'Avenida Jamaris, 543, Planalto Paulista, São Paulo, SP, 04078-001', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Núbia Mesquita Fiorese', NULL, '(27) 99832-5503', 'fioresenubia@gmail.com', '135.190.907-08', NULL, 'Avenida Santos Evangelista, 26, Jardim Camburi, Vitória, ES, 29092-090', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Kauê Queiroz de Seabra', NULL, '(83) 98888-0069', 'kaueqs@hotmail.com', '102.588.154-00', NULL, 'Rua Vereador Gumercindo Barbosa Dunda, 308, Aeroclube, João Pessoa, PB, 58036-850', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Hayssa Duarte dos Santos Oliveira', NULL, '(86) 98885-0866', 'hayssa84@gmail.com', '072.330.813-60', NULL, 'Rua Anfrísio Lobão, 2481, São Cristóvão, Teresina, PI, 64051-152', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Gutemberg de Sousa Dantas Segundo', NULL, '(83) 99655-3588', ' segundogutemberg@gmail.com', '085.895.704-36', NULL, 'Avenida Cabo Branco, 3182, Cabo Branco, João Pessoa, PB, 58045-010', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('	Leonardo Moraes', NULL, '(83) 98741-3988', ' drleonardomoraescir@gmail.com', '700.826.554-99', NULL, 'Avenida General Edson Ramalho, 1777, Manaíra, João Pessoa, PB, 58038-102', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Rebeca Mendes Preres', NULL, '(61) 98515-0019', 'rebecamendes12@gmail.com', '117.927.496-27', NULL, 'Quadra 1 Conjunto 14, 330, Setor Habitacional Vicente Pires - Trecho 1, Brasília, DF, 72005-131', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Thiago medina', NULL, '(11) 98286-2830', ' thiago.codarin@hotmail.com', '350.247.278-51', NULL, 'Rua Iamí, 171, Residencial Ibi-Aram II, Itupeva, SP, 13299-404', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Camila Teixeira Amaro Vieira', NULL, '(83) 98110-0074', ' camilateixeiraav@hotmail.com', '049.349.503-70', NULL, 'Rua antonio Mano de Carvalho, 578, Brasilia, Senador Pompeu, CE, 63600-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Thaisa Suckow Custodio', NULL, '(24) 99924-6066', '  thatasc@hotmail.com', '149.869.827-10', NULL, 'Rua Doutor Ricardo Bartelega, 247, Atlântica, Rio das Ostras, RjRJ, 28895-679', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Natália Fernandes Ribeiro', NULL, '(83) 98186-1555', '  natyfernds@gmail.com', '705.191.234-84', NULL, 'Rua Geraldo Costa, 420, Manaíra, João Pessoa, PB, 58038-130', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Rafael Franco Raso', NULL, '(31) 99284-0465', ' rasorafa@gmail.com', '014.308.596-44', NULL, 'Rua Sabino Barroso, 95, Cruzeiro, Belo Horizonte, MG, 30310-200', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Thais Favaro Zavan', NULL, '(41) 98408-4572', ' thais_zavan@yahoo.com.br', '066.242.089-61', NULL, 'Rua Vicente Ciccarino, 307, Boa Vista, Curitiba, PR, 82540-120', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Jeany Das Graças Cury Santos', NULL, '(37) 99838-8360', ' j-cury0806@hotmail.com', '081.850.666-04', NULL, 'Rui Barbosa Apto 501, 25, Centro, Carmo do Cajuru, MG, 35557-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Marcus Da Silva Sardinha', NULL, '(11) 96645-4306', ' marcussardinha67@gmail.com', '060.892.121-13', NULL, 'Rua Maratona, 199, Vila Alexandria, São Paulo, SP, 04635-041', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Lilian Martins Lacerda', NULL, '(64) 98406-8101', ' lilian.cirurgia@hotmail.com', '664.470.621-53', NULL, 'Rua C, 626, Parque Solar do Agreste B, Rio Verde, GO, 75907-160', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Raissa Campelo Esteves Maranha', NULL, '(48) 99991-4074', ' raissacampelo@msn.com', '953.633.512-34', NULL, 'Rua Miguel Inácio Faraco, 665, Vila Moema, Tubarão, SC, 88705-050', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Hayssa Duarte dos Santos Oliveira', NULL, '(86) 98885-0866', ' hayssa84@gmail.com', '072.330.813-60', NULL, 'Rua Anfrísio Lobão, 2481, São Cristóvão, Teresina, PI, 64051-152', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Julia Ranielly de Oliveira Rios', NULL, '(71) 99647-2203', ' julia_rios22@hotmail.com', '066.638.095-39', NULL, 'Dom Pedro ll, 571, Marista, Senhor do Bonfim, BA, 48970-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Mariana Cardoso Fernandes', NULL, '(38) 99812-5697', ' maricf1993@gmail.com', '060.405.265-05', NULL, 'Guilherme de castro, Me179, Centro, Riacho de Santana, BA, 46470-000', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Pedro Paulo Assunção da Silva', NULL, '(99) 99149-8206', ' pedroassuncaopaulo@gmail.com', '062.552.873-51', NULL, 'Rua Josita Almeida, 240, Altiplano Cabo Branco, João Pessoa, PB, 58046-490', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Ewerton Vignolli Correa', NULL, '(28) 99904-1883', ' ewertonvignolli@gmail.com', '111.673.877-59', NULL, 'Rua Raul Pompéia, 205, Copacabana, Rio de Janeiro, RJ, 22080-001', NULL, NULL, NULL);
INSERT INTO mentorados (nome_completo, data_nascimento, telefone, email, cpf, rg, endereco, crm, origem_conhecimento, data_inicio_mentoria) VALUES ('Nathália Sales', '1996-06-13 00:00:00', '(83) 99820-8828', 'dernatologista@dranathaliasales', '075.830.864-77', '3.955.895 SDS PB', 'Av. Severino Massa Spinelli, 340 - Apt 2104 - Tambau - João Pessoa  - PB. 58039210', 'CRM: 14.498 PB', NULL, NULL);
