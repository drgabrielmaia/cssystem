const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otudvzgkbmnyhyrbblku.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90dWR2emdrYm1ueWh5cmJibGt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5MzE2NjksImV4cCI6MjA0MDUwNzY2OX0.lGQcUKj9t7jAFKvN7fVwGI85sCQZHq6rXPTmrjkKouc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  console.log('🔍 Verificando sistema de mensagens do dia e organizações...\n');

  // 1. Verificar tabela de organizações
  try {
    console.log('📊 1. Verificando organizações...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, admin_phone, owner_email')
      .limit(10);

    if (!orgError && orgs) {
      console.log(`✅ ${orgs.length} organizações encontradas:`);
      orgs.forEach(org => {
        console.log(`- ID: ${org.id} | Nome: ${org.name} | Admin Phone: ${org.admin_phone} | Email: ${org.owner_email}`);
      });
    } else {
      console.log('❌ Erro ao consultar organizações:', orgError?.message);
    }
  } catch (e) {
    console.log('❌ Erro ao acessar tabela organizations:', e.message);
  }

  console.log('\n');

  // 2. Verificar tabelas de mensagens automáticas
  const tablesToCheck = ['auto_messages', 'daily_messages', 'whatsapp_messages', 'scheduled_messages', 'notifications'];

  console.log('📱 2. Verificando tabelas de mensagens...');
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`✅ Tabela encontrada: ${table}`);
        if (data && data[0]) {
          console.log(`  📋 Colunas: ${Object.keys(data[0]).join(', ')}`);
        } else {
          console.log('  📋 Tabela vazia');
        }
      }
    } catch (e) {
      console.log(`❌ Tabela não encontrada: ${table}`);
    }
  }

  console.log('\n');

  // 3. Verificar se existe alguma mensagem do dia configurada
  try {
    console.log('📝 3. Verificando mensagens automáticas existentes...');
    const { data: autoMessages, error: autoError } = await supabase
      .from('auto_messages')
      .select('*')
      .limit(10);

    if (!autoError && autoMessages) {
      console.log(`✅ ${autoMessages.length} mensagens automáticas encontradas:`);
      autoMessages.forEach(msg => {
        console.log(`- ID: ${msg.id} | Mensagem: "${msg.message?.substring(0, 50)}..." | Ativo: ${msg.is_active}`);
      });
    } else {
      console.log('❌ Não foi possível acessar mensagens automáticas:', autoError?.message);
    }
  } catch (e) {
    console.log('❌ Erro ao verificar auto_messages:', e.message);
  }

  console.log('\n');

  // 4. Verificar API do WhatsApp
  try {
    console.log('📞 4. Verificando API do WhatsApp...');
    const whatsappApiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br';
    console.log(`📡 URL da API: ${whatsappApiUrl}`);

    // Testar endpoint de status
    console.log('🔍 Testando endpoint /status...');
    const statusResponse = await fetch(`${whatsappApiUrl}/status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ API WhatsApp acessível:', statusData);
    } else {
      console.log('❌ API WhatsApp não respondeu adequadamente');
    }
  } catch (e) {
    console.log('❌ Erro ao verificar API WhatsApp:', e.message);
  }

  console.log('\n🏁 Verificação completa!');
})();