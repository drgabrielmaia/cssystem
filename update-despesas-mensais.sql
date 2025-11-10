-- Script para verificar e atualizar a tabela despesas_mensais
-- Garantindo que cada dívida tenha sua própria data_vencimento

-- 1. Verificar registros sem data_vencimento
SELECT
    nome,
    ano,
    data_vencimento,
    CASE
        WHEN data_vencimento IS NULL THEN 'SEM DATA'
        ELSE 'COM DATA'
    END as status_data,
    -- Contar quantos meses têm valores
    (CASE WHEN janeiro > 0 THEN 1 ELSE 0 END +
     CASE WHEN fevereiro > 0 THEN 1 ELSE 0 END +
     CASE WHEN marco > 0 THEN 1 ELSE 0 END +
     CASE WHEN abril > 0 THEN 1 ELSE 0 END +
     CASE WHEN maio > 0 THEN 1 ELSE 0 END +
     CASE WHEN junho > 0 THEN 1 ELSE 0 END +
     CASE WHEN julho > 0 THEN 1 ELSE 0 END +
     CASE WHEN agosto > 0 THEN 1 ELSE 0 END +
     CASE WHEN setembro > 0 THEN 1 ELSE 0 END +
     CASE WHEN outubro > 0 THEN 1 ELSE 0 END +
     CASE WHEN novembro > 0 THEN 1 ELSE 0 END +
     CASE WHEN dezembro > 0 THEN 1 ELSE 0 END) as meses_com_valores
FROM despesas_mensais
ORDER BY nome, ano;

-- 2. Atualizar registros sem data_vencimento (usar dia 15 do primeiro mês do ano)
UPDATE despesas_mensais
SET data_vencimento = CONCAT(ano::text, '-01-15')::date
WHERE data_vencimento IS NULL;

-- 3. Verificar se algum mentorado tem múltiplos registros (diferentes anos)
SELECT
    nome,
    COUNT(*) as total_registros,
    array_agg(DISTINCT ano ORDER BY ano) as anos,
    array_agg(DISTINCT data_vencimento ORDER BY data_vencimento) as datas_vencimento
FROM despesas_mensais
GROUP BY nome
HAVING COUNT(*) > 1
ORDER BY nome;

-- 4. Padronizar data_vencimento para mentorados com múltiplos anos
-- (usar a data mais recente para todos os anos)
WITH data_mais_recente AS (
    SELECT
        nome,
        MAX(data_vencimento) as data_referencia
    FROM despesas_mensais
    WHERE data_vencimento IS NOT NULL
    GROUP BY nome
)
UPDATE despesas_mensais
SET data_vencimento = dmr.data_referencia
FROM data_mais_recente dmr
WHERE despesas_mensais.nome = dmr.nome;

-- 5. Criar índice para performance (se não existir)
CREATE INDEX IF NOT EXISTS idx_despesas_mensais_nome_ano ON despesas_mensais(nome, ano);
CREATE INDEX IF NOT EXISTS idx_despesas_mensais_data_vencimento ON despesas_mensais(data_vencimento);

-- 6. Verificação final - mostrar estatísticas
SELECT
    'ESTATÍSTICAS FINAIS' as status,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN data_vencimento IS NOT NULL THEN 1 END) as com_data_vencimento,
    COUNT(CASE WHEN data_vencimento IS NULL THEN 1 END) as sem_data_vencimento,
    COUNT(DISTINCT nome) as mentorados_unicos,
    COUNT(DISTINCT ano) as anos_diferentes
FROM despesas_mensais;

-- 7. Mostrar alguns exemplos após atualização
SELECT
    nome,
    ano,
    data_vencimento,
    -- Mostrar apenas meses com valores > 0
    CASE WHEN janeiro > 0 THEN 'Jan: ' || janeiro::text ELSE '' END ||
    CASE WHEN fevereiro > 0 THEN ' Fev: ' || fevereiro::text ELSE '' END ||
    CASE WHEN marco > 0 THEN ' Mar: ' || marco::text ELSE '' END ||
    CASE WHEN abril > 0 THEN ' Abr: ' || abril::text ELSE '' END ||
    CASE WHEN maio > 0 THEN ' Mai: ' || maio::text ELSE '' END ||
    CASE WHEN junho > 0 THEN ' Jun: ' || junho::text ELSE '' END ||
    CASE WHEN julho > 0 THEN ' Jul: ' || julho::text ELSE '' END ||
    CASE WHEN agosto > 0 THEN ' Ago: ' || agosto::text ELSE '' END ||
    CASE WHEN setembro > 0 THEN ' Set: ' || setembro::text ELSE '' END ||
    CASE WHEN outubro > 0 THEN ' Out: ' || outubro::text ELSE '' END ||
    CASE WHEN novembro > 0 THEN ' Nov: ' || novembro::text ELSE '' END ||
    CASE WHEN dezembro > 0 THEN ' Dez: ' || dezembro::text ELSE '' END as valores_por_mes
FROM despesas_mensais
WHERE (janeiro > 0 OR fevereiro > 0 OR marco > 0 OR abril > 0 OR
       maio > 0 OR junho > 0 OR julho > 0 OR agosto > 0 OR
       setembro > 0 OR outubro > 0 OR novembro > 0 OR dezembro > 0)
ORDER BY nome, ano
LIMIT 10;

-- 8. Script adicional para criar data_vencimento específica por mês (OPCIONAL)
-- Se quiser que cada mês tenha uma data específica em vez de usar a mesma base

/*
-- OPCIONAL: Criar tabela normalizada para ter data_vencimento por mês
CREATE TABLE IF NOT EXISTS despesas_detalhadas (
    id SERIAL PRIMARY KEY,
    mentorado_nome TEXT NOT NULL,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL, -- 1-12
    mes_nome TEXT NOT NULL, -- 'janeiro', 'fevereiro', etc.
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(mentorado_nome, ano, mes)
);

-- Migrar dados da tabela atual para a nova estrutura
INSERT INTO despesas_detalhadas (mentorado_nome, ano, mes, mes_nome, valor, data_vencimento)
SELECT
    dm.nome,
    dm.ano,
    meses.mes_num,
    meses.mes_nome,
    meses.valor,
    -- Calcular data específica para cada mês
    CASE
        WHEN dm.data_vencimento IS NOT NULL THEN
            (DATE(dm.data_vencimento) + INTERVAL '1 month' * (meses.mes_num - 1))::DATE
        ELSE
            DATE(dm.ano::text || '-' || LPAD(meses.mes_num::text, 2, '0') || '-15')
    END
FROM despesas_mensais dm
CROSS JOIN LATERAL (
    VALUES
        (1, 'janeiro', dm.janeiro),
        (2, 'fevereiro', dm.fevereiro),
        (3, 'marco', dm.marco),
        (4, 'abril', dm.abril),
        (5, 'maio', dm.maio),
        (6, 'junho', dm.junho),
        (7, 'julho', dm.julho),
        (8, 'agosto', dm.agosto),
        (9, 'setembro', dm.setembro),
        (10, 'outubro', dm.outubro),
        (11, 'novembro', dm.novembro),
        (12, 'dezembro', dm.dezembro)
) AS meses(mes_num, mes_nome, valor)
WHERE meses.valor > 0
ON CONFLICT (mentorado_nome, ano, mes) DO UPDATE SET
    valor = EXCLUDED.valor,
    data_vencimento = EXCLUDED.data_vencimento;
*/