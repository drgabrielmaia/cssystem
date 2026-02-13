-- ================================================
-- SISTEMA DE AGENDA DOS CLOSERS
-- ================================================
-- Este script cria toda a estrutura necessária para o sistema
-- de agendamento de calls/reuniões dos closers
-- ================================================

-- 1. CRIAR TABELA DE DISPONIBILIDADE DOS CLOSERS
-- ================================================
CREATE TABLE IF NOT EXISTS closer_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closer_id UUID NOT NULL REFERENCES closers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Disponibilidade recorrente (dias da semana)
    weekday INTEGER CHECK (weekday >= 0 AND weekday <= 6), -- 0 = Domingo, 6 = Sábado
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Disponibilidade específica (data única)
    specific_date DATE, -- Se preenchido, sobrescreve weekday
    
    -- Controle de status
    is_active BOOLEAN DEFAULT true,
    is_recurring BOOLEAN DEFAULT true, -- true = semanal, false = data específica
    
    -- Configurações
    slot_duration_minutes INTEGER DEFAULT 30,
    buffer_minutes INTEGER DEFAULT 0, -- Tempo entre reuniões
    max_daily_appointments INTEGER DEFAULT 20,
    
    -- Metadados
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_weekday_or_date CHECK (
        (weekday IS NOT NULL AND specific_date IS NULL AND is_recurring = true) OR
        (weekday IS NULL AND specific_date IS NOT NULL AND is_recurring = false)
    )
);

-- Índices para performance
CREATE INDEX idx_closer_availability_closer ON closer_availability(closer_id, is_active);
CREATE INDEX idx_closer_availability_weekday ON closer_availability(weekday, is_active) WHERE is_recurring = true;
CREATE INDEX idx_closer_availability_date ON closer_availability(specific_date, is_active) WHERE is_recurring = false;
CREATE INDEX idx_closer_availability_org ON closer_availability(organization_id);

-- 2. CRIAR TABELA DE AGENDAMENTOS
-- ================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    closer_id UUID NOT NULL REFERENCES closers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Informações do agendamento
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Status do agendamento
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled',    -- Agendado
        'confirmed',    -- Confirmado pelo lead
        'in_progress',  -- Em andamento
        'completed',    -- Concluído
        'cancelled',    -- Cancelado
        'no_show',      -- Lead não compareceu
        'rescheduled'  -- Reagendado
    )),
    
    -- Tipo e propósito
    appointment_type VARCHAR(50) DEFAULT 'call' CHECK (appointment_type IN (
        'call',         -- Ligação
        'video_call',   -- Videochamada
        'meeting',      -- Reunião presencial
        'follow_up'     -- Follow-up
    )),
    
    -- URLs e acessos
    meeting_url TEXT,
    meeting_password TEXT,
    
    -- Informações adicionais
    title TEXT,
    description TEXT,
    notes TEXT,
    
    -- Controle de confirmação
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES closers(id),
    cancellation_reason TEXT,
    
    -- Controle de reagendamento
    rescheduled_from UUID REFERENCES appointments(id),
    rescheduled_count INTEGER DEFAULT 0,
    
    -- Controle de presença
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Resultados
    outcome VARCHAR(50) CHECK (outcome IN (
        'sale',         -- Venda realizada
        'interested',   -- Interessado, precisa follow-up
        'not_interested', -- Não interessado
        'rescheduled',  -- Reagendado
        'no_decision'   -- Sem decisão
    )),
    outcome_notes TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES closers(id),
    
    -- Constraints
    CONSTRAINT valid_appointment_time CHECK (end_time > start_time),
    CONSTRAINT no_double_booking UNIQUE (closer_id, appointment_date, start_time)
);

-- Índices para performance
CREATE INDEX idx_appointments_closer ON appointments(closer_id, appointment_date, status);
CREATE INDEX idx_appointments_lead ON appointments(lead_id, status);
CREATE INDEX idx_appointments_date ON appointments(appointment_date, status);
CREATE INDEX idx_appointments_status ON appointments(status) WHERE status IN ('scheduled', 'confirmed');
CREATE INDEX idx_appointments_org ON appointments(organization_id);

