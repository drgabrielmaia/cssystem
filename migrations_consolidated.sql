-- ======================================================
-- MIGRAÇÕES CONSOLIDADAS - SISTEMA CS
-- Execute este arquivo no Supabase SQL Editor
-- ======================================================

-- ======================================================
-- PARTE 1: SISTEMA DE COMISSÕES
-- ======================================================

-- ======================================================
-- SISTEMA COMPLETO DE COMISSÕES PARA MENTORADOS
-- ======================================================
-- Este script implementa um sistema completo de rastreamento
-- de comissões para mentorados (indicadores) com controle de
-- pagamentos, milestones e histórico detalhado
-- ======================================================

-- ======================================================
-- PARTE 1: CRIAR TABELAS PRINCIPAIS
-- ======================================================

-- Tabela de referências/indicações
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relacionamentos
    mentorado_id UUID NOT NULL, -- Quem indicou (mentorado/indicador)
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE, -- Pessoa indicada
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Informações da indicação
    referral_code VARCHAR(50) UNIQUE, -- Código único da indicação (opcional)
    referral_date TIMESTAMPTZ DEFAULT NOW(),
    referral_source VARCHAR(100), -- Origem: whatsapp, instagram, pessoal, etc
    referral_notes TEXT, -- Observações sobre a indicação
    
    -- Status da indicação
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Aguardando primeiro contato
        'contacted',    -- Lead contactado
        'qualified',    -- Lead qualificado
        'negotiating',  -- Em negociação
        'converted',    -- Convertido em cliente
        'lost',        -- Perdido
        'cancelled'    -- Cancelado
    )),
    
    -- Valores do contrato (quando convertido)
    contract_value DECIMAL(10,2), -- Valor total do contrato
    payment_plan VARCHAR(50), -- Plano de pagamento: a_vista, parcelado_2x, etc
    
    -- Datas importantes
    conversion_date TIMESTAMPTZ, -- Data da conversão
    first_payment_date TIMESTAMPTZ, -- Data do primeiro pagamento
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID, -- ID do usuário que criou
    
    -- Constraints
    CONSTRAINT unique_mentorado_lead UNIQUE(mentorado_id, lead_id),
    CONSTRAINT fk_mentorado FOREIGN KEY (mentorado_id) 
        REFERENCES mentorados(id) ON DELETE RESTRICT
);

-- Tabela de pagamentos dos clientes referidos
CREATE TABLE IF NOT EXISTS public.referral_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relacionamentos
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Informações do pagamento
    payment_amount DECIMAL(10,2) NOT NULL, -- Valor do pagamento
    payment_percentage DECIMAL(5,2), -- Percentual pago (ex: 50.00 para 50%)
    payment_date TIMESTAMPTZ NOT NULL, -- Data do pagamento
    payment_method VARCHAR(50), -- Método: pix, cartao, boleto, etc
    payment_reference VARCHAR(200), -- Referência/código da transação
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Aguardando confirmação
        'confirmed',    -- Pagamento confirmado
        'processing',   -- Processando
        'failed',       -- Falhou
        'refunded',     -- Reembolsado
        'cancelled'     -- Cancelado
    )),
    
    -- Dados de confirmação
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID, -- ID do usuário que confirmou
    
    -- Observações
    notes TEXT,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela principal de comissões
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relacionamentos
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE RESTRICT,
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES referral_payments(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Valores da comissão
    base_amount DECIMAL(10,2) NOT NULL, -- Valor base para cálculo
    commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00, -- Percentual da comissão
    commission_amount DECIMAL(10,2) NOT NULL, -- Valor da comissão
    
    -- Tipo e milestone
    commission_type VARCHAR(50) DEFAULT 'referral' CHECK (commission_type IN (
        'referral',     -- Comissão por indicação
        'bonus',        -- Bônus adicional
        'adjustment',   -- Ajuste manual
        'recurring'     -- Comissão recorrente
    )),
    
    milestone VARCHAR(50) CHECK (milestone IN (
        'first_50_percent',   -- Primeiro pagamento de 50%
        'second_50_percent',  -- Segundo pagamento de 50%
        'full_payment',       -- Pagamento integral
        'monthly_recurring',  -- Recorrente mensal
        'custom'             -- Personalizado
    )),
    
    -- Status da comissão
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',          -- Aguardando pagamento do cliente
        'eligible',         -- Elegível para saque (cliente pagou)
        'requested',        -- Saque solicitado
        'approved',         -- Aprovado para pagamento
        'processing',       -- Processando pagamento
        'paid',            -- Pago
        'cancelled',        -- Cancelado
        'on_hold'          -- Em espera (problemas/disputas)
    )),
    
    -- Datas importantes
    eligible_date TIMESTAMPTZ, -- Data que ficou elegível
    requested_date TIMESTAMPTZ, -- Data da solicitação de saque
    approved_date TIMESTAMPTZ, -- Data da aprovação
    paid_date TIMESTAMPTZ, -- Data do pagamento
    
    -- Informações de pagamento ao mentorado
    payment_method VARCHAR(50), -- Método de pagamento ao mentorado
    payment_reference VARCHAR(200), -- Referência do pagamento
    payment_receipt_url TEXT, -- URL do comprovante
    
    -- Controle administrativo
    approved_by UUID, -- ID do admin que aprovou
    paid_by UUID, -- ID do admin que processou o pagamento
    notes TEXT, -- Observações administrativas
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints para evitar duplicação
    CONSTRAINT unique_payment_commission UNIQUE(payment_id, milestone)
);

