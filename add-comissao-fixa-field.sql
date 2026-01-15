-- Adicionar campo de comissão fixa por indicação na tabela organizations
ALTER TABLE organizations
ADD COLUMN comissao_fixa_indicacao DECIMAL(10,2) DEFAULT 2000.00;

-- Comentário explicativo
COMMENT ON COLUMN organizations.comissao_fixa_indicacao IS 'Valor fixo em R$ pago por cada indicação que virar venda';

-- Definir valor padrão para a organização principal (R$ 2.000)
UPDATE organizations
SET comissao_fixa_indicacao = 2000.00
WHERE id = '9c8c0033-15ea-4e33-a55f-28d81a19693b';