-- 3. CRIAR TABELA DE BLOQUEIOS DE AGENDA
-- ================================================
CREATE TABLE IF NOT EXISTS calendar_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closer_id UUID NOT NULL REFERENCES closers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Período do bloqueio
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Tipo de bloqueio
    block_type VARCHAR(50) DEFAULT 'unavailable' CHECK (block_type IN (
        'unavailable',  -- Indisponível
        'lunch',        -- Almoço
        'break',        -- Pausa
        'meeting',      -- Reunião interna
        'training',     -- Treinamento
        'vacation',     -- Férias
        'sick_leave',   -- Licença médica
        'holiday'       -- Feriado
    )),
    
    -- Recorrência
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50) CHECK (recurrence_pattern IN (
        'daily',
        'weekly',
        'monthly'
    )),
    recurrence_end_date DATE,
    
    -- Informações adicionais
    reason TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES closers(id),
    
    -- Constraints
    CONSTRAINT valid_block_time CHECK (end_time > start_time)
);

-- Índices
CREATE INDEX idx_calendar_blocks_closer ON calendar_blocks(closer_id, block_date, is_active);
CREATE INDEX idx_calendar_blocks_date ON calendar_blocks(block_date, is_active);
CREATE INDEX idx_calendar_blocks_org ON calendar_blocks(organization_id);