-- Tabela de histórico/auditoria de comissões
CREATE TABLE IF NOT EXISTS public.commission_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relacionamento
    commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
    
    -- Ação realizada
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    
    -- Valores (para rastrear mudanças)
    old_amount DECIMAL(10,2),
    new_amount DECIMAL(10,2),
    
    -- Quem e quando
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Detalhes
    details JSONB, -- Dados adicionais em JSON
    notes TEXT,
    
    -- IP e user agent para auditoria
    ip_address INET,
    user_agent TEXT
);

-- Tabela de configurações de comissões por organização
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Percentuais padrão
    default_commission_percentage DECIMAL(5,2) DEFAULT 50.00,
    first_milestone_percentage DECIMAL(5,2) DEFAULT 50.00, -- % no primeiro pagamento
    second_milestone_percentage DECIMAL(5,2) DEFAULT 50.00, -- % no segundo pagamento
    
    -- Regras de elegibilidade
    minimum_payment_percentage DECIMAL(5,2) DEFAULT 50.00, -- % mínimo pago para liberar comissão
    auto_approve_threshold DECIMAL(10,2), -- Valor máximo para aprovação automática
    
    -- Configurações de pagamento
    payment_day_of_month INTEGER CHECK (payment_day_of_month BETWEEN 1 AND 28), -- Dia do mês para pagamento
    minimum_withdrawal_amount DECIMAL(10,2) DEFAULT 100.00, -- Valor mínimo para saque
    
    -- Notificações
    notify_on_eligible BOOLEAN DEFAULT true,
    notify_on_payment BOOLEAN DEFAULT true,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_org_settings UNIQUE(organization_id)
);

-- Tabela de solicitações de saque
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relacionamentos
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Comissões incluídas no saque (array de IDs)
    commission_ids UUID[] NOT NULL,
    
    -- Valores
    total_amount DECIMAL(10,2) NOT NULL,
    fee_amount DECIMAL(10,2) DEFAULT 0, -- Taxa de processamento se houver
    net_amount DECIMAL(10,2) NOT NULL, -- Valor líquido
    
    -- Dados bancários para pagamento
    payment_data JSONB, -- Dados PIX, conta bancária, etc (criptografados se possível)
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Aguardando revisão
        'approved',     -- Aprovado
        'processing',   -- Processando pagamento
        'completed',    -- Concluído
        'rejected',     -- Rejeitado
        'cancelled'     -- Cancelado pelo mentorado
    )),
    
    -- Datas e responsáveis
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    completed_at TIMESTAMPTZ,
    
    -- Motivos e observações
    rejection_reason TEXT,
    admin_notes TEXT,
    
    -- Comprovante
    payment_proof_url TEXT,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================
-- PARTE 2: CRIAR ÍNDICES PARA PERFORMANCE
-- ======================================================

