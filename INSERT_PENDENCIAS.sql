-- ===================================
-- 📋 INSERIR PENDÊNCIAS FINANCEIRAS
-- ===================================
-- Execute este script depois do DATABASE_SETUP.sql

-- Adicionar constraint única para evitar duplicatas (só se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'despesas_mensais_nome_ano_unique'
    ) THEN
        ALTER TABLE despesas_mensais ADD CONSTRAINT despesas_mensais_nome_ano_unique UNIQUE (nome, ano);
    END IF;
END $$;

-- Primeiro, vamos inserir os mentorados se não existirem
INSERT INTO mentorados (nome_completo, email, turma, estado_entrada, estado_atual) 
VALUES 
    ('Taillan', 'taillan@email.com', 'Turma 2025', 'inscrito', 'ativo'),
    ('Fernanda Silveira', 'fernanda.silveira@email.com', 'Turma 2025', 'inscrito', 'ativo'),
    ('Marcelo', 'marcelo@email.com', 'Turma 2025', 'inscrito', 'ativo'),
    ('Kauê', 'kaue@email.com', 'Turma 2025', 'inscrito', 'ativo'),
    ('Julia', 'julia@email.com', 'Turma 2025', 'inscrito', 'ativo'),
    ('Pedro', 'pedro@email.com', 'Turma 2025', 'inscrito', 'ativo'),
    ('Ewerton', 'ewerton@email.com', 'Turma 2025', 'inscrito', 'ativo'),
    ('Marcus', 'marcus@email.com', 'Turma 2025', 'inscrito', 'ativo'),
    ('João Paulo', 'joao.paulo@email.com', 'Turma 2025', 'inscrito', 'ativo')
ON CONFLICT (email) DO NOTHING;

-- Agora inserir as pendências financeiras
-- Taillan - R$ 10.964,00 em Agosto
INSERT INTO despesas_mensais (nome, agosto, ano)
VALUES ('Taillan', 10964.00, 2025)
ON CONFLICT (nome, ano) DO UPDATE SET
    agosto = 10964.00;

-- Fernanda Silveira - R$ 4.000,00 em Agosto
INSERT INTO despesas_mensais (nome, agosto, ano)
VALUES ('Fernanda Silveira', 4000.00, 2025)
ON CONFLICT (nome, ano) DO UPDATE SET
    agosto = 4000.00;

-- Marcelo - R$ 2.500,00 em Setembro e Outubro
INSERT INTO despesas_mensais (nome, setembro, outubro, ano)
VALUES ('Marcelo', 2500.00, 2500.00, 2025)
ON CONFLICT (nome, ano) DO UPDATE SET
    setembro = 2500.00,
    outubro = 2500.00;

-- Kauê - R$ 1.500,00 de Agosto a Abril (9 meses)
INSERT INTO despesas_mensais (nome, agosto, setembro, outubro, novembro, dezembro, janeiro, fevereiro, marco, abril, ano)
VALUES ('Kauê', 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 1500.00, 2025)
ON CONFLICT (nome, ano) DO UPDATE SET
    agosto = 1500.00,
    setembro = 1500.00,
    outubro = 1500.00,
    novembro = 1500.00,
    dezembro = 1500.00,
    janeiro = 1500.00,
    fevereiro = 1500.00,
    marco = 1500.00,
    abril = 1500.00;

-- Julia - R$ 10.000 em Agosto e Setembro
INSERT INTO despesas_mensais (nome, agosto, setembro, ano)
VALUES ('Julia', 10000.00, 10000.00, 2025)
ON CONFLICT (nome, ano) DO UPDATE SET
    agosto = 10000.00,
    setembro = 10000.00;

-- Pedro - R$ 5.000 em Agosto, R$ 5.000 em Setembro, R$ 10.000 em Outubro
INSERT INTO despesas_mensais (nome, agosto, setembro, outubro, ano)
VALUES ('Pedro', 5000.00, 5000.00, 10000.00, 2025)
ON CONFLICT (nome, ano) DO UPDATE SET
    agosto = 5000.00,
    setembro = 5000.00,
    outubro = 10000.00;

-- Ewerton - R$ 5.520 em Setembro
INSERT INTO despesas_mensais (nome, setembro, ano)
VALUES ('Ewerton', 5520.00, 2025)
ON CONFLICT (nome, ano) DO UPDATE SET
    setembro = 5520.00;

-- Marcus - R$ 20.000 em Outubro, R$ 20.000 em Novembro, R$ 10.000 em Dezembro
INSERT INTO despesas_mensais (nome, outubro, novembro, dezembro, ano)
VALUES ('Marcus', 20000.00, 20000.00, 10000.00, 2025)
ON CONFLICT (nome, ano) DO UPDATE SET
    outubro = 20000.00,
    novembro = 20000.00,
    dezembro = 10000.00;

-- João Paulo - R$ 45.000 em Outubro
INSERT INTO despesas_mensais (nome, outubro, ano)
VALUES ('João Paulo', 45000.00, 2025)
ON CONFLICT (nome, ano) DO UPDATE SET
    outubro = 45000.00;

-- ✅ Verificar os dados inseridos
SELECT 
    d.nome,
    d.agosto, d.setembro, d.outubro, d.novembro, d.dezembro,
    d.janeiro, d.fevereiro, d.marco, d.abril, d.maio, d.junho, d.julho
FROM despesas_mensais d
ORDER BY d.nome;

-- 📊 Total de pendências
SELECT 
    COUNT(*) as total_mentorados_com_pendencias,
    SUM(agosto + setembro + outubro + novembro + dezembro + 
        janeiro + fevereiro + marco + abril + maio + junho + julho) as total_pendente
FROM despesas_mensais
WHERE ano = 2025;

SELECT '✅ PENDÊNCIAS INSERIDAS COM SUCESSO! 🎉' as status;