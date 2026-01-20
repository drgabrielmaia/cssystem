-- ========================================
-- SISTEMA DE VENDAS DE MENTORIA PARA FINANCEIRO
-- ========================================
-- Integrar vendas de mentoria com o sistema financeiro

-- 1. Adicionar organização aos mentorados (se ainda não existe)
ALTER TABLE mentorados
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 2. Criar índice para organização nos mentorados
CREATE INDEX IF NOT EXISTS idx_mentorados_organization_id ON mentorados(organization_id);

-- 3. Atualizar mentorados existentes com a organização padrão (se necessário)
-- Substitua 'ID_DA_ORGANIZACAO_MENTORIA' pelo ID correto da organização de mentoria
UPDATE mentorados
SET organization_id = '9c8c0033-15ea-4e33-a55f-28d81a19693b'
WHERE organization_id IS NULL;

-- 4. Criar tabela de vendas de mentoria
CREATE TABLE IF NOT EXISTS mentoria_vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    valor_mentoria DECIMAL(10,2) NOT NULL,
    data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
    data_inicio_mentoria DATE,
    data_fim_mentoria DATE,
    plano_mentoria TEXT NOT NULL, -- Ex: "Mentoria Individual 6 meses", "Grupo VIP", etc
    status_pagamento VARCHAR(20) DEFAULT 'pago' CHECK (status_pagamento IN ('pago', 'pendente', 'cancelado')),
    metodo_pagamento VARCHAR(50), -- pix, cartao, boleto, transferencia
    parcelas INTEGER DEFAULT 1,
    descricao TEXT,
    vendedor_responsavel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_mentoria_vendas_mentorado_id ON mentoria_vendas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_mentoria_vendas_organization_id ON mentoria_vendas(organization_id);
CREATE INDEX IF NOT EXISTS idx_mentoria_vendas_data_venda ON mentoria_vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_mentoria_vendas_status ON mentoria_vendas(status_pagamento);

-- 6. RLS para mentoria_vendas
ALTER TABLE mentoria_vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON mentoria_vendas
    FOR ALL
    TO authenticated
    USING (true);

-- 7. Criar vendas de mentoria para mentorados existentes (entrada retroativa)
-- Valor padrão baseado no plano (ajustar valores conforme necessário)
INSERT INTO mentoria_vendas (
    mentorado_id,
    organization_id,
    valor_mentoria,
    data_venda,
    data_inicio_mentoria,
    plano_mentoria,
    status_pagamento,
    descricao
)
SELECT
    id,
    organization_id,
    -- Valor baseado na turma ou padrão (ajustar conforme seus preços)
    CASE
        WHEN turma LIKE '%VIP%' OR turma LIKE '%Premium%' THEN 15000.00
        WHEN turma LIKE '%Grupo%' THEN 8000.00
        ELSE 12000.00  -- Valor padrão mentoria individual
    END as valor_mentoria,
    COALESCE(data_entrada::date, created_at::date) as data_venda,
    COALESCE(data_inicio_mentoria::date, data_entrada::date, created_at::date) as data_inicio_mentoria,
    CONCAT('Mentoria - ', COALESCE(turma, 'Individual')) as plano_mentoria,
    'pago' as status_pagamento,
    'Entrada retroativa - mentorado ativo no sistema' as descricao
FROM mentorados
WHERE estado_atual IN ('ativo', 'engajado', 'pausado') -- Só mentorados que pagaram
  AND organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 8. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_mentoria_vendas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mentoria_vendas_updated_at ON mentoria_vendas;
CREATE TRIGGER update_mentoria_vendas_updated_at
    BEFORE UPDATE ON mentoria_vendas
    FOR EACH ROW
    EXECUTE FUNCTION update_mentoria_vendas_updated_at();

-- 9. Função para sincronizar vendas de mentoria com financeiro
CREATE OR REPLACE FUNCTION sync_mentoria_vendas_to_financeiro()
RETURNS TEXT AS $$
DECLARE
    venda_record RECORD;
    vendas_sincronizadas INTEGER := 0;
    transacao_existente UUID;
