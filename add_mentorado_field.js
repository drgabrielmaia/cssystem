const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTYzNTY3NiwiZXhwIjoyMDQ1MjExNjc2fQ.g6lJLaOQ9CW4PGNJYHMq_xyunTWtMiMGrcdUTD-W7jQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addMentoradoField() {
  try {
    // Primeiro verificar se o campo já existe
    const { data: columns, error: colError } = await supabase
      .from('form_submissions')
      .select('mentorado_id')
      .limit(1)

    if (!colError) {
      console.log('Campo mentorado_id já existe!')
      return
    }

    // Adicionar o campo mentorado_id via SQL direto
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE form_submissions
        ADD COLUMN IF NOT EXISTS mentorado_id UUID REFERENCES mentorados(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_form_submissions_mentorado_id
        ON form_submissions(mentorado_id);

        COMMENT ON COLUMN form_submissions.mentorado_id
        IS 'Mentorado que respondeu diretamente (para formulários NPS/Survey que não criam leads)';
      `
    })

    if (error) {
      console.error('Erro ao adicionar campo:', error)
    } else {
      console.log('Campo mentorado_id adicionado com sucesso!')
    }

  } catch (err) {
    console.error('Erro geral:', err.message)
  }
}

addMentoradoField()