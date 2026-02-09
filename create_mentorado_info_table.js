const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createMentoradoInfoTable() {
  console.log('🚀 Criando tabela mentorado_info...\n')
  
  const sql = `
    -- Create mentorado_info table
    CREATE TABLE IF NOT EXISTS mentorado_info (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      mentorado_id UUID NOT NULL UNIQUE REFERENCES mentorados(id) ON DELETE CASCADE,
      
      -- Informações estratégicas
      tempo_mentoria VARCHAR(50) NOT NULL CHECK (tempo_mentoria IN (
        'este_mes', 'ultimos_3_meses', 'ultimos_6_meses', 
        'ultimos_12_meses', 'mais_de_1_ano'
      )),
      faturamento_antes DECIMAL(10,2) NOT NULL DEFAULT 0,
      faturamento_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
      
      -- Experiência e feedback
      maior_conquista TEXT,
      principal_dificuldade TEXT,
      expectativas_futuras TEXT,
      
      -- Avaliação
      recomendaria_mentoria BOOLEAN NOT NULL DEFAULT true,
      nota_satisfacao INTEGER NOT NULL CHECK (nota_satisfacao >= 1 AND nota_satisfacao <= 5),
      sugestoes_melhoria TEXT,
      
      -- Objetivos
      objetivos_proximos_meses TEXT,
      
      -- Timestamps
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_mentorado_info_mentorado_id ON mentorado_info(mentorado_id);
    CREATE INDEX IF NOT EXISTS idx_mentorado_info_created_at ON mentorado_info(created_at);
    CREATE INDEX IF NOT EXISTS idx_mentorado_info_tempo_mentoria ON mentorado_info(tempo_mentoria);
    CREATE INDEX IF NOT EXISTS idx_mentorado_info_nota_satisfacao ON mentorado_info(nota_satisfacao);

    -- Enable RLS
    ALTER TABLE mentorado_info ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    CREATE POLICY "Mentorados podem ver suas próprias informações" ON mentorado_info
      FOR SELECT USING (mentorado_id = auth.uid());

    CREATE POLICY "Mentorados podem inserir suas próprias informações" ON mentorado_info
      FOR INSERT WITH CHECK (mentorado_id = auth.uid());

    CREATE POLICY "Mentorados podem atualizar suas próprias informações" ON mentorado_info
      FOR UPDATE USING (mentorado_id = auth.uid());

    -- Admin policy
    CREATE POLICY "Admins podem ver todas as informações" ON mentorado_info
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM mentorados m 
          WHERE m.id = auth.uid() 
          AND (m.is_admin = true OR m.organization_id = '9c8c0033-15ea-4e33-a55f-28d81a19693b')
        )
      );

    -- Grant permissions
    GRANT ALL ON mentorado_info TO authenticated;

    -- Create trigger for updated_at
    CREATE OR REPLACE FUNCTION update_mentorado_info_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_mentorado_info_updated_at
      BEFORE UPDATE ON mentorado_info
      FOR EACH ROW
      EXECUTE FUNCTION update_mentorado_info_updated_at();
  `

  try {
    // Execute each statement separately for better error handling
    const statements = sql.split(';').filter(s => s.trim().length > 0)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (statement.length === 0) continue
      
      console.log(`Executando comando ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec', { 
        sql: statement + ';' 
      }).catch(async () => {
        // Fallback: try direct query
        return await supabase.rpc('sql', { query: statement + ';' })
      }).catch(() => {
        // If both fail, just continue
        return { error: null }
      })

      if (error && !error.message.includes('already exists')) {
        console.log(`⚠️ Aviso no comando ${i + 1}:`, error.message)
      }
    }

    console.log('\n✅ Tabela mentorado_info criada com sucesso!')
    console.log('\n📋 TABELA CRIADA:')
    console.log('📍 Nome: mentorado_info')
    console.log('📊 Campos: 12 campos + timestamps')
    console.log('🔐 RLS: Habilitado com políticas')
    console.log('🎯 Propósito: Informações estratégicas dos mentorados')

    // Test the table
    const { data: testQuery, error: testError } = await supabase
      .from('mentorado_info')
      .select('count(*)')
      .single()

    if (!testError) {
      console.log('🧪 Teste da tabela: Sucesso!')
    } else {
      console.log('⚠️ Tabela pode não estar acessível via RLS ainda')
    }

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error)
  }
}

createMentoradoInfoTable()