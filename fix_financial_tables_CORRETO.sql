-- =====================================================
-- CORRIGIR TABELAS FINANCEIRAS - BASEADO NA ESTRUTURA REAL DO SUPABASE
-- =====================================================
-- Analisando o código, a estrutura real é:
-- - transacoes_financeiras (já existe)
-- - categorias_financeiras (já existe) 
-- - usuarios_financeiro (já existe)
-- Mas FALTA organization_id em todas!
-- =====================================================

BEGIN;

-- 1. VERIFICAR E ADICIONAR organization_id em transacoes_financeiras
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transacoes_financeiras' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE transacoes_financeiras 
        ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        -- Atualizar transações existentes para primeira organização
        UPDATE transacoes_financeiras 
        SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
        WHERE organization_id IS NULL;
        
        -- Tornar obrigatório após migração
        ALTER TABLE transacoes_financeiras 
        ALTER COLUMN organization_id SET NOT NULL;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_transacoes_financeiras_organization 
        ON transacoes_financeiras(organization_id, data_transacao);
        
        RAISE NOTICE 'organization_id adicionado à transacoes_financeiras';
    ELSE
        RAISE NOTICE 'organization_id já existe em transacoes_financeiras';
    END IF;
END $$;

-- 2. VERIFICAR E ADICIONAR organization_id em categorias_financeiras
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categorias_financeiras' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE categorias_financeiras 
        ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        -- Atualizar categorias existentes
        UPDATE categorias_financeiras 
        SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
        WHERE organization_id IS NULL;
        
        -- Tornar obrigatório
        ALTER TABLE categorias_financeiras 
        ALTER COLUMN organization_id SET NOT NULL;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_organization 
        ON categorias_financeiras(organization_id);
        
        RAISE NOTICE 'organization_id adicionado à categorias_financeiras';
    ELSE
        RAISE NOTICE 'organization_id já existe em categorias_financeiras';
    END IF;
END $$;

-- 3. VERIFICAR E ADICIONAR organization_id em usuarios_financeiro
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_financeiro' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE usuarios_financeiro 
        ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        -- Atualizar usuários existentes
        UPDATE usuarios_financeiro 
        SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
        WHERE organization_id IS NULL;
        
        -- Tornar obrigatório
        ALTER TABLE usuarios_financeiro 
        ALTER COLUMN organization_id SET NOT NULL;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_usuarios_financeiro_organization 
        ON usuarios_financeiro(organization_id);
        
        RAISE NOTICE 'organization_id adicionado à usuarios_financeiro';
    ELSE
        RAISE NOTICE 'organization_id já existe em usuarios_financeiro';
    END IF;
END $$;

-- 4. VERIFICAR SE PRECISA ADICIONAR CAMPOS QUE FALTAM (do business_units_system)
DO $$
BEGIN
    -- Adicionar referencia_externa se não existir (para sincronização)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transacoes_financeiras' 
        AND column_name = 'referencia_externa'
    ) THEN
        ALTER TABLE transacoes_financeiras 
        ADD COLUMN referencia_externa TEXT,
        ADD COLUMN automatico BOOLEAN DEFAULT false;
        
        -- Índice para referência externa
        CREATE INDEX IF NOT EXISTS idx_transacoes_referencia_externa 
        ON transacoes_financeiras(referencia_externa);
        
        RAISE NOTICE 'Campos referencia_externa e automatico adicionados';
    END IF;
END $$;

-- 5. ATUALIZAR RLS POLICIES PARA USAR organization_id
-- Dropar policies antigas se existirem
DROP POLICY IF EXISTS "Financeiro pode gerenciar transações" ON transacoes_financeiras;
DROP POLICY IF EXISTS "Financeiro pode gerenciar categorias" ON categorias_financeiras;
DROP POLICY IF EXISTS "Financeiro pode gerenciar usuários" ON usuarios_financeiro;

-- Habilitar RLS nas tabelas
ALTER TABLE transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_financeiro ENABLE ROW LEVEL SECURITY;

-- Criar policies organizacionais
CREATE POLICY "Users can manage transactions in their organization" 
ON transacoes_financeiras FOR ALL 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage categories in their organization" 
ON categorias_financeiras FOR ALL 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage financial users in their organization" 
ON usuarios_financeiro FOR ALL 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
    )
);

-- 6. VERIFICAÇÃO FINAL - MOSTRAR ESTRUTURA ATUALIZADA
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('transacoes_financeiras', 'categorias_financeiras', 'usuarios_financeiro')
    AND column_name IN ('organization_id', 'referencia_externa', 'automatico')
ORDER BY table_name, column_name;

-- 7. MOSTRAR CONTAGENS
SELECT 
    'transacoes_financeiras' as tabela, 
    COUNT(*) as total_registros,
    COUNT(DISTINCT organization_id) as organizacoes_diferentes
FROM transacoes_financeiras
UNION ALL
SELECT 
    'categorias_financeiras' as tabela, 
    COUNT(*) as total_registros,
    COUNT(DISTINCT organization_id) as organizacoes_diferentes
FROM categorias_financeiras
UNION ALL
SELECT 
    'usuarios_financeiro' as tabela, 
    COUNT(*) as total_registros,
    COUNT(DISTINCT organization_id) as organizacoes_diferentes
FROM usuarios_financeiro;

COMMIT;

-- INSTRUÇÕES PÓS-EXECUÇÃO:
-- 1. Execute este SQL primeiro
-- 2. Use o botão "Sync" no dashboard financeiro  
-- 3. Teste se os filtros por organização funcionam
-- 4. Verifique se o chatbot puxa dados corretos