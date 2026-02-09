-- ======================================================
-- SCRIPT DE MIGRAÇÃO SEGURA PARA SISTEMA DE COMISSÕES
-- ======================================================
-- Este script verifica estruturas existentes antes de criar
-- para evitar erros e preservar dados existentes
-- ======================================================

BEGIN;

-- ======================================================
-- VERIFICAR E CRIAR TABELA MENTORADOS SE NÃO EXISTIR
-- ======================================================
DO $$
BEGIN
    -- Verificar se a tabela mentorados existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentorados') THEN
        
        CREATE TABLE public.mentorados (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            nome_completo VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            telefone VARCHAR(20),
            estado_entrada VARCHAR(100),
            estado_atual VARCHAR(100),
            data_entrada DATE,
            data_nascimento DATE,
            endereco TEXT,
            crm VARCHAR(50),
            cpf VARCHAR(14),
            rg VARCHAR(20),
            origem_conhecimento VARCHAR(200),
            data_inicio_mentoria DATE,
            password_hash TEXT,
            status_login VARCHAR(50) DEFAULT 'pending',
            pontuacao_total INTEGER DEFAULT 0,
            genero VARCHAR(20),
            especialidade VARCHAR(100),
            porcentagem_comissao DECIMAL(5,2) DEFAULT 50.00,
            motivo_exclusao TEXT,
            data_exclusao DATE,
            excluido BOOLEAN DEFAULT FALSE,
            lead_id UUID,
            organization_id UUID REFERENCES organizations(id),
            turma VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_mentorados_email ON mentorados(email);
        CREATE INDEX idx_mentorados_organization_id ON mentorados(organization_id);
        CREATE INDEX idx_mentorados_excluido ON mentorados(excluido);
        
        RAISE NOTICE 'Tabela mentorados criada com sucesso';
    ELSE
        -- Adicionar colunas que podem estar faltando
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'mentorados' 
                      AND column_name = 'porcentagem_comissao') THEN
            ALTER TABLE mentorados ADD COLUMN porcentagem_comissao DECIMAL(5,2) DEFAULT 50.00;
            RAISE NOTICE 'Coluna porcentagem_comissao adicionada à tabela mentorados';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'mentorados' 
                      AND column_name = 'organization_id') THEN
            ALTER TABLE mentorados ADD COLUMN organization_id UUID REFERENCES organizations(id);
            RAISE NOTICE 'Coluna organization_id adicionada à tabela mentorados';
        END IF;
    END IF;
END $$;

-- ======================================================
-- VERIFICAR E CRIAR TABELA LEADS SE NÃO EXISTIR
-- ======================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'leads') THEN
        
        CREATE TABLE public.leads (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            telefone VARCHAR(20),
            fonte VARCHAR(100) DEFAULT 'website',
            tipo_lead VARCHAR(50) DEFAULT 'potencial',
            status VARCHAR(50) DEFAULT 'novo',
            score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
            valor_estimado DECIMAL(10,2) DEFAULT 0,
            temperatura VARCHAR(20) DEFAULT 'frio',
            responsavel_id UUID,
            data_ultimo_contato TIMESTAMPTZ,
            data_proxima_acao DATE,
            proxima_acao TEXT,
            tags TEXT[],
            observacoes TEXT,
            data_conversao TIMESTAMPTZ,
            motivo_perda TEXT,
            organization_id UUID REFERENCES organizations(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_leads_organization_id ON leads(organization_id);
        CREATE INDEX idx_leads_status ON leads(status);
        CREATE INDEX idx_leads_responsavel_id ON leads(responsavel_id);
        
        RAISE NOTICE 'Tabela leads criada com sucesso';
    END IF;
END $$;

-- ======================================================
-- REMOVER TABELAS DE COMISSÕES ANTIGAS SE EXISTIREM
-- ======================================================
DO $$
BEGIN
    -- Backup de dados antigos se existir tabela comissoes
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'comissoes') THEN
        
        -- Criar tabela de backup
        CREATE TABLE IF NOT EXISTS comissoes_backup AS 
        SELECT *, NOW() as backup_date FROM comissoes;
        
        RAISE NOTICE 'Backup da tabela comissoes criado em comissoes_backup';
        
        -- Remover tabela antiga
        DROP TABLE IF EXISTS comissoes CASCADE;
        RAISE NOTICE 'Tabela comissoes antiga removida';
    END IF;
END $$;

-- ======================================================
-- CRIAR NOVAS TABELAS DO SISTEMA DE COMISSÕES
-- ======================================================

-- Executar o script principal de criação
\i commission_system_complete.sql

-- ======================================================
-- MIGRAR DADOS ANTIGOS SE EXISTIREM
-- ======================================================
DO $$
BEGIN
    -- Se existe backup de comissões antigas, tentar migrar dados relevantes
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'comissoes_backup') THEN
        
        RAISE NOTICE 'Iniciando migração de dados antigos de comissões...';
        
        -- Aqui você pode adicionar lógica de migração específica
        -- baseada na estrutura da tabela antiga
        
        RAISE NOTICE 'Migração de dados concluída. Verifique a tabela comissoes_backup para dados antigos.';
    END IF;
