const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabase() {
  console.log('=== ANÁLISE DO BANCO DE DADOS SUPABASE ===\n');
  console.log(`URL: ${supabaseUrl}\n`);
  
  // Lista de tabelas para verificar
  const tablesToCheck = [
    'profiles',
    'dividas', 
    'dividas_financial',
    'closers',
    'leads',
    'appointments',
    'medical_forms',
    'financial_entries',
    'commission_entries',
    'organizations',
    'referrals',
    'video_assets',
    'users',
    'contacts',
    'customers',
    'agenda',
    'schedule',
    'calls',
    'meetings'
  ];
  
  const existingTables = [];
  const tableStructures = {};
  
  console.log('🔍 VERIFICANDO TABELAS...\n');
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (!error) {
        existingTables.push(tableName);
        console.log(`✅ ${tableName.padEnd(20)} - ${count} registros`);
        
        if (data && data.length > 0) {
          tableStructures[tableName] = Object.keys(data[0]);
        }
      } else {
        if (!error.message.includes('does not exist')) {
          console.log(`⚠️  ${tableName.padEnd(20)} - ${error.message}`);
        }
      }
    } catch (e) {
      // Tabela não existe
    }
  }
  
  console.log('\n=== TABELAS ENCONTRADAS ===\n');
  existingTables.forEach(table => {
    console.log(`📋 ${table}`);
    if (tableStructures[table]) {
      console.log(`   Campos: ${tableStructures[table].join(', ')}\n`);
    }
  });
  
  // Análise específica da tabela dividas
  if (existingTables.includes('dividas')) {
    console.log('\n=== ANÁLISE DA TABELA DIVIDAS (BASE PARA LEADS) ===\n');
    
    try {
      const { data: sample } = await supabase
        .from('dividas')
        .select('*')
        .limit(1);
      
      if (sample && sample.length > 0) {
        const fields = Object.keys(sample[0]);
        
        console.log('📊 Estrutura atual:');
        fields.forEach(field => {
          const value = sample[0][field];
          let type = 'unknown';
          if (value === null) type = 'null';
          else if (typeof value === 'number') type = 'number';
          else if (typeof value === 'string') type = 'text';
          else if (typeof value === 'boolean') type = 'boolean';
          else if (value instanceof Date) type = 'timestamp';
          else if (typeof value === 'object') type = 'jsonb';
          
          console.log(`  ${field.padEnd(25)}: ${type}`);
        });
        
        console.log('\n🎯 Campos relevantes para sistema de leads:');
        
        // Verificar campos de identificação
        const idFields = fields.filter(f => f.includes('id') || f === 'uuid');
        if (idFields.length > 0) {
          console.log(`  ✓ Identificação: ${idFields.join(', ')}`);
        }
        
        // Verificar campos de contato
        const contactFields = fields.filter(f => 
          f.includes('name') || f.includes('email') || f.includes('phone') || f.includes('whatsapp')
        );
        if (contactFields.length > 0) {
          console.log(`  ✓ Contato: ${contactFields.join(', ')}`);
        }
        
        // Verificar campos de valor
        const valueFields = fields.filter(f => 
          f.includes('value') || f.includes('amount') || f.includes('valor') || f.includes('total')
        );
        if (valueFields.length > 0) {
          console.log(`  ✓ Valor: ${valueFields.join(', ')}`);
        }
        
        // Verificar campos de status
        const statusFields = fields.filter(f => 
          f.includes('status') || f.includes('state') || f.includes('stage')
        );
        if (statusFields.length > 0) {
          console.log(`  ✓ Status: ${statusFields.join(', ')}`);
        }
        
        // Verificar campos de data
        const dateFields = fields.filter(f => 
          f.includes('date') || f.includes('created') || f.includes('updated') || f.includes('_at')
        );
        if (dateFields.length > 0) {
          console.log(`  ✓ Datas: ${dateFields.join(', ')}`);
        }
        
        // Verificar campos que FALTAM para sistema de leads
        console.log('\n❌ Campos AUSENTES necessários:');
        
        if (!fields.some(f => f.includes('score') || f.includes('rating'))) {
          console.log('  • lead_score (pontuação 0-100)');
        }
        
        if (!fields.some(f => f.includes('temperature'))) {
          console.log('  • temperature (cold/warm/hot)');
        }
        
        if (!fields.some(f => f.includes('assigned') || f.includes('closer'))) {
          console.log('  • assigned_closer_id (FK para closers)');
          console.log('  • assigned_at (timestamp da atribuição)');
        }
        
        if (!fields.some(f => f.includes('priority'))) {
          console.log('  • priority_level (low/medium/high/urgent)');
        }
        
        if (!fields.some(f => f.includes('source'))) {
          console.log('  • lead_source (origem do lead)');
        }
        
        if (!fields.some(f => f.includes('last_contact'))) {
          console.log('  • last_contact_at (último contato)');
          console.log('  • next_followup_at (próximo follow-up)');
        }
      }
    } catch (e) {
      console.log('Erro ao analisar dividas:', e.message);
    }
  }
  
  // Análise da tabela closers
  if (existingTables.includes('closers')) {
    console.log('\n=== ANÁLISE DA TABELA CLOSERS ===\n');
    
    try {
      const { data: sample } = await supabase
        .from('closers')
        .select('*')
        .limit(1);
      
      if (sample && sample.length > 0) {
        console.log('✅ Tabela closers existe com campos:');
        Object.keys(sample[0]).forEach(field => {
          console.log(`  • ${field}`);
        });
      }
    } catch (e) {
      console.log('Tabela closers existe mas está vazia ou inacessível');
    }
  } else {
    console.log('\n❌ TABELA CLOSERS NÃO EXISTE');
    console.log('Precisa criar com estrutura:');
    console.log(`
CREATE TABLE closers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  daily_capacity INTEGER DEFAULT 20,
  current_leads_count INTEGER DEFAULT 0,
  specialization TEXT[],
  performance_score DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
  }
  
  // Verificar se existe alguma tabela de agenda
  const agendaTables = existingTables.filter(t => 
    t.includes('appointment') || t.includes('agenda') || t.includes('schedule') || t.includes('calendar')
  );
  
  if (agendaTables.length === 0) {
    console.log('\n❌ SISTEMA DE AGENDA NÃO EXISTE');
    console.log('Precisa criar tabelas:');
    console.log(`
1. TABELA DE DISPONIBILIDADE:
CREATE TABLE closer_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  closer_id UUID REFERENCES closers(id),
  date DATE NOT NULL,
  time_slots JSONB DEFAULT '[]',
  available_slots INTEGER DEFAULT 8,
  booked_slots INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(closer_id, date)
);

2. TABELA DE AGENDAMENTOS:
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES dividas(id),
  closer_id UUID REFERENCES closers(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  type TEXT CHECK (type IN ('discovery', 'demo', 'negotiation', 'closing')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  meeting_url TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
  }
  
  console.log('\n\n=== RESUMO DA ANÁLISE ===\n');
  console.log('📊 Situação atual:');
  console.log(`  • Tabelas existentes: ${existingTables.length}`);
  console.log(`  • Base de leads: ${existingTables.includes('dividas') ? '✅ dividas (precisa adaptação)' : '❌ não existe'}`);
  console.log(`  • Sistema de closers: ${existingTables.includes('closers') ? '✅ existe' : '❌ não existe'}`);
  console.log(`  • Sistema de agenda: ${agendaTables.length > 0 ? '✅ existe' : '❌ não existe'}`);
  
  console.log('\n🎯 Próximos passos necessários:');
  console.log('  1. Adicionar campos de scoring na tabela dividas');
  console.log('  2. Criar tabela closers (se não existir)');
  console.log('  3. Criar sistema de agenda/appointments');
  console.log('  4. Implementar funções de cálculo de score');
  console.log('  5. Implementar distribuição automática');
  console.log('  6. Criar triggers para automação');
}

// Executar análise
analyzeDatabase();