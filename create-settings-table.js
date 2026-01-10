const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'
);

(async () => {
  try {
    console.log('🔧 Testando se organization_settings existe...');

    // Primeiro, verificar se já existe
    const checkResult = await supabase
      .from('organization_settings')
      .select('id')
      .limit(1);

    if (checkResult.error && checkResult.error.code === '42P01') {
      console.log('❌ Tabela não existe. Precisa ser criada manualmente.');
      console.log('Execute este SQL no Supabase SQL Editor:');
      console.log(`
CREATE TABLE organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  admin_phone TEXT,
  whatsapp_notifications BOOLEAN DEFAULT true,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  business_hours_start TIME DEFAULT '09:00:00',
  business_hours_end TIME DEFAULT '18:00:00',
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  calendar_reminder_hours INTEGER DEFAULT 24,
  auto_confirm_appointments BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);
      `);
    } else if (!checkResult.error) {
      console.log('✅ Tabela organization_settings já existe!');

      // Verificar organizações e adicionar configurações padrão
      const orgsResult = await supabase
        .from('organizations')
        .select('id');

      console.log('🏢 Organizações encontradas:', orgsResult.data?.length || 0);

      if (orgsResult.data && orgsResult.data.length > 0) {
        for (const org of orgsResult.data) {
          // Verificar se já existe configuração para esta org
          const existsResult = await supabase
            .from('organization_settings')
            .select('id')
            .eq('organization_id', org.id)
            .single();

          if (existsResult.error && existsResult.error.code === 'PGRST116') {
            // Não existe, criar
            const insertResult = await supabase
              .from('organization_settings')
              .insert({
                organization_id: org.id,
                admin_phone: '+5583996910414',
                whatsapp_notifications: true
              });

            if (insertResult.error) {
              console.log(`❌ Erro ao criar configuração para ${org.id}:`, insertResult.error.message);
            } else {
              console.log(`✅ Configuração criada para organização ${org.id}`);
            }
          } else {
            console.log(`ℹ️  Configuração já existe para organização ${org.id}`);
          }
        }
      }
    } else {
      console.log('❌ Erro ao verificar tabela:', checkResult.error);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
})();