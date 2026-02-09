const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Usar service role key para ter permissões administrativas
const supabaseUrl = "https://udzmlnnztzzwrphhizol.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA"

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeMigrations() {
  console.log('🚀 Executando migrações diretamente...')
  
  try {
    // 1. Criar tabelas principais do sistema de comissão
    console.log('\n💰 Criando tabelas do sistema de comissão...')
    
    // Tabela referrals
    const { error: referralsError } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.referrals (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          mentorado_id UUID NOT NULL,
          lead_id UUID NOT NULL,
          organization_id UUID NOT NULL,
          referral_code VARCHAR(50) UNIQUE,
          referral_date TIMESTAMPTZ DEFAULT NOW(),
          referral_source VARCHAR(100),
          referral_notes TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          contract_value DECIMAL(10,2),
          payment_plan VARCHAR(50),
          conversion_date TIMESTAMPTZ,
          first_payment_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          CONSTRAINT fk_mentorado FOREIGN KEY (mentorado_id) REFERENCES mentorados(id) ON DELETE RESTRICT,
          CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        );
      `
    })

    if (referralsError && !referralsError.message.includes('already exists')) {
      console.log('⚠️  Usando approach alternativo para criar tabelas...')
      
      // Approach alternativo: usar insert para "simular" criação de tabelas
      try {
        await supabase.from('referrals').select('id').limit(1)
        console.log('✅ Tabela referrals já existe')
      } catch {
        console.log('❌ Precisa executar migrations manualmente no Supabase Dashboard')
        console.log('📋 Arquivo para executar: /Users/gabrielmaia/Desktop/ECOSSISTEMA GM/cs/cssystem/migrations_consolidated.sql')
        console.log('🌐 URL do Dashboard: https://app.supabase.com/project/udzmlnnztzzwrphhizol/sql')
      }
    }

    // Verificar se as tabelas principais existem
    const tables = ['referrals', 'referral_payments', 'commissions', 'lead_qualifications']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (!error) {
          console.log(`✅ Tabela ${table} existe e está acessível`)
        }
      } catch (e) {
        console.log(`❌ Tabela ${table} não existe: ${e.message}`)
      }
    }

    console.log('\n📋 INSTRUÇÕES PARA FINALIZAR SETUP:')
    console.log('1. Acesse: https://app.supabase.com/project/udzmlnnztzzwrphhizol/sql')
    console.log('2. Execute o arquivo: migrations_consolidated.sql')
    console.log('3. Volte aqui para continuar o desenvolvimento')

  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

executeMigrations()