-- 4. CRIAR TABELA DE LOGS DE AGENDAMENTO
-- ================================================
CREATE TABLE IF NOT EXISTS appointment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Ação realizada
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'created',
        'updated',
        'confirmed',
        'cancelled',
        'rescheduled',
        'completed',
        'no_show',
        'reminder_sent'
    )),
    
    -- Detalhes da ação
    old_values JSONB,
    new_values JSONB,
    notes TEXT,
    
    -- Quem realizou a ação
    performed_by UUID REFERENCES closers(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_appointment_logs_appointment ON appointment_logs(appointment_id, performed_at);
CREATE INDEX idx_appointment_logs_action ON appointment_logs(action, performed_at);
CREATE INDEX idx_appointment_logs_org ON appointment_logs(organization_id);

-- 5. CRIAR FUNÇÕES DE AGENDAMENTO
-- ================================================

-- Função para buscar slots disponíveis de um closer
CREATE OR REPLACE FUNCTION get_closer_availability(
    p_closer_id UUID,
    p_date DATE,
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    slot_start TIME,
    slot_end TIME,
    is_available BOOLEAN
) AS $$
DECLARE
    v_weekday INTEGER;
    v_slot_duration INTEGER;
    v_current_time TIME;
    v_end_time TIME;
    v_slot_start TIME;
    v_slot_end TIME;
BEGIN
    -- Obter o dia da semana (0 = Domingo, 6 = Sábado)
    v_weekday := EXTRACT(DOW FROM p_date);
    
    -- Criar tabela temporária com todos os slots possíveis
    CREATE TEMP TABLE IF NOT EXISTS temp_slots (
        slot_start TIME,
        slot_end TIME,
        is_available BOOLEAN DEFAULT true
    ) ON COMMIT DROP;
    
    -- Buscar disponibilidade do closer para o dia
    FOR v_current_time, v_end_time, v_slot_duration IN
        SELECT 
            COALESCE(ca.start_time, '09:00'::TIME),
            COALESCE(ca.end_time, '18:00'::TIME),
            COALESCE(ca.slot_duration_minutes, 30)
        FROM closer_availability ca
        WHERE ca.closer_id = p_closer_id
            AND ca.is_active = true
            AND (
                (ca.is_recurring = true AND ca.weekday = v_weekday) OR
                (ca.is_recurring = false AND ca.specific_date = p_date)
            )
            AND (p_organization_id IS NULL OR ca.organization_id = p_organization_id)
        ORDER BY ca.is_recurring ASC -- Datas específicas têm prioridade
        LIMIT 1
    LOOP
        -- Gerar slots baseados na disponibilidade
        WHILE v_current_time < v_end_time LOOP
            v_slot_start := v_current_time;
            v_slot_end := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
            
            -- Verificar se o slot não ultrapassa o fim do expediente
            IF v_slot_end <= v_end_time THEN
                INSERT INTO temp_slots (slot_start, slot_end)
                VALUES (v_slot_start, v_slot_end);
            END IF;
            
            v_current_time := v_slot_end;
        END LOOP;
    END LOOP;
    
    -- Se não encontrou disponibilidade, usar padrão
    IF NOT EXISTS (SELECT 1 FROM temp_slots) THEN
        v_current_time := '09:00'::TIME;
        v_end_time := '18:00'::TIME;
        v_slot_duration := 30;
        
        WHILE v_current_time < v_end_time LOOP
            v_slot_start := v_current_time;
            v_slot_end := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
            
            IF v_slot_end <= v_end_time THEN
                INSERT INTO temp_slots (slot_start, slot_end)
                VALUES (v_slot_start, v_slot_end);
            END IF;
            
            v_current_time := v_slot_end;
        END LOOP;
    END IF;
    
    -- Marcar slots ocupados (com agendamentos)
    UPDATE temp_slots ts
    SET is_available = false
    WHERE EXISTS (
        SELECT 1
        FROM appointments a
        WHERE a.closer_id = p_closer_id
            AND a.appointment_date = p_date
            AND a.status IN ('scheduled', 'confirmed', 'in_progress')
            AND (
                (a.start_time <= ts.slot_start AND a.end_time > ts.slot_start) OR
                (a.start_time < ts.slot_end AND a.end_time >= ts.slot_end) OR
                (a.start_time >= ts.slot_start AND a.end_time <= ts.slot_end)
            )
    );
    
    -- Marcar slots bloqueados
    UPDATE temp_slots ts
    SET is_available = false
    WHERE EXISTS (
        SELECT 1
        FROM calendar_blocks cb
        WHERE cb.closer_id = p_closer_id
            AND cb.block_date = p_date
            AND cb.is_active = true
            AND (
                (cb.start_time <= ts.slot_start AND cb.end_time > ts.slot_start) OR
                (cb.start_time < ts.slot_end AND cb.end_time >= ts.slot_end) OR
                (cb.start_time >= ts.slot_start AND cb.end_time <= ts.slot_end)
            )
    );
    
    -- Se a data for hoje, marcar slots passados como indisponíveis
    IF p_date = CURRENT_DATE THEN
        UPDATE temp_slots
        SET is_available = false
        WHERE slot_start <= CURRENT_TIME;
    END IF;
    
    -- Retornar os slots
    RETURN QUERY
    SELECT * FROM temp_slots
    ORDER BY slot_start;
END;
$$ LANGUAGE plpgsql;

-- Função para agendar um appointment
CREATE OR REPLACE FUNCTION schedule_appointment(
    p_lead_id UUID,
    p_closer_id UUID,
    p_appointment_datetime TIMESTAMP WITH TIME ZONE,
    p_duration_minutes INTEGER DEFAULT 30,
    p_appointment_type VARCHAR DEFAULT 'call',
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_appointment_id UUID;
    v_appointment_date DATE;
    v_start_time TIME;
    v_end_time TIME;
    v_organization_id UUID;
    v_is_available BOOLEAN;
BEGIN
    -- Extrair data e hora
    v_appointment_date := DATE(p_appointment_datetime);
    v_start_time := p_appointment_datetime::TIME;
    v_end_time := (p_appointment_datetime + (p_duration_minutes || ' minutes')::INTERVAL)::TIME;
    
    -- Buscar organization_id do closer
    SELECT organization_id INTO v_organization_id
    FROM closers
    WHERE id = p_closer_id;
    
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Closer não encontrado';
    END IF;
    
    -- Verificar disponibilidade do slot
    SELECT is_available INTO v_is_available
    FROM get_closer_availability(p_closer_id, v_appointment_date, v_organization_id)
    WHERE slot_start = v_start_time
    LIMIT 1;
    
    IF v_is_available IS NULL OR v_is_available = false THEN
        RAISE EXCEPTION 'Horário não disponível';
    END IF;
    
    -- Criar o agendamento
    INSERT INTO appointments (
        lead_id,
        closer_id,
        organization_id,
        appointment_date,
        start_time,
        end_time,
        status,
        appointment_type,
        title,
        description,
        created_by
    ) VALUES (
        p_lead_id,
        p_closer_id,
        v_organization_id,
        v_appointment_date,
        v_start_time,
        v_end_time,
        'scheduled',
        p_appointment_type,
        COALESCE(p_title, 'Reunião com Lead'),
        p_description,
        COALESCE(p_created_by, p_closer_id)
    ) RETURNING id INTO v_appointment_id;
    
    -- Registrar no log
    INSERT INTO appointment_logs (
        appointment_id,
        organization_id,
        action,
        new_values,
        performed_by
    ) VALUES (
        v_appointment_id,
        v_organization_id,
        'created',
        jsonb_build_object(
            'date', v_appointment_date,
            'start_time', v_start_time,
            'end_time', v_end_time,
            'type', p_appointment_type
        ),
        COALESCE(p_created_by, p_closer_id)
    );
    
    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql;

-- Função para cancelar um agendamento
CREATE OR REPLACE FUNCTION cancel_appointment(
    p_appointment_id UUID,
    p_cancelled_by UUID DEFAULT NULL,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_organization_id UUID;
    v_old_status VARCHAR;
BEGIN
    -- Obter status atual e organization_id
    SELECT status, organization_id INTO v_old_status, v_organization_id
    FROM appointments
    WHERE id = p_appointment_id;
    
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Agendamento não encontrado';
    END IF;
    
    IF v_old_status IN ('cancelled', 'completed') THEN
        RAISE EXCEPTION 'Agendamento já foi % e não pode ser cancelado', v_old_status;
    END IF;
    
    -- Atualizar o agendamento
    UPDATE appointments
    SET 
        status = 'cancelled',
        cancelled_at = CURRENT_TIMESTAMP,
        cancelled_by = p_cancelled_by,
        cancellation_reason = p_cancellation_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_appointment_id;
    
    -- Registrar no log
    INSERT INTO appointment_logs (
        appointment_id,
        organization_id,
        action,
        old_values,
        new_values,
        notes,
        performed_by
    ) VALUES (
        p_appointment_id,
        v_organization_id,
        'cancelled',
        jsonb_build_object('status', v_old_status),
        jsonb_build_object('status', 'cancelled'),
        p_cancellation_reason,
        p_cancelled_by
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Função para obter agenda do closer
CREATE OR REPLACE FUNCTION get_closer_schedule(
    p_closer_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_include_cancelled BOOLEAN DEFAULT false
)
RETURNS TABLE (
    appointment_id UUID,
    lead_id UUID,
    lead_name TEXT,
    appointment_date DATE,
    start_time TIME,
    end_time TIME,
    status VARCHAR,
    appointment_type VARCHAR,
    title TEXT,
    description TEXT,
    meeting_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.lead_id,
        l.nome_completo,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.status,
        a.appointment_type,
        a.title,
        a.description,
        a.meeting_url
    FROM appointments a
    LEFT JOIN leads l ON l.id = a.lead_id
    WHERE a.closer_id = p_closer_id
        AND a.appointment_date BETWEEN p_start_date AND p_end_date
        AND (p_include_cancelled = true OR a.status != 'cancelled')
    ORDER BY a.appointment_date, a.start_time;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar próximo slot disponível
CREATE OR REPLACE FUNCTION get_next_available_slot(
    p_closer_id UUID,
    p_from_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    p_duration_minutes INTEGER DEFAULT 30
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_current_date DATE;
    v_max_date DATE;
    v_slot_time TIME;
    v_result TIMESTAMP WITH TIME ZONE;
BEGIN
    v_current_date := DATE(p_from_datetime);
    v_max_date := v_current_date + INTERVAL '30 days';
    
    WHILE v_current_date <= v_max_date LOOP
        -- Buscar primeiro slot disponível no dia
        SELECT slot_start INTO v_slot_time
        FROM get_closer_availability(p_closer_id, v_current_date)
        WHERE is_available = true
            AND (v_current_date > DATE(p_from_datetime) OR slot_start >= p_from_datetime::TIME)
        ORDER BY slot_start
        LIMIT 1;
        
        IF v_slot_time IS NOT NULL THEN
            v_result := v_current_date + v_slot_time;
            RETURN v_result;
        END IF;
        
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN NULL; -- Nenhum slot disponível nos próximos 30 dias
END;
$$ LANGUAGE plpgsql;

-- 6. CRIAR TRIGGERS
-- ================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
CREATE TRIGGER update_closer_availability_updated_at
    BEFORE UPDATE ON closer_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_blocks_updated_at
    BEFORE UPDATE ON calendar_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para validar conflitos de agendamento
CREATE OR REPLACE FUNCTION validate_appointment_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict_count INTEGER;
BEGIN
    -- Verificar conflitos com outros agendamentos
    SELECT COUNT(*) INTO v_conflict_count
    FROM appointments
    WHERE closer_id = NEW.closer_id
        AND appointment_date = NEW.appointment_date
        AND id != NEW.id
        AND status IN ('scheduled', 'confirmed', 'in_progress')
        AND (
            (start_time <= NEW.start_time AND end_time > NEW.start_time) OR
            (start_time < NEW.end_time AND end_time >= NEW.end_time) OR
            (start_time >= NEW.start_time AND end_time <= NEW.end_time)
        );
    
    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Conflito de agendamento: já existe outro agendamento neste horário';
    END IF;
    
    -- Verificar conflitos com bloqueios
    SELECT COUNT(*) INTO v_conflict_count
    FROM calendar_blocks
    WHERE closer_id = NEW.closer_id
        AND block_date = NEW.appointment_date
        AND is_active = true
        AND (
            (start_time <= NEW.start_time AND end_time > NEW.start_time) OR
            (start_time < NEW.end_time AND end_time >= NEW.end_time) OR
            (start_time >= NEW.start_time AND end_time <= NEW.end_time)
        );
    
    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Conflito de agendamento: horário bloqueado na agenda';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_appointment_conflicts_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    WHEN (NEW.status IN ('scheduled', 'confirmed'))
    EXECUTE FUNCTION validate_appointment_conflicts();

-- Trigger para auto-completar agendamentos passados
CREATE OR REPLACE FUNCTION auto_complete_past_appointments()
RETURNS void AS $$
BEGIN
    UPDATE appointments
    SET 
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
    WHERE status IN ('scheduled', 'confirmed', 'in_progress')
        AND appointment_date < CURRENT_DATE - INTERVAL '1 day';
        
    -- Registrar no log
    INSERT INTO appointment_logs (appointment_id, organization_id, action, performed_at)
    SELECT 
        id,
        organization_id,
        'completed',
        CURRENT_TIMESTAMP
    FROM appointments
    WHERE status = 'completed'
        AND updated_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

-- 7. CONFIGURAR DISPONIBILIDADE PADRÃO PARA CLOSERS EXISTENTES
-- ================================================

-- Inserir disponibilidade padrão para Paulo Guimarães (Segunda a Sexta, 9h às 18h)
INSERT INTO closer_availability (
    closer_id,
    organization_id,
    weekday,
    start_time,
    end_time,
    slot_duration_minutes,
    buffer_minutes,
    is_recurring
)
SELECT 
    '23d77835-951e-46a1-bb07-f66a96a4d8ad'::UUID,
    '9c8c0033-15ea-4e33-a55f-28d81a19693b'::UUID,
    generate_series(1, 5), -- Segunda(1) a Sexta(5)
    '09:00'::TIME,
    '18:00'::TIME,
    30,
    5,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM closer_availability 
    WHERE closer_id = '23d77835-951e-46a1-bb07-f66a96a4d8ad'::UUID
);

-- Inserir disponibilidade padrão para Kelly (Segunda a Sexta, 9h às 18h)
INSERT INTO closer_availability (
    closer_id,
    organization_id,
    weekday,
    start_time,
    end_time,
    slot_duration_minutes,
    buffer_minutes,
    is_recurring
)
SELECT 
    '66dfd430-e2b3-4a54-8e42-421d214083ed'::UUID,
    '9c8c0033-15ea-4e33-a55f-28d81a19693b'::UUID,
    generate_series(1, 5), -- Segunda(1) a Sexta(5)
    '09:00'::TIME,
    '18:00'::TIME,
    30,
    5,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM closer_availability 
    WHERE closer_id = '66dfd430-e2b3-4a54-8e42-421d214083ed'::UUID
);

-- Adicionar bloqueio de almoço para ambos closers (12h às 13h)
INSERT INTO calendar_blocks (
    closer_id,
    organization_id,
    block_date,
    start_time,
    end_time,
    block_type,
    is_recurring,
    recurrence_pattern,
    reason
)
SELECT 
    closer_id,
    '9c8c0033-15ea-4e33-a55f-28d81a19693b'::UUID,
    CURRENT_DATE,
    '12:00'::TIME,
    '13:00'::TIME,
    'lunch',
    true,
    'daily',
    'Horário de almoço'
FROM (
    VALUES 
        ('23d77835-951e-46a1-bb07-f66a96a4d8ad'::UUID),
        ('66dfd430-e2b3-4a54-8e42-421d214083ed'::UUID)
) AS closers(closer_id)
WHERE NOT EXISTS (
    SELECT 1 FROM calendar_blocks 
    WHERE closer_id = closers.closer_id 
        AND block_type = 'lunch'
);

-- 8. CRIAR VIEWS ÚTEIS
-- ================================================

-- View de disponibilidade diária consolidada
CREATE OR REPLACE VIEW v_daily_availability AS
SELECT 
    c.id as closer_id,
    c.nome_completo as closer_name,
    c.organization_id,
    date_series.date,
    ca.start_time,
    ca.end_time,
    ca.slot_duration_minutes,
    COUNT(DISTINCT a.id) as appointments_count,
    ca.max_daily_appointments,
    (ca.max_daily_appointments - COUNT(DISTINCT a.id)) as available_slots
FROM closers c
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', '1 day'::INTERVAL) as date_series(date)
LEFT JOIN closer_availability ca ON 
    ca.closer_id = c.id 
    AND ca.is_active = true
    AND (
        (ca.is_recurring = true AND ca.weekday = EXTRACT(DOW FROM date_series.date)) OR
        (ca.is_recurring = false AND ca.specific_date = date_series.date)
    )
LEFT JOIN appointments a ON 
    a.closer_id = c.id 
    AND a.appointment_date = date_series.date::DATE
    AND a.status IN ('scheduled', 'confirmed')
WHERE c.status_contrato = 'ativo'
GROUP BY c.id, c.nome_completo, c.organization_id, date_series.date, 
         ca.start_time, ca.end_time, ca.slot_duration_minutes, ca.max_daily_appointments;

-- View de próximos agendamentos
CREATE OR REPLACE VIEW v_upcoming_appointments AS
SELECT 
    a.*,
    l.nome_completo as lead_name,
    l.telefone as lead_phone,
    l.email as lead_email,
    c.nome_completo as closer_name,
    c.email as closer_email,
    (a.appointment_date + a.start_time)::TIMESTAMP as appointment_datetime
FROM appointments a
JOIN leads l ON l.id = a.lead_id
JOIN closers c ON c.id = a.closer_id
WHERE a.status IN ('scheduled', 'confirmed')
    AND a.appointment_date >= CURRENT_DATE
ORDER BY a.appointment_date, a.start_time;

-- View de performance de agendamentos
CREATE OR REPLACE VIEW v_appointment_performance AS
SELECT 
    c.id as closer_id,
    c.nome_completo as closer_name,
    c.organization_id,
    DATE_TRUNC('month', a.appointment_date) as month,
    COUNT(*) FILTER (WHERE a.status = 'completed') as completed_appointments,
    COUNT(*) FILTER (WHERE a.status = 'no_show') as no_show_appointments,
    COUNT(*) FILTER (WHERE a.status = 'cancelled') as cancelled_appointments,
    COUNT(*) FILTER (WHERE a.outcome = 'sale') as successful_sales,
    COUNT(*) as total_appointments,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE a.status = 'completed') / NULLIF(COUNT(*), 0),
        2
    ) as completion_rate,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE a.outcome = 'sale') / 
        NULLIF(COUNT(*) FILTER (WHERE a.status = 'completed'), 0),
        2
    ) as conversion_rate
