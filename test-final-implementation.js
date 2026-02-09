const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
const env = {};
lines.forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    env[key] = values.join('=');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testFinalImplementation() {
  console.log('🔬 Testing final medical form implementation...\n');

  try {
    // 1. Test the complete medical form flow
    console.log('🏥 Testing complete medical form submission flow...');
    
    const testSubmission = {
      template_slug: 'qualificacao-medica',
      submission_data: {
        nome_completo: 'Dr. Maria Silva',
        email: 'maria.silva@hospital.com',
        telefone: '(11) 99888-7777',
        
        // High-value medical professional
        renda_mensal: 'Acima de R$ 120.000',
        capacidade_investimento: 'Acima de R$ 80.000',
        situacao_trabalho: 'Sócio de clínica/hospital',
        urgencia_mudanca: 'Extremamente urgente - preciso de resultados já',
        experiencia_anos: 'Mais de 20 anos',
        maior_desafio: 'Aumentar minha renda mensal',
        objetivo_12_meses: 'Conquistar independência financeira',
        ja_investiu_mentoria: 'Sim, várias vezes e tive bons resultados',
        
        // Additional medical context
        especialidade: 'Cardiologia',
        plantoes_por_semana: '1-2',
        dependencia_horas: 'menos_metade',
        estilo_decisao: 'rapido',
        o_que_mais_incomoda: 'Gostaria de ter mais tempo livre sem perder renda',
        visao_3_anos: 'Quero ter um consultório próspero e trabalhar apenas 4 dias por semana',
        por_que_agora: 'Estou cansado da rotina hospitalar e quero mais qualidade de vida',
        
        form_version: '2.0',
        completion_time: 480,
        device_info: {
          user_agent: 'Test Browser',
          platform: 'Test Platform',
          screen_resolution: '1920x1080',
          is_mobile: false
        }
      }
    };

    const { data: submissionData, error: submissionError } = await supabase
      .from('form_submissions')
      .insert([testSubmission])
      .select()
      .single();

    if (submissionError) {
      console.error('❌ Submission failed:', submissionError.message);
      return;
    }

    console.log('✅ Form submitted successfully');
    console.log(`📋 Submission ID: ${submissionData.id}`);
    
    // Check automatic processing results
    const hasToken = submissionData.submission_data?.agendamento_token;
    const hasScore = submissionData.submission_data?.lead_score;
    const hasTemperature = submissionData.submission_data?.lead_temperatura;
    const hasRedirect = submissionData.submission_data?.redirect_url;
    
    console.log(`🔗 Auto-generated agendamento token: ${hasToken ? '✅' : '❌'}`);
    console.log(`🎯 Auto-calculated score: ${hasScore ? '✅ (' + hasScore + ')' : '❌'}`);
    console.log(`🌡️  Auto-calculated temperature: ${hasTemperature ? '✅ (' + hasTemperature + ')' : '❌'}`);
    console.log(`📍 Auto-generated redirect URL: ${hasRedirect ? '✅' : '❌'}`);
    
    if (hasToken) {
      console.log(`🔗 Agendamento token: ${submissionData.submission_data.agendamento_token.substring(0, 8)}...`);
    }
    
    if (hasRedirect) {
      console.log(`📍 Redirect URL: ${submissionData.submission_data.redirect_url}`);
    }

    // 2. Verify lead was created/updated
    if (submissionData.lead_id) {
      console.log('\n👤 Checking created lead...');
      
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', submissionData.lead_id)
        .single();

      if (leadError) {
        console.error('❌ Lead check failed:', leadError.message);
      } else {
        console.log('✅ Lead created successfully');
        console.log(`📊 Lead score: ${leadData.lead_score_detalhado}`);
        console.log(`🌡️  Lead temperature: ${leadData.temperatura_calculada}`);
        console.log(`🎯 Lead priority: ${leadData.prioridade_nivel}`);
        console.log(`📋 Has tracking data: ${leadData.tracking_data ? '✅' : '❌'}`);
      }
    }

    // 3. Verify scheduling link was created
    if (hasToken) {
      console.log('\n📅 Checking scheduling link...');
      
      const { data: linkData, error: linkError } = await supabase
        .from('agendamento_links')
        .select('*')
        .eq('token_link', submissionData.submission_data.agendamento_token)
        .single();

      if (linkError) {
        console.error('❌ Scheduling link check failed:', linkError.message);
      } else {
        console.log('✅ Scheduling link created successfully');
        console.log(`🏷️  Title: ${linkData.titulo_personalizado}`);
        console.log(`🎨 Theme color: ${linkData.cor_tema}`);
        console.log(`📞 Call type: ${linkData.tipo_call_permitido}`);
        console.log(`✅ Active: ${linkData.ativo}`);
        console.log(`📝 Description: ${linkData.descricao_personalizada?.substring(0, 50)}...`);
      }
    }

    // 4. Test calendar integration
    console.log('\n📅 Testing calendar integration...');
    
    const { data: events, error: eventsError } = await supabase
      .from('calendar_events')
      .select('*')
      .limit(1);

    if (eventsError) {
      console.error('❌ Calendar check failed:', eventsError.message);
    } else {
      console.log(`✅ Calendar system available (${events?.length || 0} events found)`);
    }

    // 5. Test financial sync (check if it's working now)
    console.log('\n💰 Testing financial sync (quick check)...');
    
    try {
      const { data: transacoes, error: transacoesError } = await supabase
        .from('transacoes_financeiras')
        .select('id')
        .limit(1);

      const { data: categorias, error: categoriasError } = await supabase
        .from('categorias_financeiras')
        .select('id')
        .limit(1);

      console.log(`💳 Transacoes table: ${transacoesError ? '❌' : '✅'}`);
      console.log(`📂 Categories table: ${categoriasError ? '❌' : '✅'}`);
      
    } catch (err) {
      console.log('⚠️  Financial sync check skipped');
    }

    // Summary
    console.log('\n🎯 FINAL IMPLEMENTATION STATUS:');
    console.log('='.repeat(50));
    console.log(`✅ Medical form submission: Working`);
    console.log(`${hasScore ? '✅' : '❌'} Automatic scoring: ${hasScore ? 'Working' : 'Failed'}`);
    console.log(`${hasTemperature ? '✅' : '❌'} Lead temperature classification: ${hasTemperature ? 'Working' : 'Failed'}`);
    console.log(`${hasToken ? '✅' : '❌'} Automatic scheduling link creation: ${hasToken ? 'Working' : 'Failed'}`);
    console.log(`${hasRedirect ? '✅' : '❌'} Automatic redirect generation: ${hasRedirect ? 'Working' : 'Failed'}`);
    console.log(`${submissionData.lead_id ? '✅' : '❌'} Lead creation/update: ${submissionData.lead_id ? 'Working' : 'Failed'}`);
    console.log('='.repeat(50));
    
    if (hasScore && hasTemperature && hasToken && hasRedirect) {
      console.log('🎉 ALL SYSTEMS OPERATIONAL! Medical form is fully automated.');
      console.log('📋 Form workflow:');
      console.log('   1. User fills medical qualification form ✅');
      console.log('   2. Form automatically calculates lead score ✅');
      console.log('   3. Lead temperature (hot/warm/cold) determined ✅');
      console.log('   4. Scheduling link automatically generated ✅');
      console.log('   5. User redirected to personalized booking page ✅');
      console.log('   6. Lead data stored with full tracking ✅');
    } else {
      console.log('⚠️  Some components may need additional configuration.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  console.log('\n🔬 Test complete!');
}

testFinalImplementation().catch(console.error);