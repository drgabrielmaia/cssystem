/**
 * Script para implantar o sistema de agendamentos no Supabase
 * Este script executa todas as tabelas, funções e configurações necessárias
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQL dividido em partes executáveis
const sqlStatements = [
  // 1. Criar tabela closer_availability
  `CREATE TABLE IF NOT EXISTS closer_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closer_id UUID NOT NULL REFERENCES closers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    weekday INTEGER CHECK (weekday >= 0 AND weekday <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    specific_date DATE,
    is_active BOOLEAN DEFAULT true,
    is_recurring BOOLEAN DEFAULT true,
    slot_duration_minutes INTEGER DEFAULT 30,
    buffer_minutes INTEGER DEFAULT 0,
    max_daily_appointments INTEGER DEFAULT 20,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_weekday_or_date CHECK (
        (weekday IS NOT NULL AND specific_date IS NULL AND is_recurring = true) OR
        (weekday IS NULL AND specific_date IS NOT NULL AND is_recurring = false)
    )
  )`,

  // 2. Criar tabela appointments
  `CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    closer_id UUID NOT NULL REFERENCES closers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'in_progress', 'completed', 
        'cancelled', 'no_show', 'rescheduled'
    )),
    appointment_type VARCHAR(50) DEFAULT 'call' CHECK (appointment_type IN (
        'call', 'video_call', 'meeting', 'follow_up'
    )),
    meeting_url TEXT,
    meeting_password TEXT,
    title TEXT,
    description TEXT,
    notes TEXT,
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES closers(id),
    cancellation_reason TEXT,
    rescheduled_from UUID REFERENCES appointments(id),
    rescheduled_count INTEGER DEFAULT 0,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    outcome VARCHAR(50) CHECK (outcome IN (
        'sale', 'interested', 'not_interested', 'rescheduled', 'no_decision'
    )),
    outcome_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES closers(id),
    CONSTRAINT valid_appointment_time CHECK (end_time > start_time),
    CONSTRAINT no_double_booking UNIQUE (closer_id, appointment_date, start_time)
  )`,

  // 3. Criar tabela calendar_blocks
  `CREATE TABLE IF NOT EXISTS calendar_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closer_id UUID NOT NULL REFERENCES closers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    block_type VARCHAR(50) DEFAULT 'unavailable' CHECK (block_type IN (
        'unavailable', 'lunch', 'break', 'meeting', 'training', 
        'vacation', 'sick_leave', 'holiday'
    )),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50) CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
    recurrence_end_date DATE,
    reason TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES closers(id),
    CONSTRAINT valid_block_time CHECK (end_time > start_time)
  )`,

  // 4. Criar tabela appointment_logs
  `CREATE TABLE IF NOT EXISTS appointment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'created', 'updated', 'confirmed', 'cancelled', 
        'rescheduled', 'completed', 'no_show', 'reminder_sent'
    )),
    old_values JSONB,
    new_values JSONB,
    notes TEXT,
    performed_by UUID REFERENCES closers(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,

  // 5. Criar índices
  `CREATE INDEX IF NOT EXISTS idx_closer_availability_closer ON closer_availability(closer_id, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_closer_availability_weekday ON closer_availability(weekday, is_active) WHERE is_recurring = true`,
  `CREATE INDEX IF NOT EXISTS idx_closer_availability_date ON closer_availability(specific_date, is_active) WHERE is_recurring = false`,
  `CREATE INDEX IF NOT EXISTS idx_closer_availability_org ON closer_availability(organization_id)`,
  
  `CREATE INDEX IF NOT EXISTS idx_appointments_closer ON appointments(closer_id, appointment_date, status)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_lead ON appointments(lead_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date, status)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status) WHERE status IN ('scheduled', 'confirmed')`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(organization_id)`,
  
  `CREATE INDEX IF NOT EXISTS idx_calendar_blocks_closer ON calendar_blocks(closer_id, block_date, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_calendar_blocks_date ON calendar_blocks(block_date, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_calendar_blocks_org ON calendar_blocks(organization_id)`,
  
  `CREATE INDEX IF NOT EXISTS idx_appointment_logs_appointment ON appointment_logs(appointment_id, performed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_appointment_logs_action ON appointment_logs(action, performed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_appointment_logs_org ON appointment_logs(organization_id)`,

  // 6. Configurar disponibilidade para Paulo
  `INSERT INTO closer_availability (
    closer_id, organization_id, weekday, start_time, end_time, 
    slot_duration_minutes, buffer_minutes, is_recurring
  )
  SELECT 
    '23d77835-951e-46a1-bb07-f66a96a4d8ad'::UUID,
    '9c8c0033-15ea-4e33-a55f-28d81a19693b'::UUID,
    generate_series(1, 5),
    '09:00'::TIME,
    '18:00'::TIME,
    30, 5, true
  WHERE NOT EXISTS (
    SELECT 1 FROM closer_availability 
    WHERE closer_id = '23d77835-951e-46a1-bb07-f66a96a4d8ad'::UUID
  )`,

  // 7. Configurar disponibilidade para Kelly
  `INSERT INTO closer_availability (
    closer_id, organization_id, weekday, start_time, end_time, 
    slot_duration_minutes, buffer_minutes, is_recurring
  )
  SELECT 
    '66dfd430-e2b3-4a54-8e42-421d214083ed'::UUID,
    '9c8c0033-15ea-4e33-a55f-28d81a19693b'::UUID,
    generate_series(1, 5),
    '09:00'::TIME,
    '18:00'::TIME,
    30, 5, true
  WHERE NOT EXISTS (
    SELECT 1 FROM closer_availability 
    WHERE closer_id = '66dfd430-e2b3-4a54-8e42-421d214083ed'::UUID
  )`
];

// Funções SQL separadas (mais complexas)
const sqlFunctions = [
  // Função update_updated_at_column
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  // Função get_closer_availability simplificada
  `CREATE OR REPLACE FUNCTION get_closer_availability(
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
  BEGIN
    v_weekday := EXTRACT(DOW FROM p_date);
    
    RETURN QUERY
    WITH time_slots AS (
      SELECT 
        generate_series(
          COALESCE(ca.start_time, '09:00'::TIME),
          COALESCE(ca.end_time, '18:00'::TIME) - INTERVAL '30 minutes',
          INTERVAL '30 minutes'
        )::TIME as slot_start,
        (generate_series(
          COALESCE(ca.start_time, '09:00'::TIME),
          COALESCE(ca.end_time, '18:00'::TIME) - INTERVAL '30 minutes',
          INTERVAL '30 minutes'
        ) + INTERVAL '30 minutes')::TIME as slot_end
      FROM closer_availability ca
      WHERE ca.closer_id = p_closer_id
        AND ca.is_active = true
        AND (
          (ca.is_recurring = true AND ca.weekday = v_weekday) OR
          (ca.is_recurring = false AND ca.specific_date = p_date)
        )
        AND (p_organization_id IS NULL OR ca.organization_id = p_organization_id)
      LIMIT 1
    )
    SELECT 
      ts.slot_start,
      ts.slot_end,
      NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.closer_id = p_closer_id
          AND a.appointment_date = p_date
          AND a.status IN ('scheduled', 'confirmed', 'in_progress')
          AND a.start_time < ts.slot_end
          AND a.end_time > ts.slot_start
      ) AND NOT EXISTS (
        SELECT 1 FROM calendar_blocks cb
        WHERE cb.closer_id = p_closer_id
          AND cb.block_date = p_date
          AND cb.is_active = true
          AND cb.start_time < ts.slot_end
          AND cb.end_time > ts.slot_start
      ) AND (p_date > CURRENT_DATE OR ts.slot_start > CURRENT_TIME) as is_available
    FROM time_slots ts
    ORDER BY ts.slot_start;
  END;
  $$ LANGUAGE plpgsql`,

  // Função schedule_appointment simplificada
  `CREATE OR REPLACE FUNCTION schedule_appointment(
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
    v_organization_id UUID;
  BEGIN
    SELECT organization_id INTO v_organization_id
    FROM closers WHERE id = p_closer_id;
    
    INSERT INTO appointments (
      lead_id, closer_id, organization_id,
      appointment_date, start_time, end_time,
      status, appointment_type, title, description, created_by
    ) VALUES (
      p_lead_id, p_closer_id, v_organization_id,
      DATE(p_appointment_datetime),
      p_appointment_datetime::TIME,
      (p_appointment_datetime + (p_duration_minutes || ' minutes')::INTERVAL)::TIME,
      'scheduled', p_appointment_type,
      COALESCE(p_title, 'Reunião com Lead'),
      p_description,
      COALESCE(p_created_by, p_closer_id)
    ) RETURNING id INTO v_appointment_id;
    
    RETURN v_appointment_id;
  END;
  $$ LANGUAGE plpgsql`,

  // Função cancel_appointment
  `CREATE OR REPLACE FUNCTION cancel_appointment(
    p_appointment_id UUID,
    p_cancelled_by UUID DEFAULT NULL,
    p_cancellation_reason TEXT DEFAULT NULL
  )
  RETURNS BOOLEAN AS $$
  BEGIN
    UPDATE appointments
    SET 
      status = 'cancelled',
      cancelled_at = CURRENT_TIMESTAMP,
      cancelled_by = p_cancelled_by,
      cancellation_reason = p_cancellation_reason,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = p_appointment_id
      AND status NOT IN ('cancelled', 'completed');
    
    RETURN FOUND;
  END;
  $$ LANGUAGE plpgsql`,

  // Função get_closer_schedule
  `CREATE OR REPLACE FUNCTION get_closer_schedule(
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
  $$ LANGUAGE plpgsql`
];

// Views
const sqlViews = [
  `CREATE OR REPLACE VIEW v_daily_availability AS
  SELECT 
    c.id as closer_id,
    c.nome_completo as closer_name,
    c.organization_id,
    CURRENT_DATE as date,
    ca.start_time,
    ca.end_time,
    ca.slot_duration_minutes,
    COUNT(DISTINCT a.id) as appointments_count,
    ca.max_daily_appointments
  FROM closers c
  LEFT JOIN closer_availability ca ON 
    ca.closer_id = c.id AND ca.is_active = true
  LEFT JOIN appointments a ON 
    a.closer_id = c.id 
    AND a.appointment_date = CURRENT_DATE
    AND a.status IN ('scheduled', 'confirmed')
  WHERE c.status_contrato = 'ativo'
  GROUP BY c.id, c.nome_completo, c.organization_id,
           ca.start_time, ca.end_time, ca.slot_duration_minutes, ca.max_daily_appointments`,

  `CREATE OR REPLACE VIEW v_upcoming_appointments AS
  SELECT 
    a.*,
    l.nome_completo as lead_name,
    l.telefone as lead_phone,
    l.email as lead_email,
    c.nome_completo as closer_name,
    c.email as closer_email
  FROM appointments a
  JOIN leads l ON l.id = a.lead_id
  JOIN closers c ON c.id = a.closer_id
  WHERE a.status IN ('scheduled', 'confirmed')
    AND a.appointment_date >= CURRENT_DATE
  ORDER BY a.appointment_date, a.start_time`
];

// Triggers
const sqlTriggers = [
  `DROP TRIGGER IF EXISTS update_closer_availability_updated_at ON closer_availability`,
  `CREATE TRIGGER update_closer_availability_updated_at
    BEFORE UPDATE ON closer_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
  
  `DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments`,
  `CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
  
  `DROP TRIGGER IF EXISTS update_calendar_blocks_updated_at ON calendar_blocks`,
  `CREATE TRIGGER update_calendar_blocks_updated_at
    BEFORE UPDATE ON calendar_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
];

async function executeSql(sql, description) {
  try {
    console.log(`\n📝 ${description}`);
    
    // Para operações DDL complexas, usar chamada direta à API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    // Alternativa: tentar via supabase.rpc se existir uma função exec_sql
    if (!response.ok) {
      console.log('⚠️  Tentando método alternativo...');
      
      // Para tabelas e índices, simplesmente executar e ignorar erros de "já existe"
      const { data, error } = await supabase.rpc('exec_sql', { query: sql }).single();
      
      if (error && !error.message.includes('already exists')) {
        throw error;
      }
    }
    
    console.log('✅ Sucesso!');
    return true;
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('⚠️  Já existe (ignorando)');
      return true;
    }
    console.error('❌ Erro:', error.message || error);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando implantação do sistema de agendamentos...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  // Executar tabelas e índices
  console.log('\n=== FASE 1: Criando tabelas ===');
  for (const sql of sqlStatements) {
    const desc = sql.match(/CREATE\s+(TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    const description = desc ? `${desc[1]} ${desc[2]}` : 'SQL Statement';
    
    if (await executeSql(sql, description)) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  // Executar funções
  console.log('\n=== FASE 2: Criando funções ===');
  for (const sql of sqlFunctions) {
    const desc = sql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(\w+)/i);
    const description = desc ? `Função ${desc[1]}` : 'Função SQL';
    
    if (await executeSql(sql, description)) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  // Executar views
  console.log('\n=== FASE 3: Criando views ===');
  for (const sql of sqlViews) {
    const desc = sql.match(/CREATE\s+OR\s+REPLACE\s+VIEW\s+(\w+)/i);
    const description = desc ? `View ${desc[1]}` : 'View SQL';
    
    if (await executeSql(sql, description)) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  // Executar triggers
  console.log('\n=== FASE 4: Criando triggers ===');
  for (const sql of sqlTriggers) {
    const desc = sql.match(/(CREATE|DROP)\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
    const description = desc ? `${desc[1]} trigger ${desc[2]}` : 'Trigger SQL';
    
    if (await executeSql(sql, description)) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  // Resumo final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA IMPLANTAÇÃO');
  console.log('='.repeat(50));
  console.log(`✅ Comandos bem-sucedidos: ${successCount}`);
  console.log(`❌ Comandos com erro: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Sistema de agendamentos implantado com sucesso!');
    console.log('\n📋 Recursos disponíveis:');
    console.log('  - Tabela closer_availability: Configuração de disponibilidade dos closers');
    console.log('  - Tabela appointments: Agendamentos de calls/reuniões');
    console.log('  - Tabela calendar_blocks: Bloqueios de agenda');
    console.log('  - Tabela appointment_logs: Histórico de alterações');
    console.log('  - Funções: get_closer_availability, schedule_appointment, cancel_appointment');
    console.log('  - Views: v_daily_availability, v_upcoming_appointments');
    console.log('\n👥 Closers configurados:');
    console.log('  - Paulo Guimarães: Segunda a Sexta, 9h às 18h');
    console.log('  - Kelly: Segunda a Sexta, 9h às 18h');
  } else {
    console.log('\n⚠️  Implantação concluída com alguns erros.');
    console.log('Por favor, verifique os logs acima para mais detalhes.');
  }
}

// Executar
main().catch(console.error);