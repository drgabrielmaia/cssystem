-- Adicionar campo data_vencimento na tabela despesas_mensais
-- para permitir especificar o dia exato do vencimento da pendência

ALTER TABLE despesas_mensais
ADD COLUMN data_vencimento DATE;

-- Comentário explicativo
COMMENT ON COLUMN despesas_mensais.data_vencimento IS 'Data específica de vencimento da pendência';

-- Criar índice para melhor performance nas consultas por data de vencimento
CREATE INDEX IF NOT EXISTS idx_despesas_data_vencimento ON despesas_mensais(data_vencimento);

-- Atualizar algumas datas de exemplo para pendências existentes
-- (apenas como exemplo - em produção seria necessário definir as datas reais)
UPDATE despesas_mensais
SET data_vencimento = CASE
    WHEN agosto > 0 THEN '2025-08-10'::date
    WHEN setembro > 0 THEN '2025-09-10'::date
    WHEN outubro > 0 THEN '2025-10-10'::date
    WHEN novembro > 0 THEN '2025-11-10'::date
    WHEN dezembro > 0 THEN '2025-12-10'::date
    WHEN janeiro > 0 THEN '2025-01-10'::date
    WHEN fevereiro > 0 THEN '2025-02-10'::date
    WHEN marco > 0 THEN '2025-03-10'::date
    WHEN abril > 0 THEN '2025-04-10'::date
    WHEN maio > 0 THEN '2025-05-10'::date
    WHEN junho > 0 THEN '2025-06-10'::date
    WHEN julho > 0 THEN '2025-07-10'::date
    ELSE NULL
END
WHERE data_vencimento IS NULL;