BEGIN
    -- Buscar vendas de mentoria que ainda não foram sincronizadas
    FOR venda_record IN
        SELECT mv.*
        FROM mentoria_vendas mv
        WHERE mv.status_pagamento = 'pago'
          AND mv.organization_id IS NOT NULL
    LOOP
        -- Verificar se já existe transação financeira para esta venda
        SELECT id INTO transacao_existente
        FROM transacoes_financeiras
        WHERE referencia_id = venda_record.id::text
          AND referencia_tipo = 'mentoria_venda'
        LIMIT 1;

        -- Se não existe, criar a transação
        IF transacao_existente IS NULL THEN
            INSERT INTO transacoes_financeiras (
                organization_id,
                tipo,
                valor,
                descricao,
                categoria,
                data_transacao,
                status,
                fornecedor,
                referencia_id,
                referencia_tipo,
                created_at
            ) VALUES (
                venda_record.organization_id,
                'entrada',
                venda_record.valor_mentoria,
                CONCAT('Mentoria - ', venda_record.plano_mentoria, ' - ',
                       (SELECT nome_completo FROM mentorados WHERE id = venda_record.mentorado_id LIMIT 1)),
                'Mentoria',
                venda_record.data_venda,
                'pago',
                (SELECT nome_completo FROM mentorados WHERE id = venda_record.mentorado_id LIMIT 1),
                venda_record.id::text,
                'mentoria_venda',
                venda_record.created_at
            );

            vendas_sincronizadas := vendas_sincronizadas + 1;
        END IF;
    END LOOP;

    RETURN format('✅ %s vendas de mentoria sincronizadas com o financeiro', vendas_sincronizadas);
END;
$$ LANGUAGE plpgsql;

-- 10. View para dashboard financeiro com mentorias
CREATE OR REPLACE VIEW financeiro_dashboard_completo AS
-- Transações manuais
SELECT
    tf.organization_id,
    tf.tipo,
    tf.valor,
    tf.data_transacao as data,
    tf.categoria,
    tf.descricao,
    'transacao_manual' as origem,
    tf.created_at
FROM transacoes_financeiras tf
WHERE tf.referencia_tipo != 'mentoria_venda' OR tf.referencia_tipo IS NULL

UNION ALL

-- Vendas de mentoria
SELECT
    mv.organization_id,
    'entrada' as tipo,
    mv.valor_mentoria as valor,
    mv.data_venda as data,
    'Mentoria' as categoria,
    CONCAT('Mentoria - ', mv.plano_mentoria, ' - ', m.nome_completo) as descricao,
    'mentoria_venda' as origem,
    mv.created_at
FROM mentoria_vendas mv
JOIN mentorados m ON mv.mentorado_id = m.id
WHERE mv.status_pagamento = 'pago';

-- 11. Executar sincronização inicial
SELECT sync_mentoria_vendas_to_financeiro();

-- 12. Verificação do resultado
SELECT
    'SISTEMA CRIADO COM SUCESSO' as status,
    (SELECT COUNT(*) FROM mentoria_vendas) as total_vendas_mentoria,
    (SELECT SUM(valor_mentoria) FROM mentoria_vendas WHERE status_pagamento = 'pago') as receita_total_mentoria,
    (SELECT COUNT(*) FROM transacoes_financeiras WHERE referencia_tipo = 'mentoria_venda') as vendas_sincronizadas_financeiro,
    (SELECT SUM(valor) FROM transacoes_financeiras WHERE referencia_tipo = 'mentoria_venda') as valor_sincronizado_financeiro;

-- ========================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ========================================

COMMENT ON TABLE mentoria_vendas IS 'Registro de vendas de mentoria para integração com sistema financeiro';
COMMENT ON COLUMN mentoria_vendas.valor_mentoria IS 'Valor total pago pela mentoria';
COMMENT ON COLUMN mentoria_vendas.plano_mentoria IS 'Tipo de mentoria contratada (Individual, Grupo, VIP, etc)';
COMMENT ON COLUMN mentoria_vendas.data_venda IS 'Data em que a venda foi fechada';
COMMENT ON COLUMN mentoria_vendas.data_inicio_mentoria IS 'Data de início da mentoria';

COMMENT ON FUNCTION sync_mentoria_vendas_to_financeiro() IS 'Sincroniza vendas de mentoria com transações financeiras';

-- ========================================
-- INSTRUÇÕES PARA USO:
-- ========================================
-- 1. Execute este script no Supabase
-- 2. Verifique os valores padrão das mentorias e ajuste se necessário
-- 3. Use a função sync_mentoria_vendas_to_financeiro() para sincronizar
-- 4. Para novas vendas, insira em mentoria_vendas e execute a sincronização
-- ========================================