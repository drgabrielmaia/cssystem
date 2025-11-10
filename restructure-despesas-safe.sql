-- Versão segura da reestruturação - evita datas inválidas

-- 1. Criar nova tabela normalizada
CREATE TABLE IF NOT EXISTS dividas (
    id SERIAL PRIMARY KEY,
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    mentorado_nome TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
    data_pagamento DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Função para calcular data segura
CREATE OR REPLACE FUNCTION calcular_data_segura(ano INTEGER, mes INTEGER, dia INTEGER)
RETURNS DATE AS $$
BEGIN
    -- Tentar criar a data, se falhar usar último dia do mês
    BEGIN
        RETURN DATE(ano || '-' || LPAD(mes::text, 2, '0') || '-' || LPAD(dia::text, 2, '0'));
    EXCEPTION WHEN OTHERS THEN
        -- Se a data é inválida (ex: 30 fev), usar último dia do mês
        RETURN (DATE(ano || '-' || LPAD(mes::text, 2, '0') || '-01') + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END;
END;
$$ LANGUAGE plpgsql;

-- 3. Migrar dados com função segura
INSERT INTO dividas (mentorado_id, mentorado_nome, valor, data_vencimento)
SELECT
    m.id as mentorado_id,
    dm.nome as mentorado_nome,
    meses.valor,
    CASE
        WHEN dm.data_vencimento IS NOT NULL THEN
            calcular_data_segura(dm.ano, meses.mes_num, EXTRACT(DAY FROM dm.data_vencimento)::INTEGER)
        ELSE
            calcular_data_segura(dm.ano, meses.mes_num, 15)
    END as data_vencimento
FROM despesas_mensais dm
LEFT JOIN mentorados m ON m.nome_completo = dm.nome
CROSS JOIN LATERAL (
    VALUES
        (1, dm.janeiro),
        (2, dm.fevereiro),
        (3, dm.marco),
        (4, dm.abril),
        (5, dm.maio),
        (6, dm.junho),
        (7, dm.julho),
        (8, dm.agosto),
        (9, dm.setembro),
        (10, dm.outubro),
        (11, dm.novembro),
        (12, dm.dezembro)
) AS meses(mes_num, valor)
WHERE meses.valor > 0 -- Só migrar meses que têm valor
ON CONFLICT DO NOTHING;

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_dividas_mentorado_id ON dividas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_dividas_mentorado_nome ON dividas(mentorado_nome);
CREATE INDEX IF NOT EXISTS idx_dividas_data_vencimento ON dividas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_dividas_status ON dividas(status);

-- 5. Políticas RLS
ALTER TABLE dividas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON dividas FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON dividas FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON dividas FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON dividas FOR DELETE USING (true);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_dividas_updated_at ON dividas;
CREATE TRIGGER update_dividas_updated_at
    BEFORE UPDATE ON dividas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Verificar migração
SELECT
    'MIGRAÇÃO COMPLETA' as status,
    COUNT(*) as total_dividas,
    COUNT(DISTINCT mentorado_nome) as mentorados_unicos,
    SUM(valor) as valor_total,
    MIN(data_vencimento) as primeira_data,
    MAX(data_vencimento) as ultima_data
FROM dividas;

-- 8. Mostrar exemplos
SELECT
    mentorado_nome,
    valor,
    data_vencimento,
    EXTRACT(YEAR FROM data_vencimento) as ano,
    EXTRACT(MONTH FROM data_vencimento) as mes,
    EXTRACT(DAY FROM data_vencimento) as dia,
    status
FROM dividas
ORDER BY mentorado_nome, data_vencimento
LIMIT 20;