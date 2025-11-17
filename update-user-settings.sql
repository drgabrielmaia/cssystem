-- Adicionar coluna meta_arrecadacao_mes se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings'
        AND column_name = 'meta_arrecadacao_mes'
    ) THEN
        ALTER TABLE user_settings
        ADD COLUMN meta_arrecadacao_mes DECIMAL(10,2) DEFAULT 50000.00; -- R$ 50k (50% do faturamento)
    END IF;
END $$;

-- Atualizar registros existentes que não têm essa coluna preenchida
UPDATE user_settings
SET meta_arrecadacao_mes = 50000.00
WHERE meta_arrecadacao_mes IS NULL;

-- Visualizar resultado
SELECT user_id, meta_faturamento_mes, meta_arrecadacao_mes
FROM user_settings
WHERE user_id = 'default_user';