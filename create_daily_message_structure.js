import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function searchAndCreateDailyMessage() {
  console.log('📨 BUSCANDO/CRIANDO ESTRUTURA DE MENSAGEM DO DIA');
  console.log('=' .repeat(65));

  // Data de hoje para buscar mensagem ativa
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const todayBR = new Date().toLocaleDateString('pt-BR'); // DD/MM/YYYY

  console.log(`📅 Data de hoje: ${todayBR} (${today})`);

  // 1. Verificar se há mensagens na tabela notifications que possam servir como mensagem do dia
  console.log('\n🔍 1. VERIFICANDO NOTIFICAÇÕES ATUAIS:');
  console.log('-' .repeat(50));

  try {
    // Buscar notificações recentes que possam servir como mensagem do dia
    const notificationsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?select=*&order=created_at.desc&limit=10`,
      { headers }
    );

    if (notificationsResponse.status === 200) {
      const notifications = await notificationsResponse.json();
      console.log(`✅ Encontradas ${notifications.length} notificações recentes`);

      const todayNotifications = notifications.filter(n => {
        const notificationDate = new Date(n.created_at).toISOString().split('T')[0];
        return notificationDate === today;
      });

      if (todayNotifications.length > 0) {
        console.log(`📨 ${todayNotifications.length} notificações de hoje encontradas:`);
        todayNotifications.forEach((n, i) => {
          console.log(`   ${i + 1}. ${n.title}`);
          console.log(`      Mensagem: ${n.message}`);
          console.log(`      Tipo: ${n.type}`);
          console.log(`      ---`);
        });

        // Usar a primeira notificação como mensagem do dia
        const dailyMessage = todayNotifications[0];
        console.log('\n🎯 MENSAGEM DO DIA SUGERIDA:');
        console.log(`Título: ${dailyMessage.title}`);
        console.log(`Conteúdo: ${dailyMessage.message}`);
        console.log(`Horário: ${new Date(dailyMessage.created_at).toLocaleString('pt-BR')}`);
      } else {
        console.log('❌ Nenhuma notificação de hoje encontrada');
      }
    }
  } catch (error) {
    console.log('❌ Erro ao buscar notificações:', error.message);
  }

  // 2. Verificar se podemos criar uma tabela de daily_messages
  console.log('\n🛠️ 2. VERIFICANDO POSSIBILIDADE DE CRIAR TABELA DAILY_MESSAGES:');
  console.log('-' .repeat(50));

  try {
    // Tentar criar a tabela daily_messages (só funcionará se tivermos permissões)
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS daily_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        organization_id UUID NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('⚠️ Para criar a tabela daily_messages, execute este SQL no Supabase:');
    console.log('-' .repeat(70));
    console.log(createTableSQL);
    console.log('-' .repeat(70));

    // Sugerir uma mensagem padrão
    const defaultMessage = {
      date: today,
      title: 'Mensagem do Dia - Médicos de Resultado',
      message: 'Lembre-se: cada atendimento é uma oportunidade de transformar vidas. Seja excelente no que faz!',
      is_active: true
    };

    console.log('\n📝 MENSAGEM PADRÃO SUGERIDA:');
    console.log(`Data: ${defaultMessage.date}`);
    console.log(`Título: ${defaultMessage.title}`);
    console.log(`Mensagem: ${defaultMessage.message}`);

    // SQL para inserir a mensagem
    console.log('\n💾 SQL para inserir mensagem padrão:');
    console.log('-' .repeat(50));
    console.log(`INSERT INTO daily_messages (date, title, message, is_active) VALUES
('${defaultMessage.date}', '${defaultMessage.title}', '${defaultMessage.message}', true);`);

  } catch (error) {
    console.log('❌ Erro ao processar criação da tabela:', error.message);
  }

  // 3. Alternativa: usar configuração no código
  console.log('\n🔧 3. ALTERNATIVA - CONFIGURAÇÃO EM ARQUIVO:');
  console.log('-' .repeat(50));

  const configExample = {
    dailyMessages: {
      [today]: {
        title: 'Mensagem do Dia - Médicos de Resultado',
        message: 'Hoje é um novo dia para fazer a diferença na vida dos seus pacientes. Mantenha o foco na excelência!',
        active: true
      }
    }
  };

  console.log('📁 Criar arquivo: daily-messages-config.json');
  console.log(JSON.stringify(configExample, null, 2));

  // 4. Buscar mensagem para hoje em outras possíveis tabelas
  console.log('\n🔍 4. VERIFICANDO OUTRAS POSSÍVEIS FONTES:');
  console.log('-' .repeat(50));

  const possibleTables = ['posts', 'content', 'announcements', 'feed'];

  for (const tableName of possibleTables) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=3`,
        { headers }
      );

      if (response.status === 200) {
        const data = await response.json();
        console.log(`✅ Tabela ${tableName} existe com ${data.length} registros`);

        if (data.length > 0) {
          console.log(`   Campos: ${Object.keys(data[0]).join(', ')}`);

          // Verificar se há algum registro de hoje
          const todayPosts = data.filter(item => {
            const itemDate = item.created_at || item.date || item.published_at;
            if (itemDate) {
              const postDate = new Date(itemDate).toISOString().split('T')[0];
              return postDate === today;
            }
            return false;
          });

          if (todayPosts.length > 0) {
            console.log(`   📅 ${todayPosts.length} posts de hoje encontrados!`);
            todayPosts.forEach(post => {
              const title = post.title || post.subject || post.name || 'Sem título';
              const content = post.content || post.message || post.description || 'Sem conteúdo';
              console.log(`     - ${title}: ${content.substring(0, 100)}...`);
            });
          }
        }
      } else if (response.status === 404) {
        console.log(`❌ Tabela ${tableName} não existe`);
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar ${tableName}:`, error.message);
    }
  }

  console.log('\n' + '=' .repeat(65));
  console.log('📋 RESUMO - MENSAGEM DO DIA:');
  console.log('=' .repeat(65));

  console.log('\n🎯 OPÇÕES IDENTIFICADAS:');
  console.log('1. ✅ Usar notificações existentes da tabela notifications');
  console.log('2. 🛠️ Criar tabela daily_messages no Supabase (requer SQL)');
  console.log('3. 📁 Usar configuração em arquivo JSON local');
  console.log('4. 💬 Definir mensagem padrão no código');

  console.log('\n📨 MENSAGEM PADRÃO PARA HOJE:');
  console.log('─'.repeat(50));
  console.log('🏥 Médicos de Resultado - Mensagem do Dia');
  console.log('📅 ' + todayBR);
  console.log('💬 "Cada paciente é uma oportunidade de exercer nossa vocação de curar e cuidar. Seja o médico que você gostaria de ter!"');

  console.log('\n🚀 PARA USAR NA API:');
  console.log('─'.repeat(30));
  console.log('Mensagem: "Cada paciente é uma oportunidade de exercer nossa vocação de curar e cuidar. Seja o médico que você gostaria de ter!"');

  console.log('\n✅ Análise de mensagem do dia concluída!');
}

searchAndCreateDailyMessage().catch(console.error);