FROM closers c
LEFT JOIN appointments a ON a.closer_id = c.id
WHERE c.status_contrato = 'ativo'
GROUP BY c.id, c.nome_completo, c.organization_id, DATE_TRUNC('month', a.appointment_date);

-- 9. CRIAR POLÍTICAS RLS (Row Level Security)
-- ================================================

-- Habilitar RLS nas tabelas
ALTER TABLE closer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para closer_availability
CREATE POLICY "Closers podem ver sua própria disponibilidade"
    ON closer_availability FOR SELECT
    USING (auth.uid()::TEXT = closer_id::TEXT OR EXISTS (
        SELECT 1 FROM closers WHERE id = auth.uid()::UUID AND tipo_closer = 'admin'
    ));

CREATE POLICY "Closers podem gerenciar sua própria disponibilidade"
    ON closer_availability FOR ALL
    USING (auth.uid()::TEXT = closer_id::TEXT OR EXISTS (
        SELECT 1 FROM closers WHERE id = auth.uid()::UUID AND tipo_closer = 'admin'
    ));

-- Políticas para appointments
CREATE POLICY "Closers podem ver seus próprios agendamentos"
    ON appointments FOR SELECT
    USING (auth.uid()::TEXT = closer_id::TEXT OR EXISTS (
        SELECT 1 FROM closers WHERE id = auth.uid()::UUID AND tipo_closer = 'admin'
    ));

