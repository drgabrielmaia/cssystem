-- Reestruturação completa da tabela despesas_mensais
-- DE: Uma linha com 12 colunas (janeiro, fevereiro, etc.)
-- PARA: Uma linha por dívida com data_vencimento específica

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

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_dividas_mentorado_id ON dividas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_dividas_mentorado_nome ON dividas(mentorado_nome);
CREATE INDEX IF NOT EXISTS idx_dividas_data_vencimento ON dividas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_dividas_status ON dividas(status);

-- 3. Migrar dados da estrutura antiga para a nova
-- Cada mês com valor > 0 vira uma linha separada
INSERT INTO dividas (mentorado_id, mentorado_nome, valor, data_vencimento)
SELECT
    m.id as mentorado_id,
    dm.nome as mentorado_nome,
    meses.valor,
    -- Calcular data_vencimento específica para cada mês (com validação de datas)
    CASE
        WHEN dm.data_vencimento IS NOT NULL THEN
            -- Usar dia da data_vencimento + mês específico + ano, com validação
            LEAST(
                DATE(dm.ano::text || '-' || LPAD(meses.mes_num::text, 2, '0') || '-01') +
                INTERVAL '1 month' - INTERVAL '1 day', -- Último dia do mês
                DATE(dm.ano::text || '-' || LPAD(meses.mes_num::text, 2, '0') || '-' || EXTRACT(DAY FROM dm.data_vencimento)::text)
            )
        ELSE
            -- Usar dia 15 como padrão
            DATE(dm.ano::text || '-' || LPAD(meses.mes_num::text, 2, '0') || '-15')
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

-- 4. Verificar migração
SELECT
    'MIGRAÇÃO COMPLETA' as status,
    COUNT(*) as total_dividas,
    COUNT(DISTINCT mentorado_nome) as mentorados_unicos,
    SUM(valor) as valor_total,
    MIN(data_vencimento) as primeira_data,
    MAX(data_vencimento) as ultima_data
FROM dividas;

-- 5. Mostrar exemplos da nova estrutura
SELECT
    mentorado_nome,
    valor,
    data_vencimento,
    EXTRACT(YEAR FROM data_vencimento) as ano,
    EXTRACT(MONTH FROM data_vencimento) as mes,
    EXTRACT(DAY FROM data_vencimento) as dia,
    TO_CHAR(data_vencimento, 'TMMonth') as nome_mes,
    status
FROM dividas
ORDER BY mentorado_nome, data_vencimento
LIMIT 20;

-- 6. Comparar com dados originais (verificação)
SELECT
    'VERIFICAÇÃO' as tipo,
    dm_original.total_registros_originais,
    dm_original.mentorados_originais,
    dm_original.valor_total_original,
    dividas_novas.total_dividas_novas,
    dividas_novas.mentorados_novos,
    dividas_novas.valor_total_novo
FROM (
    SELECT
        COUNT(*) as total_registros_originais,
        COUNT(DISTINCT nome) as mentorados_originais,
        SUM(
            COALESCE(janeiro, 0) + COALESCE(fevereiro, 0) + COALESCE(marco, 0) +
            COALESCE(abril, 0) + COALESCE(maio, 0) + COALESCE(junho, 0) +
            COALESCE(julho, 0) + COALESCE(agosto, 0) + COALESCE(setembro, 0) +
            COALESCE(outubro, 0) + COALESCE(novembro, 0) + COALESCE(dezembro, 0)
        ) as valor_total_original
    FROM despesas_mensais
) dm_original
CROSS JOIN (
    SELECT
        COUNT(*) as total_dividas_novas,
        COUNT(DISTINCT mentorado_nome) as mentorados_novos,
        SUM(valor) as valor_total_novo
    FROM dividas
) dividas_novas;

-- 7. Criar view para compatibilidade com código existente (OPCIONAL)
CREATE OR REPLACE VIEW despesas_mensais_view AS
SELECT
    mentorado_nome as nome,
    EXTRACT(YEAR FROM data_vencimento) as ano,
    MIN(data_vencimento) as data_vencimento, -- Primeira data do ano para o mentorado
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 1 THEN valor ELSE 0 END) as janeiro,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 2 THEN valor ELSE 0 END) as fevereiro,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 3 THEN valor ELSE 0 END) as marco,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 4 THEN valor ELSE 0 END) as abril,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 5 THEN valor ELSE 0 END) as maio,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 6 THEN valor ELSE 0 END) as junho,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 7 THEN valor ELSE 0 END) as julho,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 8 THEN valor ELSE 0 END) as agosto,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 9 THEN valor ELSE 0 END) as setembro,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 10 THEN valor ELSE 0 END) as outubro,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 11 THEN valor ELSE 0 END) as novembro,
    SUM(CASE WHEN EXTRACT(MONTH FROM data_vencimento) = 12 THEN valor ELSE 0 END) as dezembro
FROM dividas
WHERE status = 'pendente'
GROUP BY mentorado_nome, EXTRACT(YEAR FROM data_vencimento);

-- 8. Políticas RLS (Row Level Security)
ALTER TABLE dividas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON dividas
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON dividas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON dividas
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON dividas
    FOR DELETE USING (true);

-- 9. Trigger para atualizar updated_at automaticamente
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

-- 10. Comentários para documentação
COMMENT ON TABLE dividas IS 'Tabela normalizada de dívidas - uma linha por dívida com data específica';
COMMENT ON COLUMN dividas.mentorado_id IS 'ID do mentorado (FK para mentorados)';
COMMENT ON COLUMN dividas.mentorado_nome IS 'Nome completo do mentorado (desnormalizado para performance)';
COMMENT ON COLUMN dividas.valor IS 'Valor da dívida';
COMMENT ON COLUMN dividas.data_vencimento IS 'Data específica de vencimento desta dívida';
COMMENT ON COLUMN dividas.status IS 'Status: pendente, pago ou atrasado';

-- 11. APÓS VERIFICAR QUE ESTÁ TUDO CERTO, VOCÊ PODE RENOMEAR AS TABELAS:
/*
-- BACKUP da tabela original
ALTER TABLE despesas_mensais RENAME TO despesas_mensais_backup;

-- Nova tabela vira a principal
ALTER TABLE dividas RENAME TO despesas_mensais;

-- Atualizar índices
DROP INDEX IF EXISTS idx_dividas_mentorado_id;
DROP INDEX IF EXISTS idx_dividas_mentorado_nome;
DROP INDEX IF EXISTS idx_dividas_data_vencimento;
DROP INDEX IF EXISTS idx_dividas_status;

CREATE INDEX idx_despesas_mensais_mentorado_id ON despesas_mensais(mentorado_id);
CREATE INDEX idx_despesas_mensais_mentorado_nome ON despesas_mensais(mentorado_nome);
CREATE INDEX idx_despesas_mensais_data_vencimento ON despesas_mensais(data_vencimento);
CREATE INDEX idx_despesas_mensais_status ON despesas_mensais(status);
*/