-- Índices para referrals
CREATE INDEX IF NOT EXISTS idx_referrals_mentorado_id ON referrals(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_referrals_lead_id ON referrals(lead_id);
CREATE INDEX IF NOT EXISTS idx_referrals_organization_id ON referrals(organization_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_date ON referrals(referral_date);
CREATE INDEX IF NOT EXISTS idx_referrals_conversion_date ON referrals(conversion_date);

-- Índices para referral_payments
CREATE INDEX IF NOT EXISTS idx_referral_payments_referral_id ON referral_payments(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_payments_organization_id ON referral_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_referral_payments_status ON referral_payments(status);
CREATE INDEX IF NOT EXISTS idx_referral_payments_payment_date ON referral_payments(payment_date);

-- Índices para commissions
CREATE INDEX IF NOT EXISTS idx_commissions_mentorado_id ON commissions(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_commissions_referral_id ON commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_commissions_payment_id ON commissions(payment_id);
CREATE INDEX IF NOT EXISTS idx_commissions_organization_id ON commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_eligible_date ON commissions(eligible_date);
CREATE INDEX IF NOT EXISTS idx_commissions_paid_date ON commissions(paid_date);

-- Índices para commission_history
CREATE INDEX IF NOT EXISTS idx_commission_history_commission_id ON commission_history(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_performed_at ON commission_history(performed_at);

-- Índices para withdrawal_requests
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_mentorado_id ON withdrawal_requests(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_organization_id ON withdrawal_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_requested_at ON withdrawal_requests(requested_at);

-- ======================================================
-- PARTE 3: CRIAR FUNÇÕES E TRIGGERS
-- ======================================================

-- Função para calcular comissão automaticamente
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_referral RECORD;
    v_total_paid DECIMAL(10,2);
    v_payment_percentage DECIMAL(5,2);
    v_commission_percentage DECIMAL(5,2);
    v_commission_amount DECIMAL(10,2);
    v_milestone VARCHAR(50);
    v_existing_commission UUID;
BEGIN
    -- Só processa pagamentos confirmados
    IF NEW.status != 'confirmed' THEN
        RETURN NEW;
    END IF;
    
    -- Busca informações da indicação
    SELECT * INTO v_referral
    FROM referrals
    WHERE id = NEW.referral_id;
    
    -- Se não encontrou ou não está convertido, sai
    IF NOT FOUND OR v_referral.status != 'converted' OR v_referral.contract_value IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calcula total já pago
    SELECT COALESCE(SUM(payment_amount), 0) INTO v_total_paid
    FROM referral_payments
    WHERE referral_id = NEW.referral_id
    AND status = 'confirmed';
    
    -- Calcula percentual pago
    v_payment_percentage := (v_total_paid / v_referral.contract_value) * 100;
    
    -- Determina milestone
    IF v_payment_percentage >= 100 THEN
        v_milestone := 'full_payment';
    ELSIF v_payment_percentage >= 50 THEN
        v_milestone := 'second_50_percent';
    ELSE
        v_milestone := 'first_50_percent';
    END IF;
    
    -- Busca configurações de comissão da organização
    SELECT 
        CASE 
            WHEN v_milestone = 'first_50_percent' THEN COALESCE(cs.first_milestone_percentage, 50)
            WHEN v_milestone = 'second_50_percent' THEN COALESCE(cs.second_milestone_percentage, 50)
            ELSE COALESCE(cs.default_commission_percentage, 50)
        END INTO v_commission_percentage
    FROM commission_settings cs
    WHERE cs.organization_id = NEW.organization_id;
    
    -- Se não encontrou configurações, usa 50% padrão
    IF NOT FOUND THEN
        v_commission_percentage := 50.00;
    END IF;
    
    -- Calcula valor da comissão
    v_commission_amount := (NEW.payment_amount * v_commission_percentage) / 100;
    
    -- Verifica se já existe comissão para este pagamento
    SELECT id INTO v_existing_commission
    FROM commissions
    WHERE payment_id = NEW.id;
    
    -- Se não existe, cria a comissão
    IF NOT FOUND THEN
        INSERT INTO commissions (
            mentorado_id,
            referral_id,
            payment_id,
            organization_id,
            base_amount,
            commission_percentage,
            commission_amount,
            commission_type,
            milestone,
            status,
            eligible_date
        ) VALUES (
            v_referral.mentorado_id,
            NEW.referral_id,
            NEW.id,
            NEW.organization_id,
            NEW.payment_amount,
            v_commission_percentage,
            v_commission_amount,
            'referral',
            v_milestone,
            'eligible',
            NOW()
        );
        
        -- Registra no histórico
        INSERT INTO commission_history (
            commission_id,
            action,
            new_status,
            new_amount,
            performed_by,
            details
        ) VALUES (
            (SELECT id FROM commissions WHERE payment_id = NEW.id LIMIT 1),
            'COMMISSION_CREATED',
            'eligible',
            v_commission_amount,
            NEW.confirmed_by,
            jsonb_build_object(
                'payment_id', NEW.id,
                'payment_amount', NEW.payment_amount,
                'milestone', v_milestone
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular comissão quando pagamento é confirmado
DROP TRIGGER IF EXISTS trigger_calculate_commission ON referral_payments;
CREATE TRIGGER trigger_calculate_commission
    AFTER INSERT OR UPDATE OF status ON referral_payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_commission();

-- Função para atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referral_payments_updated_at ON referral_payments;
CREATE TRIGGER update_referral_payments_updated_at
    BEFORE UPDATE ON referral_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commissions_updated_at ON commissions;
CREATE TRIGGER update_commissions_updated_at
    BEFORE UPDATE ON commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================================================
-- PARTE 4: CRIAR VIEWS ÚTEIS
-- ======================================================

-- View de resumo de comissões por mentorado
CREATE OR REPLACE VIEW commission_summary AS
SELECT 
    m.id as mentorado_id,
    m.nome_completo,
    m.email,
    m.organization_id,
    COUNT(DISTINCT r.id) as total_referrals,
    COUNT(DISTINCT CASE WHEN r.status = 'converted' THEN r.id END) as converted_referrals,
    COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.commission_amount END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN c.status = 'eligible' THEN c.commission_amount END), 0) as eligible_amount,
    COALESCE(SUM(CASE WHEN c.status IN ('approved', 'processing') THEN c.commission_amount END), 0) as approved_amount,
    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount END), 0) as paid_amount,
    COALESCE(SUM(c.commission_amount), 0) as total_commission_amount
FROM mentorados m
LEFT JOIN referrals r ON r.mentorado_id = m.id
LEFT JOIN commissions c ON c.mentorado_id = m.id
GROUP BY m.id, m.nome_completo, m.email, m.organization_id;

-- View de detalhes de indicações com status de pagamento
CREATE OR REPLACE VIEW referral_details AS
SELECT 
    r.id as referral_id,
    r.mentorado_id,
    m.nome_completo as mentorado_nome,
    r.lead_id,
    l.nome_completo as lead_nome,
    l.email as lead_email,
    l.telefone as lead_telefone,
    r.referral_date,
    r.status as referral_status,
    r.contract_value,
    r.conversion_date,
    COALESCE(SUM(rp.payment_amount), 0) as total_paid,
    CASE 
        WHEN r.contract_value > 0 
        THEN ROUND((COALESCE(SUM(rp.payment_amount), 0) / r.contract_value) * 100, 2)
        ELSE 0 
    END as payment_percentage,
    COUNT(DISTINCT rp.id) as payment_count,
    r.organization_id
FROM referrals r
INNER JOIN mentorados m ON m.id = r.mentorado_id
INNER JOIN leads l ON l.id = r.lead_id
LEFT JOIN referral_payments rp ON rp.referral_id = r.id AND rp.status = 'confirmed'
GROUP BY r.id, r.mentorado_id, m.nome_completo, r.lead_id, l.nome_completo, l.email, l.telefone, 
         r.referral_date, r.status, r.contract_value, r.conversion_date, r.organization_id;

-- View de comissões pendentes de pagamento
CREATE OR REPLACE VIEW pending_commissions AS
SELECT 
    c.id as commission_id,
    c.mentorado_id,
    m.nome_completo as mentorado_nome,
    m.email as mentorado_email,
    c.commission_amount,
    c.milestone,
    c.status,
    c.eligible_date,
    r.lead_id,
    l.nome_completo as lead_nome,
    c.organization_id
FROM commissions c
INNER JOIN mentorados m ON m.id = c.mentorado_id
INNER JOIN referrals r ON r.id = c.referral_id
INNER JOIN leads l ON l.id = r.lead_id
WHERE c.status IN ('eligible', 'requested', 'approved', 'processing')
ORDER BY c.eligible_date;

-- ======================================================
-- PARTE 5: POLÍTICAS DE SEGURANÇA (RLS)
-- ======================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para referrals
CREATE POLICY "Mentorados can view their own referrals"
    ON referrals FOR SELECT
    USING (
        mentorado_id IN (
            SELECT id FROM mentorados 
            WHERE email = current_setting('request.jwt.claims')::json->>'email'
        )
    );

CREATE POLICY "Admins can manage all referrals"
    ON referrals FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = auth.uid()
            AND organization_id = referrals.organization_id
            AND role IN ('owner', 'manager')
        )
    );

-- Políticas para commissions
CREATE POLICY "Mentorados can view their own commissions"
    ON commissions FOR SELECT
    USING (
        mentorado_id IN (
            SELECT id FROM mentorados 
            WHERE email = current_setting('request.jwt.claims')::json->>'email'
        )
    );

CREATE POLICY "Admins can manage all commissions"
    ON commissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = auth.uid()
            AND organization_id = commissions.organization_id
            AND role IN ('owner', 'manager')
        )
    );

