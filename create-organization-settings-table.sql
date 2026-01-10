-- =============================================
-- Criar tabela de configurações organizacionais
-- =============================================

CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Configurações do WhatsApp
    admin_phone TEXT, -- Número do administrador para receber notificações
    whatsapp_notifications BOOLEAN DEFAULT true,

    -- Configurações gerais
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    business_hours_start TIME DEFAULT '09:00:00',
    business_hours_end TIME DEFAULT '18:00:00',

    -- Configurações de notificações
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,

    -- Configurações do calendário
    calendar_reminder_hours INTEGER DEFAULT 24, -- Lembrar X horas antes
    auto_confirm_appointments BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Uma configuração por organização
    UNIQUE(organization_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_organization_settings_organization_id ON organization_settings(organization_id);

-- RLS (Row Level Security)
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas configurações da sua organização
CREATE POLICY "Users can view their organization settings" ON organization_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.organization_id = organization_settings.organization_id
            AND organization_users.user_id = auth.uid()
        )
    );

-- Política para permitir que usuários editem configurações da sua organização
CREATE POLICY "Users can update their organization settings" ON organization_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.organization_id = organization_settings.organization_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role IN ('admin', 'owner')
        )
    );

-- Criar configurações padrão para organizações existentes
INSERT INTO organization_settings (organization_id, admin_phone, whatsapp_notifications)
SELECT id, '+5583996910414', true  -- Número padrão
FROM organizations
WHERE id NOT IN (
    SELECT organization_id FROM organization_settings
)
ON CONFLICT (organization_id) DO NOTHING;