CREATE POLICY "Closers podem gerenciar seus agendamentos"
    ON appointments FOR ALL
    USING (auth.uid()::TEXT = closer_id::TEXT OR EXISTS (
        SELECT 1 FROM closers WHERE id = auth.uid()::UUID AND tipo_closer = 'admin'
    ));

-- Políticas para calendar_blocks
CREATE POLICY "Closers podem ver seus bloqueios"
    ON calendar_blocks FOR SELECT
    USING (auth.uid()::TEXT = closer_id::TEXT OR EXISTS (
        SELECT 1 FROM closers WHERE id = auth.uid()::UUID AND tipo_closer = 'admin'
    ));

CREATE POLICY "Closers podem gerenciar seus bloqueios"
    ON calendar_blocks FOR ALL
    USING (auth.uid()::TEXT = closer_id::TEXT OR EXISTS (
        SELECT 1 FROM closers WHERE id = auth.uid()::UUID AND tipo_closer = 'admin'
    ));

-- 10. CRIAR FUNÇÕES DE API PARA O FRONTEND
-- ================================================

-- Função para buscar agenda disponível para agendamento público
CREATE OR REPLACE FUNCTION get_public_availability(
    p_closer_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_end_date DATE;
BEGIN
    -- Definir data final (máximo 30 dias)
    v_end_date := COALESCE(p_end_date, p_start_date + INTERVAL '7 days');
    
    IF v_end_date > p_start_date + INTERVAL '30 days' THEN
        v_end_date := p_start_date + INTERVAL '30 days';
    END IF;
    
    -- Buscar disponibilidade
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', date_series.date,
            'slots', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'time', to_char(slot_start, 'HH24:MI'),
                        'available', is_available
                    )
                    ORDER BY slot_start
                )
                FROM get_closer_availability(
                    COALESCE(p_closer_id, c.id),
                    date_series.date::DATE
                )
                WHERE is_available = true
            )
        )
    ) INTO v_result
    FROM generate_series(p_start_date, v_end_date, '1 day'::INTERVAL) as date_series(date)
    CROSS JOIN (
        SELECT id FROM closers 
        WHERE status_contrato = 'ativo' 
            AND (p_closer_id IS NULL OR id = p_closer_id)
        LIMIT 1
    ) c;
    
    RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Função para dashboard de agendamentos