-- Políticas para withdrawal_requests
CREATE POLICY "Mentorados can create and view their withdrawal requests"
    ON withdrawal_requests FOR ALL
    USING (
        mentorado_id IN (
            SELECT id FROM mentorados 
            WHERE email = current_setting('request.jwt.claims')::json->>'email'
        )
    );

CREATE POLICY "Admins can manage all withdrawal requests"
    ON withdrawal_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = auth.uid()
            AND organization_id = withdrawal_requests.organization_id
            AND role IN ('owner', 'manager')
        )
    );

-- ======================================================
-- PARTE 6: FUNÇÕES DE NEGÓCIO ÚTEIS
-- ======================================================

-- Função para criar indicação
CREATE OR REPLACE FUNCTION create_referral(
    p_mentorado_id UUID,
    p_lead_id UUID,
    p_organization_id UUID,
    p_source VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_referral_id UUID;
    v_referral_code VARCHAR(50);
BEGIN
    -- Gera código único da indicação
    v_referral_code := 'REF-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
    
    -- Insere a indicação
    INSERT INTO referrals (
        mentorado_id,
        lead_id,
        organization_id,
        referral_code,
        referral_source,
        referral_notes,
        status
    ) VALUES (
        p_mentorado_id,
        p_lead_id,
        p_organization_id,
        v_referral_code,
        p_source,
        p_notes,
        'pending'
    ) RETURNING id INTO v_referral_id;
    
    -- Atualiza o lead com o responsável
    UPDATE leads 
    SET responsavel_id = p_mentorado_id
    WHERE id = p_lead_id;
    
    RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql;

-- Função para processar solicitação de saque
CREATE OR REPLACE FUNCTION process_withdrawal_request(
    p_mentorado_id UUID,
    p_organization_id UUID
) RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_commission_ids UUID[];
    v_total_amount DECIMAL(10,2);
    v_min_withdrawal DECIMAL(10,2);
BEGIN
    -- Busca valor mínimo para saque
    SELECT minimum_withdrawal_amount INTO v_min_withdrawal
    FROM commission_settings
    WHERE organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        v_min_withdrawal := 100.00;
    END IF;
    
    -- Busca comissões elegíveis
    SELECT array_agg(id), COALESCE(SUM(commission_amount), 0)
    INTO v_commission_ids, v_total_amount
    FROM commissions
    WHERE mentorado_id = p_mentorado_id
    AND organization_id = p_organization_id
    AND status = 'eligible';
    
    -- Verifica se há comissões e se atinge o mínimo
    IF v_total_amount = 0 THEN
        RAISE EXCEPTION 'Nenhuma comissão elegível para saque';
    END IF;
    
    IF v_total_amount < v_min_withdrawal THEN
        RAISE EXCEPTION 'Valor mínimo para saque é %', v_min_withdrawal;
    END IF;
    
    -- Cria solicitação de saque
    INSERT INTO withdrawal_requests (
        mentorado_id,
        organization_id,
        commission_ids,
        total_amount,
        net_amount,
        status
    ) VALUES (
        p_mentorado_id,
        p_organization_id,
        v_commission_ids,
        v_total_amount,
        v_total_amount,
        'pending'
    ) RETURNING id INTO v_request_id;
    
    -- Atualiza status das comissões
    UPDATE commissions
    SET status = 'requested',
        requested_date = NOW()
    WHERE id = ANY(v_commission_ids);
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- Função para aprovar pagamento de comissão
CREATE OR REPLACE FUNCTION approve_commission_payment(
    p_request_id UUID,
    p_approved_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_commission_ids UUID[];
BEGIN
    -- Busca as comissões da solicitação
    SELECT commission_ids INTO v_commission_ids
    FROM withdrawal_requests
    WHERE id = p_request_id
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitação não encontrada ou já processada';
    END IF;
    
    -- Atualiza a solicitação
    UPDATE withdrawal_requests
    SET status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = p_approved_by
    WHERE id = p_request_id;
    
    -- Atualiza as comissões
    UPDATE commissions
    SET status = 'approved',
        approved_date = NOW(),
        approved_by = p_approved_by
    WHERE id = ANY(v_commission_ids);
    
    -- Registra no histórico
    INSERT INTO commission_history (commission_id, action, old_status, new_status, performed_by)
    SELECT 
        id, 
        'PAYMENT_APPROVED', 
        'requested', 
        'approved', 
        p_approved_by
    FROM commissions
    WHERE id = ANY(v_commission_ids);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ======================================================
-- PARTE 7: INSERIR DADOS DE EXEMPLO PARA TESTE
-- ======================================================

-- Inserir organização de teste se não existir
INSERT INTO organizations (id, name, owner_email)
VALUES ('11111111-1111-1111-1111-111111111111', 'Organização Teste', 'admin@teste.com')
ON CONFLICT (id) DO NOTHING;

-- Inserir configurações de comissão para a organização
INSERT INTO commission_settings (
    organization_id,
    default_commission_percentage,
    first_milestone_percentage,
    second_milestone_percentage,
    minimum_payment_percentage,
    auto_approve_threshold,
    payment_day_of_month,
    minimum_withdrawal_amount
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    50.00,  -- 50% de comissão padrão
    50.00,  -- 50% no primeiro milestone
    50.00,  -- 50% no segundo milestone
    50.00,  -- Cliente precisa pagar 50% para liberar comissão
    1000.00, -- Aprovação automática até R$ 1000
    10,      -- Pagamento no dia 10 de cada mês
    100.00   -- Saque mínimo de R$ 100
) ON CONFLICT (organization_id) DO NOTHING;

-- Inserir mentorados de teste
INSERT INTO mentorados (id, nome_completo, email, telefone, organization_id, porcentagem_comissao)
VALUES 
    ('22222222-2222-2222-2222-222222222222', 'João Silva', 'joao@teste.com', '11999999999', '11111111-1111-1111-1111-111111111111', 50),
    ('33333333-3333-3333-3333-333333333333', 'Maria Santos', 'maria@teste.com', '11888888888', '11111111-1111-1111-1111-111111111111', 50)
ON CONFLICT (id) DO NOTHING;

-- Inserir leads de teste
INSERT INTO leads (id, nome, email, telefone, fonte, tipo_lead, status, organization_id)
VALUES 
    ('44444444-4444-4444-4444-444444444444', 'Carlos Oliveira', 'carlos@cliente.com', '11777777777', 'indicacao', 'quente', 'qualificado', '11111111-1111-1111-1111-111111111111'),
    ('55555555-5555-5555-5555-555555555555', 'Ana Costa', 'ana@cliente.com', '11666666666', 'indicacao', 'quente', 'vendido', '11111111-1111-1111-1111-111111111111'),
    ('66666666-6666-6666-6666-666666666666', 'Pedro Lima', 'pedro@cliente.com', '11555555555', 'indicacao', 'morno', 'novo', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Criar indicações de teste
INSERT INTO referrals (
    id,
    mentorado_id,
    lead_id,
    organization_id,
    referral_source,
    referral_notes,
    status,
    contract_value,
    conversion_date
) VALUES 
    -- João indicou Carlos (em negociação)
    ('77777777-7777-7777-7777-777777777777', 
     '22222222-2222-2222-2222-222222222222', 
     '44444444-4444-4444-4444-444444444444',
     '11111111-1111-1111-1111-111111111111',
     'whatsapp',
     'Indicação via grupo do WhatsApp',
     'negotiating',
     NULL,
     NULL),
    
    -- João indicou Ana (convertida, pagou 50%)
    ('88888888-8888-8888-8888-888888888888',
     '22222222-2222-2222-2222-222222222222',
     '55555555-5555-5555-5555-555555555555',
     '11111111-1111-1111-1111-111111111111',
     'pessoal',
     'Indicação pessoal, amiga da família',
     'converted',
     10000.00,
     NOW() - INTERVAL '15 days'),
    
    -- Maria indicou Pedro (pendente)
    ('99999999-9999-9999-9999-999999999999',
     '33333333-3333-3333-3333-333333333333',
     '66666666-6666-6666-6666-666666666666',
     '11111111-1111-1111-1111-111111111111',
     'instagram',
     'Contato via Instagram',
     'pending',
     NULL,
     NULL)
ON CONFLICT (mentorado_id, lead_id) DO NOTHING;

-- Inserir pagamentos de teste
INSERT INTO referral_payments (
    referral_id,
    organization_id,
    payment_amount,
    payment_percentage,
    payment_date,
    payment_method,
    payment_reference,
    status,
    confirmed_at
) VALUES 
    -- Ana pagou 50% (R$ 5.000)
    ('88888888-8888-8888-8888-888888888888',
     '11111111-1111-1111-1111-111111111111',
     5000.00,
     50.00,
     NOW() - INTERVAL '10 days',
     'pix',
     'PIX123456',
     'confirmed',
     NOW() - INTERVAL '10 days');

-- As comissões serão criadas automaticamente pelo trigger

-- Criar uma indicação com pagamento 100% para teste
INSERT INTO referrals (
    id,
    mentorado_id,
    lead_id,
    organization_id,
    referral_source,
    status,
    contract_value,
    conversion_date
) VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     '33333333-3333-3333-3333-333333333333',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     '11111111-1111-1111-1111-111111111111',
     'indicacao',
     'converted',
     8000.00,
     NOW() - INTERVAL '30 days')
ON CONFLICT (mentorado_id, lead_id) DO NOTHING;

-- Inserir lead para a indicação acima
INSERT INTO leads (id, nome, email, telefone, status, organization_id)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cliente Pagou Tudo', 'cliente@pagou.com', '11444444444', 'vendido', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Inserir pagamento de 100%
INSERT INTO referral_payments (
    referral_id,
    organization_id,
    payment_amount,
    payment_percentage,
    payment_date,
    payment_method,
    status,
    confirmed_at
) VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     '11111111-1111-1111-1111-111111111111',
     8000.00,
     100.00,
     NOW() - INTERVAL '25 days',
     'cartao',
     'CARD789012',
     'confirmed',
     NOW() - INTERVAL '25 days');

-- ======================================================
-- PARTE 8: QUERIES ÚTEIS PARA O SISTEMA
-- ======================================================

-- Query para dashboard do mentorado
COMMENT ON FUNCTION calculate_commission() IS '
-- Dashboard do Mentorado: Ver suas comissões e indicações
SELECT 
    cs.*,
    rd.lead_nome,
    rd.payment_percentage,
    rd.referral_status
FROM commission_summary cs
LEFT JOIN referral_details rd ON rd.mentorado_id = cs.mentorado_id
WHERE cs.mentorado_id = ''[MENTORADO_ID]'';

-- Comissões disponíveis para saque
SELECT * FROM commissions
WHERE mentorado_id = ''[MENTORADO_ID]''
AND status = ''eligible'';

-- Histórico de saques
SELECT * FROM withdrawal_requests
WHERE mentorado_id = ''[MENTORADO_ID]''
ORDER BY requested_at DESC;
';

-- Query para dashboard administrativo
COMMENT ON VIEW commission_summary IS '
-- Dashboard Admin: Visão geral de comissões
SELECT * FROM commission_summary
WHERE organization_id = ''[ORG_ID]''
ORDER BY eligible_amount DESC;

-- Comissões pendentes de aprovação
SELECT * FROM pending_commissions
WHERE organization_id = ''[ORG_ID]'';

-- Solicitações de saque pendentes
SELECT 
    wr.*,
    m.nome_completo,
    m.email
FROM withdrawal_requests wr
JOIN mentorados m ON m.id = wr.mentorado_id
WHERE wr.organization_id = ''[ORG_ID]''
AND wr.status = ''pending'';

-- Relatório de pagamentos do mês
SELECT 
    DATE_TRUNC(''month'', paid_date) as mes,
    COUNT(*) as total_pagamentos,
    SUM(commission_amount) as valor_total
FROM commissions
WHERE organization_id = ''[ORG_ID]''
AND status = ''paid''
GROUP BY DATE_TRUNC(''month'', paid_date)
ORDER BY mes DESC;
';

-- ======================================================
-- FIM DO SCRIPT
-- ======================================================

-- ======================================================
-- PARTE 2: SISTEMA DE LEAD QUALIFICATION
-- ======================================================

-- Lead Qualification System Schema
-- Advanced lead scoring and pre-qualification system

-- Create enum for lead temperature
CREATE TYPE lead_temperature AS ENUM ('quente', 'morno', 'frio');

-- Create enum for payment intent
CREATE TYPE payment_intent AS ENUM ('a_vista', 'parcelado', 'vai_conseguir', 'nao_tem');

-- Create enum for urgency level
CREATE TYPE urgency_level AS ENUM ('imediato', 'ate_30_dias', 'ate_3_meses', 'pesquisando');

-- Create enum for business situation
CREATE TYPE business_situation AS ENUM ('tem_negocio_escalando', 'quer_comecar_com_experiencia', 'iniciante_total');

-- Main lead qualification table
CREATE TABLE lead_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  
  -- Referral and Social Proof
  origem_conhecimento VARCHAR(100) NOT NULL,
  tempo_seguindo VARCHAR(50),
  nome_indicacao VARCHAR(255),
  
  -- Business Information
  situacao_negocio business_situation NOT NULL,
  faturamento_atual DECIMAL(10, 2),
  objetivo_faturamento DECIMAL(10, 2),
  
  -- Intent and Urgency
  forma_pagamento payment_intent NOT NULL,
  urgencia urgency_level NOT NULL,
  
  -- Motivation and Experience
  motivacao_principal TEXT,
  investiu_mentoria_antes BOOLEAN DEFAULT false,
  maior_desafio TEXT,
  
  -- Scoring Results
  score_total INTEGER NOT NULL,
  temperatura lead_temperature NOT NULL,
  score_breakdown JSONB NOT NULL, -- Detailed scoring breakdown
  
  -- Psychological Profiling
  psychological_profile JSONB, -- Store behavioral analysis
  engagement_signals JSONB, -- Track engagement during form
  
  -- Form Metadata
  form_version VARCHAR(10) DEFAULT '1.0',
  completion_time INTEGER, -- Time in seconds to complete form
  abandonment_points TEXT[], -- Track where users hesitated
  device_info JSONB,
  ip_address INET,
  
  -- Status and Follow-up
  status VARCHAR(50) DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users(id),
  follow_up_date DATE,
  notes TEXT,
  
  -- Integration Fields
  crm_id VARCHAR(100),
  email_sent BOOLEAN DEFAULT false,
  whatsapp_sent BOOLEAN DEFAULT false,
  
  -- Organization support
  organization_id UUID REFERENCES organizations(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_lead_qualifications_temperatura ON lead_qualifications(temperatura);
CREATE INDEX idx_lead_qualifications_score ON lead_qualifications(score_total DESC);
CREATE INDEX idx_lead_qualifications_email ON lead_qualifications(email);
CREATE INDEX idx_lead_qualifications_whatsapp ON lead_qualifications(whatsapp);
CREATE INDEX idx_lead_qualifications_status ON lead_qualifications(status);
CREATE INDEX idx_lead_qualifications_created_at ON lead_qualifications(created_at DESC);
CREATE INDEX idx_lead_qualifications_organization ON lead_qualifications(organization_id);

-- Lead interaction tracking table
CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES lead_qualifications(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'email', 'whatsapp', 'call', 'meeting'
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  outcome VARCHAR(100),
  next_action VARCHAR(100),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Testing variations table
CREATE TABLE lead_form_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_name VARCHAR(100) NOT NULL,
  variation_code VARCHAR(20) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  traffic_percentage INTEGER DEFAULT 50, -- Percentage of traffic for this variation
  
  -- Form configuration
  questions_order JSONB,
  copy_variations JSONB,
  design_tokens JSONB,
  
  -- Performance metrics
  total_views INTEGER DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  total_hot_leads INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_views > 0 THEN (total_submissions::DECIMAL / total_views * 100)
      ELSE 0
    END
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form analytics table
CREATE TABLE lead_form_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  lead_id UUID REFERENCES lead_qualifications(id),
  variation_id UUID REFERENCES lead_form_variations(id),
  
  -- Engagement metrics
  field_interactions JSONB, -- Track time spent on each field
  field_changes JSONB, -- Track how many times each field was changed
  scroll_depth INTEGER, -- Maximum scroll percentage
  mouse_movements INTEGER, -- Total mouse movement events
  
  -- Abandonment tracking
  abandoned BOOLEAN DEFAULT false,
  abandonment_field VARCHAR(100),
  abandonment_time INTEGER, -- Seconds before abandonment
  
  -- Session info
  user_agent TEXT,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead scoring rules configuration (for dynamic scoring)
CREATE TABLE lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL,
  rule_category VARCHAR(50) NOT NULL,
  condition_field VARCHAR(100) NOT NULL,
  condition_operator VARCHAR(20) NOT NULL, -- 'equals', 'contains', 'greater_than', etc.
  condition_value TEXT NOT NULL,
  points INTEGER NOT NULL,
  weight_percentage INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  
  -- Rule metadata
  description TEXT,
  instant_hot_qualifier BOOLEAN DEFAULT false, -- If true, automatically marks as hot
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default scoring rules
INSERT INTO lead_scoring_rules (rule_name, rule_category, condition_field, condition_operator, condition_value, points, weight_percentage, instant_hot_qualifier, description)
VALUES
  -- Payment Intent (40% weight)
  ('Pagamento à Vista', 'payment_intent', 'forma_pagamento', 'equals', 'a_vista', 40, 100, true, 'Lead quer pagar à vista - qualificação instantânea como QUENTE'),
  ('Pagamento Parcelado', 'payment_intent', 'forma_pagamento', 'equals', 'parcelado', 25, 100, false, 'Lead pode parcelar'),
  ('Vai Conseguir Dinheiro', 'payment_intent', 'forma_pagamento', 'equals', 'vai_conseguir', 15, 100, false, 'Lead precisa conseguir o dinheiro'),
  ('Não Tem Dinheiro', 'payment_intent', 'forma_pagamento', 'equals', 'nao_tem', 0, 100, false, 'Lead não tem recursos'),
  
  -- Social Proof & Trust (25% weight)
  ('Indicação Mentorado', 'social_proof', 'origem_conhecimento', 'equals', 'indicacao_mentorado', 25, 100, false, 'Veio por indicação de mentorado'),
  ('Segue 1+ Ano', 'social_proof', 'tempo_seguindo', 'equals', '1_ano_mais', 20, 100, false, 'Segue há mais de 1 ano'),
  ('Segue 6+ Meses', 'social_proof', 'tempo_seguindo', 'equals', '6_meses_1_ano', 15, 100, false, 'Segue entre 6 meses e 1 ano'),
  ('Segue Menos 6 Meses', 'social_proof', 'tempo_seguindo', 'equals', 'menos_6_meses', 10, 100, false, 'Segue há menos de 6 meses'),
  
  -- Urgency & Timeline (20% weight)
  ('Urgência Imediata', 'urgency', 'urgencia', 'equals', 'imediato', 20, 100, false, 'Quer começar imediatamente'),
  ('Urgência 30 Dias', 'urgency', 'urgencia', 'equals', 'ate_30_dias', 15, 100, false, 'Quer começar em até 30 dias'),
  ('Urgência 3 Meses', 'urgency', 'urgencia', 'equals', 'ate_3_meses', 10, 100, false, 'Quer começar em até 3 meses'),
  ('Apenas Pesquisando', 'urgency', 'urgencia', 'equals', 'pesquisando', 0, 100, false, 'Está apenas pesquisando'),
  
  -- Current Situation (15% weight)
  ('Tem Negócio Escalando', 'situation', 'situacao_negocio', 'equals', 'tem_negocio_escalando', 15, 100, false, 'Já tem negócio e quer escalar'),
  ('Quer Começar com Experiência', 'situation', 'situacao_negocio', 'equals', 'quer_comecar_com_experiencia', 10, 100, false, 'Quer começar mas tem experiência'),
  ('Iniciante Total', 'situation', 'situacao_negocio', 'equals', 'iniciante_total', 5, 100, false, 'É iniciante total');

-- Email templates for lead notifications
CREATE TABLE lead_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  temperature lead_temperature NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO lead_email_templates (template_name, temperature, subject, body_html, body_text)
VALUES
  (
    'Hot Lead Notification',
    'quente',
    '🔥 LEAD QUENTE - {{nome}} - Ação Imediata Necessária',
    '<h2>Novo Lead Quente Identificado!</h2><p><strong>Nome:</strong> {{nome}}</p><p><strong>Score:</strong> {{score}}</p><p><strong>Forma de Pagamento:</strong> {{pagamento}}</p><p><strong>Urgência:</strong> {{urgencia}}</p><p><strong>WhatsApp:</strong> {{whatsapp}}</p><p><a href="{{link}}">Ver Detalhes Completos</a></p>',
    'Novo Lead Quente!\n\nNome: {{nome}}\nScore: {{score}}\nForma de Pagamento: {{pagamento}}\nUrgência: {{urgencia}}\nWhatsApp: {{whatsapp}}\n\nVer detalhes: {{link}}'
  ),
  (
    'Warm Lead Notification',
    'morno',
    '📊 Lead Morno - {{nome}} - Requer Nutrição',
    '<h2>Novo Lead Morno</h2><p><strong>Nome:</strong> {{nome}}</p><p><strong>Score:</strong> {{score}}</p><p><strong>Principais Objeções:</strong> {{objecoes}}</p><p><strong>WhatsApp:</strong> {{whatsapp}}</p><p><a href="{{link}}">Ver Detalhes</a></p>',
    'Novo Lead Morno\n\nNome: {{nome}}\nScore: {{score}}\nWhatsApp: {{whatsapp}}\n\nVer detalhes: {{link}}'
  );

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(
  p_forma_pagamento payment_intent,
  p_origem_conhecimento VARCHAR,
  p_tempo_seguindo VARCHAR,
  p_urgencia urgency_level,
  p_situacao_negocio business_situation
)
RETURNS TABLE(
  score_total INTEGER,
  temperatura lead_temperature,
  score_breakdown JSONB
) AS $$
DECLARE
  v_payment_score INTEGER := 0;
  v_social_score INTEGER := 0;
  v_urgency_score INTEGER := 0;
  v_situation_score INTEGER := 0;
  v_total_score INTEGER := 0;
  v_temperatura lead_temperature;
  v_breakdown JSONB;
BEGIN
  -- Calculate payment score (40% weight)
  v_payment_score := CASE p_forma_pagamento
    WHEN 'a_vista' THEN 40
    WHEN 'parcelado' THEN 25
    WHEN 'vai_conseguir' THEN 15
    ELSE 0
  END;
  
  -- Calculate social proof score (25% weight)
  IF p_origem_conhecimento = 'indicacao_mentorado' THEN
    v_social_score := 25;
  ELSIF p_tempo_seguindo = '1_ano_mais' THEN
    v_social_score := 20;
  ELSIF p_tempo_seguindo = '6_meses_1_ano' THEN
    v_social_score := 15;
  ELSIF p_tempo_seguindo = 'menos_6_meses' THEN
    v_social_score := 10;
  ELSE
    v_social_score := 0;
  END IF;
  
  -- Calculate urgency score (20% weight)
  v_urgency_score := CASE p_urgencia
    WHEN 'imediato' THEN 20
    WHEN 'ate_30_dias' THEN 15
    WHEN 'ate_3_meses' THEN 10
    ELSE 0
  END;
  
  -- Calculate situation score (15% weight)
  v_situation_score := CASE p_situacao_negocio
    WHEN 'tem_negocio_escalando' THEN 15
    WHEN 'quer_comecar_com_experiencia' THEN 10
    ELSE 5
  END;
  
  -- Calculate total score
  v_total_score := v_payment_score + v_social_score + v_urgency_score + v_situation_score;
  
  -- Determine temperature
  -- Instant hot qualifiers
  IF p_forma_pagamento = 'a_vista' OR 
     (p_origem_conhecimento = 'indicacao_mentorado' AND p_urgencia = 'imediato') THEN
    v_temperatura := 'quente';
  ELSIF v_total_score >= 70 THEN
    v_temperatura := 'quente';
  ELSIF v_total_score >= 40 THEN
    v_temperatura := 'morno';
  ELSE
    v_temperatura := 'frio';
  END IF;
  
  -- Build score breakdown
  v_breakdown := jsonb_build_object(
    'payment_intent', jsonb_build_object('score', v_payment_score, 'weight', '40%'),
    'social_proof', jsonb_build_object('score', v_social_score, 'weight', '25%'),
    'urgency', jsonb_build_object('score', v_urgency_score, 'weight', '20%'),
    'situation', jsonb_build_object('score', v_situation_score, 'weight', '15%'),
    'total', v_total_score,
    'max_possible', 100
  );
  
  RETURN QUERY SELECT v_total_score, v_temperatura, v_breakdown;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_qualifications_updated_at BEFORE UPDATE ON lead_qualifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_form_variations_updated_at BEFORE UPDATE ON lead_form_variations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_scoring_rules_updated_at BEFORE UPDATE ON lead_scoring_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE lead_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_form_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_email_templates ENABLE ROW LEVEL SECURITY;

-- Policies for lead_qualifications
CREATE POLICY "Users can view leads from their organization" ON lead_qualifications
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert leads" ON lead_qualifications
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Managers can update leads from their organization" ON lead_qualifications
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
    );

-- Policies for other tables (admin only for now)
CREATE POLICY "Admins can manage form variations" ON lead_form_variations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Admins can manage scoring rules" ON lead_scoring_rules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- Grant permissions
GRANT ALL ON lead_qualifications TO authenticated;
GRANT ALL ON lead_interactions TO authenticated;
GRANT ALL ON lead_form_variations TO authenticated;
GRANT ALL ON lead_form_analytics TO authenticated;
GRANT ALL ON lead_scoring_rules TO authenticated;
GRANT ALL ON lead_email_templates TO authenticated;

-- Allow anonymous users to insert lead qualifications and analytics
GRANT INSERT ON lead_qualifications TO anon;
GRANT INSERT ON lead_form_analytics TO anon;

-- ======================================================
-- FIM DAS MIGRAÇÕES
-- ======================================================
