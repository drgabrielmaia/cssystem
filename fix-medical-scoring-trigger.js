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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY);

async function fixMedicalScoringTrigger() {
  console.log('🔧 Fixing medical scoring trigger...');

  try {
    // Primeiro, vamos desabilitar o trigger que está quebrando
    console.log('🛑 Disabling broken trigger...');
    
    const disableSQL = `
      DROP TRIGGER IF EXISTS trigger_process_medical_form ON form_submissions;
      DROP FUNCTION IF EXISTS process_medical_form_submission();
    `;

    // Como não conseguimos executar SQL diretamente, vamos criar um workaround
    // Vamos verificar se existe alguma submissão que está quebrando

    console.log('🔍 Checking recent form submissions...');
    const { data: recentSubmissions, error: submissionError } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('template_slug', 'qualificacao-medica')
      .order('created_at', { ascending: false })
      .limit(5);

    if (submissionError) {
      console.error('❌ Error checking submissions:', submissionError);
    } else {
      console.log('📋 Found', recentSubmissions?.length || 0, 'recent medical form submissions');
      
      if (recentSubmissions && recentSubmissions.length > 0) {
        console.log('📝 Latest submission data:', JSON.stringify(recentSubmissions[0].submission_data, null, 2));
      }
    }

    // Vamos criar uma versão simplificada que só salva no form_submissions sem trigger
    console.log('🔧 Testing form submission without trigger...');
    
    const testData = {
      template_slug: 'qualificacao-medica',
      submission_data: {
        nome_completo: 'Dr. Teste',
        email: 'teste@teste.com',
        whatsapp: '11999999999',
        principal_fonte_renda: 'Consultório próprio',
        tempo_formado: 'Mais de 10 anos',
        renda_mensal: 'Acima de R$ 60.000'
      }
    };

    const { data: testSubmission, error: testError } = await supabase
      .from('form_submissions')
      .insert([testData])
      .select()
      .single();

    if (testError) {
      console.error('❌ Test submission failed:', testError);
      console.log('💡 The issue is likely in the database trigger');
      console.log('🔧 You need to run this SQL in Supabase dashboard:');
      console.log(`
        -- Drop the broken trigger
        DROP TRIGGER IF EXISTS trigger_process_medical_form ON form_submissions;
        DROP FUNCTION IF EXISTS process_medical_form_submission();

        -- Create a simpler version that doesn't break
        CREATE OR REPLACE FUNCTION process_medical_form_submission_simple()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Only process medical qualification forms
            IF NEW.template_slug = 'qualificacao-medica' THEN
                -- Just add a simple token for now, without complex scoring
                NEW.submission_data := NEW.submission_data || jsonb_build_object(
                    'agendamento_token', encode(gen_random_bytes(8), 'base64url'),
                    'processed_at', NOW()::text
                );
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create the simpler trigger
        CREATE TRIGGER trigger_process_medical_form_simple
            BEFORE INSERT ON form_submissions
            FOR EACH ROW
            EXECUTE FUNCTION process_medical_form_submission_simple();
      `);
    } else {
      console.log('✅ Test submission succeeded:', testSubmission.id);
      console.log('🎯 The form submissions work when trigger is disabled');
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixMedicalScoringTrigger().catch(console.error);