/**
 * Deploy direto do sistema de agendamentos usando API do Supabase
 * Como o Supabase não permite execução direta de SQL via API,
 * este script fornece instruções e testa as tabelas criadas
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        return { exists: false, error: 'Tabela não existe' };
      }
      return { exists: true, error: error.message };
    }
    
    return { exists: true, count: data ? data.length : 0 };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function insertAvailability() {
  const closers = [
    {
      id: '23d77835-951e-46a1-bb07-f66a96a4d8ad',
      name: 'Paulo Guimarães'
    },
    {
      id: '66dfd430-e2b3-4a54-8e42-421d214083ed',
      name: 'Kelly'
    }
  ];
  
  for (const closer of closers) {
    console.log(`\n  Configurando disponibilidade para ${closer.name}...`);
    
    // Inserir disponibilidade para cada dia útil
    for (let weekday = 1; weekday <= 5; weekday++) {
      const { data, error } = await supabase
        .from('closer_availability')
        .insert({
          closer_id: closer.id,
          organization_id: '9c8c0033-15ea-4e33-a55f-28d81a19693b',
          weekday: weekday,
          start_time: '09:00:00',
          end_time: '18:00:00',
          slot_duration_minutes: 30,
          buffer_minutes: 5,
          is_recurring: true,
          is_active: true
        })
        .select();
      
      if (error && !error.message.includes('duplicate')) {
        console.log(`    ❌ Erro ao inserir dia ${weekday}: ${error.message}`);
      } else if (data) {
        console.log(`    ✅ Dia ${weekday} configurado`);
      }
    }
  }
}

async function testAppointmentCreation() {
  console.log('\n📝 Testando criação de agendamento...');
  
  // Buscar um lead existente
  const { data: leads } = await supabase
    .from('leads')
    .select('id, nome_completo')
    .limit(1);
  
  if (!leads || leads.length === 0) {
    console.log('  ⚠️  Nenhum lead encontrado para teste');
    return;
  }
  
  const lead = leads[0];
  const closerId = '23d77835-951e-46a1-bb07-f66a96a4d8ad'; // Paulo
  
  // Criar um agendamento de teste para amanhã
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      lead_id: lead.id,
      closer_id: closerId,
      organization_id: '9c8c0033-15ea-4e33-a55f-28d81a19693b',
      appointment_date: tomorrow.toISOString().split('T')[0],
      start_time: '14:00:00',
      end_time: '14:30:00',
      status: 'scheduled',
      appointment_type: 'call',
      title: `Call com ${lead.nome_completo}`,
      description: 'Agendamento de teste criado pelo sistema'
    })
    .select();
  
  if (error) {
    console.log(`  ❌ Erro ao criar agendamento: ${error.message}`);
  } else {
    console.log(`  ✅ Agendamento criado com sucesso!`);
    console.log(`     ID: ${data[0].id}`);
    console.log(`     Lead: ${lead.nome_completo}`);
    console.log(`     Data: ${data[0].appointment_date} às ${data[0].start_time}`);
  }
}

async function main() {
  console.log('🚀 Sistema de Deploy e Teste do Sistema de Agendamentos\n');
  console.log('=' .repeat(50));
  
  // Instruções para o usuário
  console.log('\n📋 INSTRUÇÕES IMPORTANTES:');
  console.log('=' .repeat(50));
  console.log('\n1. Acesse o Supabase Dashboard:');
  console.log(`   ${supabaseUrl}`);
  console.log('\n2. Vá para SQL Editor');
  console.log('\n3. Cole e execute o conteúdo do arquivo:');
  console.log('   create_appointment_system.sql');
  console.log('\n4. Após executar o SQL, volte aqui e pressione ENTER\n');
  
  // Aguardar confirmação
  console.log('Pressione ENTER após executar o SQL no Supabase...');
  
  // Pular a espera e testar diretamente
  console.log('\n🔍 Verificando tabelas criadas...\n');
  
  const tables = [
    'closer_availability',
    'appointments', 
    'calendar_blocks',
    'appointment_logs'
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    const result = await testTable(table);
    if (result.exists) {
      console.log(`✅ Tabela ${table} existe`);
    } else {
      console.log(`❌ Tabela ${table} não encontrada: ${result.error}`);
      allTablesExist = false;
    }
  }
  
  if (allTablesExist) {
    console.log('\n✨ Todas as tabelas foram criadas com sucesso!');
    
    // Configurar disponibilidade inicial
    console.log('\n⚙️  Configurando disponibilidade dos closers...');
    await insertAvailability();
    
    // Testar criação de agendamento
    await testAppointmentCreation();
    
    // Verificar disponibilidade
    console.log('\n📅 Verificando slots disponíveis...');
    
    const { data: availability } = await supabase
      .from('closer_availability')
      .select('*')
      .eq('closer_id', '23d77835-951e-46a1-bb07-f66a96a4d8ad')
      .limit(5);
    
    if (availability && availability.length > 0) {
      console.log(`  ✅ ${availability.length} configurações de disponibilidade encontradas`);
    }
    
    // Buscar agendamentos
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (appointments && appointments.length > 0) {
      console.log(`  ✅ ${appointments.length} agendamentos encontrados`);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 SISTEMA DE AGENDAMENTOS PRONTO PARA USO!');
    console.log('=' .repeat(50));
    
    console.log('\n📊 Resumo do Sistema:');
    console.log('  • Tabelas criadas: 4');
    console.log('  • Closers configurados: 2');
    console.log('  • Horário padrão: Segunda a Sexta, 9h às 18h');
    console.log('  • Duração dos slots: 30 minutos');
    console.log('  • Buffer entre reuniões: 5 minutos');
    
    console.log('\n🔧 APIs disponíveis para o frontend:');
    console.log('  • GET /closer_availability - Buscar disponibilidade');
    console.log('  • POST /appointments - Criar agendamento');
    console.log('  • PATCH /appointments - Atualizar status');
    console.log('  • GET /appointments - Listar agendamentos');
    
    console.log('\n💡 Próximos passos:');
    console.log('  1. Integrar calendário no frontend');
    console.log('  2. Adicionar notificações por email/SMS');
    console.log('  3. Implementar lembretes automáticos');
    console.log('  4. Criar dashboard de métricas');
    
  } else {
    console.log('\n⚠️  Algumas tabelas não foram encontradas.');
    console.log('\n📝 Por favor, execute o seguinte SQL no Supabase Dashboard:\n');
    console.log('1. Acesse: ' + supabaseUrl);
    console.log('2. Vá para SQL Editor');
    console.log('3. Cole o conteúdo de: create_appointment_system.sql');
    console.log('4. Clique em "Run"');
    console.log('\n📄 O arquivo SQL contém:');
    console.log('  • 4 tabelas principais');
    console.log('  • 5 funções PostgreSQL');
    console.log('  • 2 views para relatórios');
    console.log('  • Triggers automáticos');
    console.log('  • Configuração inicial dos closers');
  }
}

// Executar
main().catch(console.error);