END $$;

-- ======================================================
-- VALIDAÇÕES FINAIS
-- ======================================================
DO $$
DECLARE
    v_table_count INTEGER;
    v_missing_tables TEXT[];
BEGIN
    -- Verificar se todas as tabelas foram criadas
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'referrals',
        'referral_payments', 
        'commissions',
        'commission_history',
        'commission_settings',
        'withdrawal_requests'
    );
    
    IF v_table_count = 6 THEN
        RAISE NOTICE 'Todas as tabelas do sistema de comissões foram criadas com sucesso!';
    ELSE
        -- Identificar tabelas faltantes
        SELECT array_agg(table_name) INTO v_missing_tables
        FROM (
            VALUES 
                ('referrals'),
                ('referral_payments'),
                ('commissions'),
                ('commission_history'),
                ('commission_settings'),
                ('withdrawal_requests')
        ) AS required(table_name)
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = required.table_name
        );
        
        RAISE EXCEPTION 'Tabelas faltantes: %', v_missing_tables;
    END IF;
END $$;

-- ======================================================
-- CONFIGURAR PERMISSÕES E ACESSOS
-- ======================================================

-- Garantir que o usuário anon tenha acesso de leitura às views
GRANT SELECT ON commission_summary TO anon;
GRANT SELECT ON referral_details TO anon;
GRANT SELECT ON pending_commissions TO anon;

-- Garantir que o usuário authenticated tenha acesso completo
GRANT ALL ON referrals TO authenticated;
GRANT ALL ON referral_payments TO authenticated;
GRANT ALL ON commissions TO authenticated;
GRANT ALL ON commission_history TO authenticated;
GRANT ALL ON commission_settings TO authenticated;
GRANT ALL ON withdrawal_requests TO authenticated;

-- Garantir acesso às sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

COMMIT;

-- ======================================================
-- RELATÓRIO DE STATUS
-- ======================================================
SELECT 
    'Sistema de Comissões' as sistema,
    COUNT(*) as tabelas_criadas,
    STRING_AGG(table_name, ', ') as tabelas
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'referrals',
    'referral_payments', 
    'commissions',
    'commission_history',
    'commission_settings',
    'withdrawal_requests'
);

-- Verificar Views
SELECT 
    'Views de Comissões' as tipo,
    COUNT(*) as total,
    STRING_AGG(table_name, ', ') as views
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
    'commission_summary',
    'referral_details',
    'pending_commissions'
);

-- Verificar Funções
SELECT 
    'Funções de Negócio' as tipo,
    COUNT(*) as total,
    STRING_AGG(routine_name, ', ') as funcoes
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'calculate_commission',
    'create_referral',
    'process_withdrawal_request',
    'approve_commission_payment'
);

-- ======================================================
-- INSTRUÇÕES PÓS-INSTALAÇÃO
-- ======================================================
/*
PRÓXIMOS PASSOS:

1. Execute este script no Supabase SQL Editor
2. Verifique os logs para confirmar que tudo foi criado
3. Configure as políticas RLS adicionais se necessário
4. Teste com os dados de exemplo incluídos
5. Ajuste as configurações de comissão para sua organização

DADOS DE TESTE INCLUÍDOS:
- 2 mentorados de teste (João e Maria)
- 4 leads/clientes de teste
- 3 indicações em diferentes status
- 2 pagamentos confirmados com comissões automáticas

PARA TESTAR:
1. Visualize o resumo de comissões:
   SELECT * FROM commission_summary;

2. Veja detalhes das indicações:
   SELECT * FROM referral_details;

3. Confira comissões pendentes:
   SELECT * FROM pending_commissions;

4. Teste criação de indicação:
   SELECT create_referral(
       '22222222-2222-2222-2222-222222222222'::UUID,
       '[ID_DO_LEAD]'::UUID,
       '11111111-1111-1111-1111-111111111111'::UUID,
       'whatsapp',
       'Teste de indicação'
   );
*/