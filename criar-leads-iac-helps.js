require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function criarLeadsIAcHelps() {
  console.log('📝 CRIANDO LEADS PARA A ORGANIZAÇÃO IAC HELPS\n');

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const organizationId = '1689ece2-a066-4bca-9262-c3bf66a15d43'; // IAC Helps
    
    // Verificar se a organização existe
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.log('❌ Organização IAC Helps não encontrada:', orgError);
      return;
    }

    console.log('🏢 Organização encontrada:', org.name);

    // Criar alguns leads de exemplo para a IAC Helps
    const leadsParaCriar = [
      {
        nome_completo: 'João Silva - IAC',
        email: 'joao.silva@example.com',
        telefone: '+55 11 99999-1111',
        empresa: 'Tech Solutions',
        cargo: 'CEO',
        origem: 'website',
        status: 'novo',
        temperatura: 'quente',
        prioridade: 'alta',
        valor_potencial: 5000,
        observacoes: 'Lead interessado em mentoria para crescimento empresarial',
        data_primeiro_contato: new Date().toISOString(),
        organization_id: organizationId
      },
      {
        nome_completo: 'Maria Santos - IAC',
        email: 'maria.santos@example.com',
        telefone: '+55 11 99999-2222',
        empresa: 'Consultoria MS',
        cargo: 'Diretora',
        origem: 'indicacao',
        status: 'qualificado',
        temperatura: 'morna',
        prioridade: 'media',
        valor_potencial: 3500,
        observacoes: 'Lead qualificado, aguardando agendamento de call',
        data_primeiro_contato: new Date().toISOString(),
        organization_id: organizationId
      },
      {
        nome_completo: 'Pedro Costa - IAC',
        email: 'pedro.costa@example.com',
        telefone: '+55 11 99999-3333',
        empresa: 'Startup ABC',
        cargo: 'Founder',
        origem: 'facebook',
        status: 'negociacao',
        temperatura: 'quente',
        prioridade: 'alta',
        valor_potencial: 8000,
        observacoes: 'Lead em negociação avançada, muito interessado',
        data_primeiro_contato: new Date(Date.now() - 24*60*60*1000).toISOString(), // 1 dia atrás
        organization_id: organizationId
      },
      {
        nome_completo: 'Ana Oliveira - IAC',
        email: 'ana.oliveira@example.com',
        telefone: '+55 11 99999-4444',
        empresa: 'Inovação Digital',
        cargo: 'CTO',
        origem: 'linkedin',
        status: 'vendido',
        temperatura: 'quente',
        prioridade: 'alta',
        valor_potencial: 10000,
        valor_vendido: 10000,
        valor_arrecadado: 10000,
        observacoes: 'Lead convertido com sucesso!',
        data_primeiro_contato: new Date(Date.now() - 48*60*60*1000).toISOString(), // 2 dias atrás
        data_venda: new Date().toISOString(),
        organization_id: organizationId
      },
      {
        nome_completo: 'Carlos Ferreira - IAC',
        email: 'carlos.ferreira@example.com',
        telefone: '+55 11 99999-5555',
        empresa: 'Desenvolvimento CF',
        cargo: 'Gerente',
        origem: 'google',
        status: 'perdido',
        temperatura: 'fria',
        prioridade: 'baixa',
        valor_potencial: 2000,
        observacoes: 'Lead perdido por falta de budget',
        data_primeiro_contato: new Date(Date.now() - 72*60*60*1000).toISOString(), // 3 dias atrás
        organization_id: organizationId
      }
    ];

    console.log('📋 Criando', leadsParaCriar.length, 'leads de exemplo...');

    for (let i = 0; i < leadsParaCriar.length; i++) {
      const lead = leadsParaCriar[i];
      
      const { data, error } = await supabaseAdmin
        .from('leads')
        .insert(lead)
        .select()
        .single();

      if (error) {
        console.log(`❌ Erro ao criar lead ${lead.nome_completo}:`, error);
      } else {
        console.log(`✅ ${i + 1}. Lead criado: ${data.nome_completo} (Status: ${data.status})`);
      }
    }

    // Verificar quantos leads a IAC Helps tem agora
    const { count, error: countError } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (countError) {
      console.log('❌ Erro ao contar leads:', countError);
    } else {
      console.log(`\n📊 Total de leads da IAC Helps: ${count}`);
    }

    console.log('\n🎉 LEADS CRIADOS COM SUCESSO!');
    console.log('✅ Agora o iachelps@gmail.com deve ver estes leads quando fizer login');
    console.log('📧 Login: iachelps@gmail.com');
    console.log('🔑 Senha: iache123');
    console.log('🌐 URL: http://localhost:3000/login');

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

criarLeadsIAcHelps();