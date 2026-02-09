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

async function verifyMedicalScoring() {
  console.log('🔍 Verifying medical form scoring implementation...');

  try {
    // 1. Check if form_submissions table exists and has recent medical form submissions
    console.log('📋 Checking form_submissions...');
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('template_slug', 'qualificacao-medica')
      .order('created_at', { ascending: false })
      .limit(5);

    if (submissionsError) {
      console.error('❌ Error checking form_submissions:', submissionsError.message);
    } else {
      console.log('✅ Form submissions found:', submissions?.length || 0);
      if (submissions && submissions.length > 0) {
        const latest = submissions[0];
        console.log('📝 Latest submission data keys:', Object.keys(latest.submission_data || {}));
        console.log('🔗 Has agendamento_token:', !!(latest.submission_data?.agendamento_token));
        console.log('🎯 Has lead_score:', !!(latest.submission_data?.lead_score));
      }
    }

    // 2. Check if leads table has temperature and scoring data
    console.log('👥 Checking leads table...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, temperatura_calculada, lead_score_detalhado, tracking_data')
      .not('temperatura_calculada', 'is', null)
      .limit(5);

    if (leadsError) {
      console.error('❌ Error checking leads:', leadsError.message);
    } else {
      console.log('✅ Leads with scoring found:', leads?.length || 0);
      if (leads && leads.length > 0) {
        leads.forEach((lead, idx) => {
          console.log(`📊 Lead ${idx + 1}:`, {
            temperatura: lead.temperatura_calculada,
            score: lead.lead_score_detalhado,
            hasTracking: !!(lead.tracking_data)
          });
        });
      }
    }

    // 3. Check if agendamento_links exist
    console.log('🗓️  Checking agendamento_links...');
    const { data: links, error: linksError } = await supabase
      .from('agendamento_links')
      .select('token_link, titulo_personalizado, cor_tema, tipo_call_permitido')
      .order('created_at', { ascending: false })
      .limit(5);

    if (linksError) {
      console.error('❌ Error checking agendamento_links:', linksError.message);
    } else {
      console.log('✅ Scheduling links found:', links?.length || 0);
      if (links && links.length > 0) {
        links.forEach((link, idx) => {
          console.log(`🔗 Link ${idx + 1}:`, {
            token: link.token_link.substring(0, 8) + '...',
            titulo: link.titulo_personalizado,
            cor: link.cor_tema,
            tipo: link.tipo_call_permitido
          });
        });
      }
    }

    // 4. Check if calculate_medical_form_score function exists
    console.log('🧮 Testing scoring function...');
    
    const testData = {
      renda_mensal: 'Acima de R$ 120.000',
      capacidade_investimento: 'Acima de R$ 80.000',
      situacao_trabalho: 'Sócio de clínica/hospital',
      urgencia_mudanca: 'Extremamente urgente - preciso de resultados já',
      experiencia_anos: 'Mais de 20 anos',
      maior_desafio: 'Aumentar minha renda mensal',
      objetivo_12_meses: 'Conquistar independência financeira',
      ja_investiu_mentoria: 'Sim, várias vezes e tive bons resultados'
    };

    try {
      const { data: scoreResult, error: scoreError } = await supabase
        .rpc('calculate_medical_form_score', { submission_data: testData });

      if (scoreError) {
        console.error('❌ Error testing scoring function:', scoreError.message);
      } else {
        console.log('✅ Scoring function works:', scoreResult);
      }
    } catch (err) {
      console.error('❌ Scoring function not available:', err.message);
    }

    // 5. Check calendar_events table
    console.log('📅 Checking calendar_events...');
    const { data: events, error: eventsError } = await supabase
      .from('calendar_events')
      .select('*')
      .limit(3);

    if (eventsError) {
      console.error('❌ Error checking calendar_events:', eventsError.message);
    } else {
      console.log('✅ Calendar events found:', events?.length || 0);
    }

    // 6. Check form template configuration
    console.log('📄 Checking form template...');
    const { data: template, error: templateError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('slug', 'qualificacao-medica')
      .single();

    if (templateError) {
      console.error('❌ Error checking form template:', templateError.message);
    } else {
      console.log('✅ Form template found');
      console.log('🔧 Has redirect config:', !!(template.fields?.redirect_after_submit));
      console.log('🎯 Has scoring enabled:', !!(template.fields?.scoring_enabled));
      console.log('📅 Has auto scheduling:', !!(template.fields?.auto_create_scheduling));
    }

  } catch (error) {
    console.error('❌ General error:', error);
  }

  console.log('🎯 Medical scoring verification complete');
}

verifyMedicalScoring().catch(console.error);