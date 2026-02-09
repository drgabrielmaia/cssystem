-- ====================================
-- INSERT SAMPLE DATA INTO CLOSERS TABLE
-- ====================================
-- This script inserts sample data for testing the closers system
-- Author: System
-- Date: 2026-02-09
-- ====================================

-- First, ensure we have at least one organization
-- Check if organizations exist and get the first one
DO $$
DECLARE
    v_org_id uuid;
BEGIN
    -- Get the first organization or create one if none exists
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    IF v_org_id IS NULL THEN
        INSERT INTO organizations (name, owner_email, is_active)
        VALUES ('Demo Organization', 'admin@demo.com', true)
        RETURNING id INTO v_org_id;
    END IF;
    
    -- Insert sample closers
    -- Note: password_hash should be properly hashed in production
    -- These are example hashes for demo purposes only
    
    -- SDR 1
    INSERT INTO public.closers (
        nome_completo,
        email,
        telefone,
        cpf,
        data_nascimento,
        tipo_closer,
        organization_id,
        data_contratacao,
        status_contrato,
        meta_mensal,
        comissao_percentual,
        observacoes,
        skills,
        horario_trabalho
    ) VALUES (
        'João Carlos Silva',
        'joao.silva@demo.com',
        '(11) 98765-4321',
        '123.456.789-00',
        '1990-05-15',
        'sdr',
        v_org_id,
        '2024-01-15',
        'ativo',
        50000.00,
        5.00,
        'SDR especialista em prospecção via Instagram e WhatsApp',
        '["instagram", "whatsapp", "cold_calling", "qualificacao_leads"]'::jsonb,
        '{"inicio": "09:00", "fim": "18:00", "dias": ["seg", "ter", "qua", "qui", "sex"]}'::jsonb
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Closer 1
    INSERT INTO public.closers (
        nome_completo,
        email,
        telefone,
        cpf,
        data_nascimento,
        tipo_closer,
        organization_id,
        data_contratacao,
        status_contrato,
        meta_mensal,
        comissao_percentual,
        observacoes,
        skills,
        horario_trabalho
    ) VALUES (
        'Maria Fernanda Santos',
        'maria.santos@demo.com',
        '(11) 98765-4322',
        '987.654.321-00',
        '1988-08-22',
        'closer',
        v_org_id,
        '2023-06-10',
        'ativo',
        100000.00,
        8.00,
        'Closer experiente com foco em vendas de alta conversão',
        '["vendas_complexas", "negociacao", "fechamento", "mentoria", "consultoria"]'::jsonb,
        '{"inicio": "10:00", "fim": "19:00", "dias": ["seg", "ter", "qua", "qui", "sex"]}'::jsonb
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Closer Senior
    INSERT INTO public.closers (
        nome_completo,
        email,
        telefone,
        cpf,
        data_nascimento,
        tipo_closer,
        organization_id,
        data_contratacao,
        status_contrato,
        meta_mensal,
        comissao_percentual,
        observacoes,
        skills,
        horario_trabalho,
        total_vendas,
        total_leads_atendidos,
        conversao_rate
    ) VALUES (
        'Pedro Henrique Oliveira',
        'pedro.oliveira@demo.com',
        '(11) 98765-4323',
        '456.789.123-00',
        '1985-03-10',
        'closer_senior',
        v_org_id,
        '2022-03-01',
        'ativo',
        150000.00,
        10.00,
        'Closer Senior com mais de 5 anos de experiência, especialista em vendas B2B',
        '["vendas_b2b", "vendas_b2c", "gestao_equipe", "treinamento", "estrategia_vendas", "high_ticket"]'::jsonb,
        '{"inicio": "08:00", "fim": "17:00", "dias": ["seg", "ter", "qua", "qui", "sex"]}'::jsonb,
        250,
        1200,
        20.83
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Manager
    INSERT INTO public.closers (
        nome_completo,
        email,
        telefone,
        cpf,
        data_nascimento,
        tipo_closer,
        organization_id,
        data_contratacao,
        status_contrato,
        meta_mensal,
        comissao_percentual,
        observacoes,
        skills,
        horario_trabalho,
        total_vendas,
        total_leads_atendidos,
        conversao_rate
    ) VALUES (
        'Ana Paula Rodrigues',
        'ana.rodrigues@demo.com',
        '(11) 98765-4324',
        '789.123.456-00',
        '1982-11-28',
        'manager',
        v_org_id,
        '2021-01-10',
        'ativo',
        200000.00,
        12.00,
        'Gerente de vendas com foco em desenvolvimento de equipe e estratégias de conversão',
        '["gestao", "lideranca", "estrategia", "analytics", "coaching", "processos_vendas"]'::jsonb,
        '{"inicio": "08:00", "fim": "18:00", "dias": ["seg", "ter", "qua", "qui", "sex"]}'::jsonb,
        500,
        2000,
        25.00
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Inactive Closer (for testing filters)
    INSERT INTO public.closers (
        nome_completo,
        email,
        telefone,
        tipo_closer,
        organization_id,
        data_contratacao,
        data_desligamento,
        status_contrato,
        observacoes
    ) VALUES (
        'Carlos Eduardo Mendes',
        'carlos.mendes@demo.com',
        '(11) 98765-4325',
        'closer',
        v_org_id,
        '2023-01-15',
        '2024-12-31',
        'desligado',
        'Ex-colaborador - desligado em 31/12/2024'
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Insert sample sales for active closers
    -- Sales for Maria (Closer)
    INSERT INTO public.closers_vendas (
        closer_id,
        organization_id,
        data_venda,
        valor_venda,
        tipo_venda,
        status_venda,
        comissao_percentual,
        valor_comissao,
        status_pagamento,
        observacoes,
        fonte_lead
    ) 
    SELECT 
        c.id,
        v_org_id,
        CURRENT_DATE - INTERVAL '5 days',
        15000.00,
        'mentoria',
        'confirmada',
        8.00,
        1200.00,
        'pago',
        'Venda de programa de mentoria anual',
        'Instagram'
    FROM public.closers c
    WHERE c.email = 'maria.santos@demo.com';
    
    -- Sales for Pedro (Closer Senior)
    INSERT INTO public.closers_vendas (
        closer_id,
        organization_id,
        data_venda,
        valor_venda,
        tipo_venda,
        status_venda,
        comissao_percentual,
        valor_comissao,
        status_pagamento,
        observacoes,
        fonte_lead
    ) 
    SELECT 
        c.id,
        v_org_id,
        CURRENT_DATE - INTERVAL '2 days',
        25000.00,
        'consultoria',
        'confirmada',
        10.00,
        2500.00,
        'pendente',
        'Consultoria empresarial - pacote premium',
        'WhatsApp'
    FROM public.closers c
    WHERE c.email = 'pedro.oliveira@demo.com';
    
    -- Insert sample monthly targets
    INSERT INTO public.closers_metas (
        closer_id,
        organization_id,
        mes,
        ano,
        meta_vendas_quantidade,
        meta_vendas_valor,
        meta_leads_atendidos,
        meta_conversao_rate,
        vendas_realizadas,
        valor_realizado,
        leads_atendidos,
        conversao_realizada,
        percentual_atingimento
    )
    SELECT 
        c.id,
        v_org_id,
        EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
        20,
        100000.00,
        100,
        20.00,
        15,
        75000.00,
        80,
        18.75,
        75.00
    FROM public.closers c
    WHERE c.status_contrato = 'ativo'
    AND c.tipo_closer IN ('closer', 'closer_senior')
    ON CONFLICT (closer_id, mes, ano) DO NOTHING;
    
    -- Insert sample activities
    INSERT INTO public.closers_atividades (
        closer_id,
        organization_id,
        tipo_atividade,
        descricao,
        duracao_minutos,
        resultado,
        proxima_acao,
        data_proxima_acao
    )
    SELECT 
        c.id,
        v_org_id,
        'whatsapp',
        'Contato inicial com lead qualificado via WhatsApp',
        30,
        'agendamento',
        'Realizar call de apresentação',
        CURRENT_DATE + INTERVAL '2 days'
    FROM public.closers c
    WHERE c.email = 'joao.silva@demo.com';
    
    RAISE NOTICE 'Sample data inserted successfully!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting sample data: %', SQLERRM;
END $$;

-- Verify the inserted data
SELECT 
    'Total Closers:' as metric,
    COUNT(*) as value
FROM public.closers
UNION ALL
SELECT 
    'Active Closers:' as metric,
    COUNT(*) as value
FROM public.closers
WHERE status_contrato = 'ativo'
UNION ALL
SELECT 
    'Total Sales:' as metric,
    COUNT(*) as value
FROM public.closers_vendas
UNION ALL
SELECT 
    'Total Sales Value:' as metric,
    SUM(valor_venda) as value
FROM public.closers_vendas
WHERE status_venda = 'confirmada';

-- Show closers summary
SELECT 
    nome_completo,
    email,
    tipo_closer,
    status_contrato,
    meta_mensal,
    comissao_percentual,
    total_vendas,
    conversao_rate
FROM public.closers
ORDER BY tipo_closer, nome_completo;