const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAllTables() {
  console.log('=== ANÁLISE COMPLETA DE TODAS AS TABELAS DO BANCO ===\n');
  
  try {
    // Consulta SQL direta para listar todas as tabelas
    const { data: tables, error } = await supabase
      .rpc('get_table_list')
      .catch(async () => {
        // Se a função não existir, usar query direta
        const query = `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `;
        
        const { data, error } = await supabase.rpc('query_database', { query_text: query })
          .catch(() => ({ data: null, error: 'Function not found' }));
        
        return { data, error };
      });
    
    // Alternativa: tentar listar tabelas conhecidas através de queries diretas
    const knownTables = [
      'profiles', 'users', 'organizations', 'dividas', 'dividas_financial', 
      'referrals', 'leads', 'closers', 'appointments', 'medical_forms',
      'financial_entries', 'commission_entries', 'video_assets', 'contacts'
    ];
    
    console.log('🔍 Tentando acessar tabelas conhecidas do sistema...\n');
    
    for (const tableName of knownTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`✅ Tabela "${tableName}" existe - ${count || 0} registros`);
          
          // Tentar obter estrutura da tabela
          try {
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (sample && sample.length > 0) {
              console.log(`   Campos: ${Object.keys(sample[0]).join(', ')}`);
            }
          } catch (e) {
            // Ignorar erro ao buscar sample
          }
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ Tabela "${tableName}" não existe`);
        } else {
          console.log(`⚠️ Tabela "${tableName}" - erro ao acessar: ${error.message}`);
        }
      } catch (e) {
        console.log(`⚠️ Erro ao verificar tabela "${tableName}": ${e.message}`);
      }
    }
    
    console.log('\n=== ANÁLISE ESPECÍFICA PARA SISTEMA DE LEADS ===\n');
    
    // Verificar tabela dividas (pode ser usada como leads)
    try {
      const { data: dividasSample, error } = await supabase
        .from('dividas')
        .select('*')
        .limit(1);
      
      if (dividasSample && dividasSample.length > 0) {
        console.log('📊 ESTRUTURA DA TABELA DIVIDAS (pode ser usada como base para leads):');
        console.log('Campos disponíveis:');
        Object.keys(dividasSample[0]).forEach(field => {
          const value = dividasSample[0][field];
          const type = value === null ? 'null' : typeof value;
          console.log(`  - ${field}: ${type}`);
        });
        
        // Verificar campos relevantes para scoring
        const scoringFields = Object.keys(dividasSample[0]).filter(field => 
          field.includes('score') || 
          field.includes('rating') || 
          field.includes('temperature') ||
          field.includes('priority') ||
          field.includes('status')
        );
        
        if (scoringFields.length > 0) {
          console.log('\n✅ Campos que podem ser usados para scoring:', scoringFields.join(', '));
        } else {
          console.log('\n⚠️ Nenhum campo de scoring encontrado na tabela dividas');
        }
        
        // Verificar campos de atribuição
        const assignmentFields = Object.keys(dividasSample[0]).filter(field => 
          field.includes('assigned') || 
          field.includes('owner') || 
          field.includes('closer') ||
          field.includes('user')
        );
        
        if (assignmentFields.length > 0) {
          console.log('✅ Campos que podem ser usados para atribuição:', assignmentFields.join(', '));
        } else {
          console.log('⚠️ Nenhum campo de atribuição encontrado');
        }
      }
    } catch (e) {
      console.log('❌ Não foi possível analisar a tabela dividas');
    }
    
    // Verificar tabela profiles (pode ter closers)
    try {
      const { data: profilesSample, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (profilesSample && profilesSample.length > 0) {
        console.log('\n📊 ESTRUTURA DA TABELA PROFILES (pode ser base para closers):');
        console.log('Campos disponíveis:');
        Object.keys(profilesSample[0]).forEach(field => {
          const value = profilesSample[0][field];
          const type = value === null ? 'null' : typeof value;
          console.log(`  - ${field}: ${type}`);
        });
        
        // Verificar se tem campo role
        if ('role' in profilesSample[0]) {
          console.log('\n✅ Campo "role" existe - pode ser usado para identificar closers');
        }
      }
    } catch (e) {
      console.log('❌ Não foi possível analisar a tabela profiles');
    }
    
    // Verificar tabela de usuários
    try {
      const { data: users, count } = await supabase
        .from('auth.users')
        .select('*', { count: 'exact', head: true });
      
      console.log(`\n📊 USUÁRIOS NO SISTEMA: ${count || 'não foi possível contar'}`);
    } catch (e) {
      // Auth.users pode não ser acessível diretamente
    }
    
    console.log('\n\n=== ESTRUTURA NECESSÁRIA PARA IMPLEMENTAR O SISTEMA COMPLETO ===\n');
    
    console.log('1️⃣ SISTEMA DE PONTUAÇÃO DE LEADS');
    console.log('   Precisa criar ou adaptar:');
    console.log('   • Adicionar campos na tabela dividas: lead_score, temperature, priority_level');
    console.log('   • Criar função calculate_lead_score() para calcular pontuação baseada em critérios');
    console.log('   • Criar trigger para recalcular score quando dados mudarem');
    
    console.log('\n2️⃣ SISTEMA DE CLOSERS');
    console.log('   Precisa criar:');
    console.log('   • Tabela closers com campos de capacidade e especialização');
    console.log('   • Relacionamento com profiles/users');
    console.log('   • Sistema de tracking de performance');
    
    console.log('\n3️⃣ SISTEMA DE DISTRIBUIÇÃO AUTOMÁTICA');
    console.log('   Precisa criar:');
    console.log('   • Campo assigned_closer_id na tabela dividas');
    console.log('   • Função auto_assign_lead() com lógica de distribuição');
    console.log('   • Considerar: score do lead, capacidade do closer, especialização');
    
    console.log('\n4️⃣ SISTEMA DE AGENDA');
    console.log('   Precisa criar:');
    console.log('   • Tabela closer_availability para disponibilidade');
    console.log('   • Tabela appointments para agendamentos');
    console.log('   • Sistema de slots de tempo e conflitos');
    
    console.log('\n5️⃣ SISTEMA DE AGENDAMENTO DE CALLS');
    console.log('   Precisa criar:');
    console.log('   • Integração com calendário (Google Calendar, Calendly, etc)');
    console.log('   • Sistema de notificações e lembretes');
    console.log('   • URLs de reunião (Zoom, Meet, etc)');
    
  } catch (error) {
    console.error('Erro geral na análise:', error.message);
  }
}

// Executar análise
analyzeAllTables();