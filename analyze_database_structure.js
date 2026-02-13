const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabase() {
  console.log('=== ANÁLISE COMPLETA DO BANCO DE DADOS PARA SISTEMA DE LEADS ===\n');
  
  try {
    // 1. Listar todas as tabelas
    const { data: tables, error: tablesError } = await supabase.rpc('get_all_tables', {});
    
    // Alternativa se a função não existir
    const { data: allTables, error: allTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    const tableList = allTables || tables || [];
    
    console.log('📊 TABELAS ENCONTRADAS:');
    console.log('------------------------');
    
    // Filtrar tabelas relevantes para o sistema de leads
    const relevantKeywords = ['lead', 'closer', 'agenda', 'schedule', 'appointment', 'call', 'meeting', 'score', 'distribution', 'assignment', 'user', 'profile', 'contact', 'customer', 'divida', 'financial'];
    
    const relevantTables = [];
    
    for (const table of tableList) {
      const tableName = table.table_name || table;
      const isRelevant = relevantKeywords.some(keyword => 
        tableName.toLowerCase().includes(keyword)
      );
      
      if (isRelevant || tableName.includes('_')) {
        relevantTables.push(tableName);
        console.log(`✓ ${tableName}`);
      }
    }
    
    console.log('\n=== ESTRUTURA DETALHADA DAS TABELAS RELEVANTES ===\n');
    
    // 2. Analisar estrutura de cada tabela relevante
    for (const tableName of relevantTables) {
      console.log(`\n📋 TABELA: ${tableName}`);
      console.log('----------------------------------------');
      
      // Buscar colunas
      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');
      
      if (columns && columns.length > 0) {
        console.log('Campos:');
        columns.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
        });
      }
      
      // Buscar foreign keys
      const { data: fks } = await supabase.rpc('get_table_foreign_keys', { table_name: tableName }).catch(() => ({ data: null }));
      
      if (fks && fks.length > 0) {
        console.log('\nRelacionamentos (Foreign Keys):');
        fks.forEach(fk => {
          console.log(`  - ${fk.column_name} → ${fk.foreign_table_name}(${fk.foreign_column_name})`);
        });
      }
      
      // Buscar índices
      const { data: indexes } = await supabase.rpc('get_table_indexes', { table_name: tableName }).catch(() => ({ data: null }));
      
      if (indexes && indexes.length > 0) {
        console.log('\nÍndices:');
        indexes.forEach(idx => {
          console.log(`  - ${idx.index_name}: ${idx.column_name}`);
        });
      }
      
      // Contar registros
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      console.log(`\nTotal de registros: ${count || 0}`);
    }
    
    // 3. Análise específica para sistema de leads
    console.log('\n\n=== ANÁLISE ESPECÍFICA PARA SISTEMA DE LEADS ===\n');
    
    // Verificar tabela de leads
    const { data: leadsTable } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'leads')
      .order('ordinal_position');
    
    if (leadsTable && leadsTable.length > 0) {
      console.log('✅ Tabela LEADS encontrada');
      const scoreFields = leadsTable.filter(col => 
        col.column_name.includes('score') || 
        col.column_name.includes('point') || 
        col.column_name.includes('rating') ||
        col.column_name.includes('temperature')
      );
      
      if (scoreFields.length > 0) {
        console.log('  ✓ Campos de pontuação encontrados:', scoreFields.map(f => f.column_name).join(', '));
      } else {
        console.log('  ⚠️ Nenhum campo de pontuação encontrado');
      }
      
      const closerFields = leadsTable.filter(col => 
        col.column_name.includes('closer') || 
        col.column_name.includes('assigned') ||
        col.column_name.includes('owner')
      );
      
      if (closerFields.length > 0) {
        console.log('  ✓ Campos de atribuição encontrados:', closerFields.map(f => f.column_name).join(', '));
      } else {
        console.log('  ⚠️ Nenhum campo de atribuição a closer encontrado');
      }
    } else {
      console.log('❌ Tabela LEADS não encontrada');
    }
    
    // Verificar tabela de closers
    const { data: closersTable } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'closers')
      .order('ordinal_position');
    
    if (closersTable && closersTable.length > 0) {
      console.log('\n✅ Tabela CLOSERS encontrada');
      const capacityFields = closersTable.filter(col => 
        col.column_name.includes('capacity') || 
        col.column_name.includes('max') ||
        col.column_name.includes('limit')
      );
      
      if (capacityFields.length > 0) {
        console.log('  ✓ Campos de capacidade encontrados:', capacityFields.map(f => f.column_name).join(', '));
      } else {
        console.log('  ⚠️ Nenhum campo de capacidade encontrado');
      }
    } else {
      console.log('\n❌ Tabela CLOSERS não encontrada');
    }
    
    // Verificar tabela de agenda
    const agendaTables = relevantTables.filter(t => 
      t.includes('agenda') || 
      t.includes('schedule') || 
      t.includes('appointment') ||
      t.includes('calendar')
    );
    
    if (agendaTables.length > 0) {
      console.log('\n✅ Tabelas de agenda encontradas:', agendaTables.join(', '));
    } else {
      console.log('\n❌ Nenhuma tabela de agenda encontrada');
    }
    
    // 4. Identificar GAPS
    console.log('\n\n=== GAPS IDENTIFICADOS ===\n');
    
    const gaps = [];
    
    if (!leadsTable || leadsTable.length === 0) {
      gaps.push('• Tabela LEADS não existe ou está vazia');
    } else {
      if (!leadsTable.some(col => col.column_name.includes('score'))) {
        gaps.push('• Campo de pontuação (score) ausente na tabela leads');
      }
      if (!leadsTable.some(col => col.column_name.includes('temperature'))) {
        gaps.push('• Campo de temperatura do lead ausente');
      }
      if (!leadsTable.some(col => col.column_name.includes('closer') || col.column_name.includes('assigned'))) {
        gaps.push('• Campo para atribuir closer ao lead ausente');
      }
    }
    
    if (!closersTable || closersTable.length === 0) {
      gaps.push('• Tabela CLOSERS não existe');
    } else {
      if (!closersTable.some(col => col.column_name.includes('capacity'))) {
        gaps.push('• Campo de capacidade máxima ausente na tabela closers');
      }
    }
    
    if (agendaTables.length === 0) {
      gaps.push('• Sistema de agenda/agendamento não existe');
    }
    
    if (gaps.length > 0) {
      gaps.forEach(gap => console.log(gap));
    } else {
      console.log('✅ Estrutura básica completa!');
    }
    
    // 5. Sugestões de implementação
    console.log('\n\n=== SUGESTÕES DE IMPLEMENTAÇÃO ===\n');
    console.log('1. TABELA LEADS - Campos necessários:');
    console.log('   - lead_score: integer (0-100)');
    console.log('   - temperature: enum (cold, warm, hot)');
    console.log('   - assigned_closer_id: uuid (FK para closers)');
    console.log('   - assigned_at: timestamp');
    console.log('   - last_contact: timestamp');
    console.log('   - next_followup: timestamp');
    console.log('   - status: enum (new, contacted, qualified, negotiating, won, lost)');
    
    console.log('\n2. TABELA CLOSERS - Estrutura sugerida:');
    console.log('   - id: uuid PRIMARY KEY');
    console.log('   - user_id: uuid (FK para auth.users)');
    console.log('   - name: text');
    console.log('   - email: text');
    console.log('   - daily_capacity: integer');
    console.log('   - current_leads_count: integer');
    console.log('   - specialization: text[]');
    console.log('   - performance_score: decimal');
    console.log('   - is_active: boolean');
    
    console.log('\n3. TABELA CLOSER_AVAILABILITY - Para agenda:');
    console.log('   - id: uuid PRIMARY KEY');
    console.log('   - closer_id: uuid (FK)');
    console.log('   - date: date');
    console.log('   - time_slots: jsonb[]');
    console.log('   - available_slots: integer');
    console.log('   - booked_slots: integer');
    
    console.log('\n4. TABELA APPOINTMENTS - Para agendamentos:');
    console.log('   - id: uuid PRIMARY KEY');
    console.log('   - lead_id: uuid (FK)');
    console.log('   - closer_id: uuid (FK)');
    console.log('   - scheduled_at: timestamp');
    console.log('   - duration_minutes: integer');
    console.log('   - type: enum (discovery, demo, negotiation, closing)');
    console.log('   - status: enum (scheduled, completed, cancelled, no_show)');
    console.log('   - meeting_url: text');
    console.log('   - notes: text');
    
    console.log('\n5. TABELA LEAD_SCORING_RULES - Para pontuação automática:');
    console.log('   - id: uuid PRIMARY KEY');
    console.log('   - field_name: text');
    console.log('   - condition: jsonb');
    console.log('   - points: integer');
    console.log('   - is_active: boolean');
    
    console.log('\n6. FUNÇÕES E TRIGGERS necessários:');
    console.log('   - calculate_lead_score(): Função para calcular pontuação');
    console.log('   - auto_assign_closer(): Função para distribuição automática');
    console.log('   - update_closer_capacity(): Trigger para atualizar capacidade');
    console.log('   - schedule_appointment(): Função para agendar reuniões');
    
  } catch (error) {
    console.error('Erro na análise:', error);
  }
}

// Executar análise
analyzeDatabase();