CREATE OR REPLACE FUNCTION get_appointments_dashboard(
    p_organization_id UUID,
    p_date_range INTERVAL DEFAULT INTERVAL '7 days'
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'summary', jsonb_build_object(
            'total_scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
            'total_confirmed', COUNT(*) FILTER (WHERE status = 'confirmed'),
            'total_completed', COUNT(*) FILTER (WHERE status = 'completed'),
            'total_cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
            'total_no_show', COUNT(*) FILTER (WHERE status = 'no_show')
        ),
        'upcoming', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'lead_name', l.nome_completo,
                    'closer_name', c.nome_completo,
                    'datetime', (a.appointment_date + a.start_time)::TIMESTAMP,
                    'status', a.status,
                    'type', a.appointment_type
                )
                ORDER BY a.appointment_date, a.start_time
            )
            FROM appointments a
            JOIN leads l ON l.id = a.lead_id
            JOIN closers c ON c.id = a.closer_id
            WHERE a.organization_id = p_organization_id
                AND a.appointment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_date_range
                AND a.status IN ('scheduled', 'confirmed')
            LIMIT 10
        ),
        'performance', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'closer_name', nome_completo,
                    'total_appointments', total_appointments,
                    'completion_rate', completion_rate,
                    'conversion_rate', conversion_rate
                )
            )
            FROM v_appointment_performance
            WHERE organization_id = p_organization_id
                AND month = DATE_TRUNC('month', CURRENT_DATE)
        )
    ) INTO v_result
    FROM appointments
    WHERE organization_id = p_organization_id
        AND appointment_date >= CURRENT_DATE - INTERVAL '30 days';
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions para as funções
GRANT EXECUTE ON FUNCTION get_closer_availability TO anon, authenticated;
GRANT EXECUTE ON FUNCTION schedule_appointment TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION get_closer_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_available_slot TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_availability TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_appointments_dashboard TO authenticated;

-- Grant permissions nas tabelas
GRANT SELECT, INSERT, UPDATE ON closer_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE ON appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON calendar_blocks TO authenticated;
GRANT SELECT, INSERT ON appointment_logs TO authenticated;

-- Grant permissions nas views
GRANT SELECT ON v_daily_availability TO authenticated;
GRANT SELECT ON v_upcoming_appointments TO authenticated;
GRANT SELECT ON v_appointment_performance TO authenticated;

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'SISTEMA DE AGENDA DOS CLOSERS CRIADO COM SUCESSO!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tabelas criadas:';
    RAISE NOTICE '  - closer_availability';
    RAISE NOTICE '  - appointments';
    RAISE NOTICE '  - calendar_blocks';
    RAISE NOTICE '  - appointment_logs';
    RAISE NOTICE '';
    RAISE NOTICE 'Funções disponíveis:';
    RAISE NOTICE '  - get_closer_availability()';
    RAISE NOTICE '  - schedule_appointment()';
    RAISE NOTICE '  - cancel_appointment()';
    RAISE NOTICE '  - get_closer_schedule()';
    RAISE NOTICE '  - get_next_available_slot()';
    RAISE NOTICE '  - get_public_availability()';
    RAISE NOTICE '  - get_appointments_dashboard()';
    RAISE NOTICE '';
    RAISE NOTICE 'Views criadas:';
    RAISE NOTICE '  - v_daily_availability';
    RAISE NOTICE '  - v_upcoming_appointments';
    RAISE NOTICE '  - v_appointment_performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Configuração inicial:';
    RAISE NOTICE '  - Paulo Guimarães: Segunda a Sexta, 9h às 18h';
    RAISE NOTICE '  - Kelly: Segunda a Sexta, 9h às 18h';
    RAISE NOTICE '  - Horário de almoço: 12h às 13h (bloqueado)';
    RAISE NOTICE '  - Slots de 30 minutos com 5 minutos de buffer';
    RAISE NOTICE '================================================';
END $$;