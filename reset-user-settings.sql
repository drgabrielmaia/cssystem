-- ATENÇÃO: Este script vai APAGAR todos os dados da tabela user_settings!
-- Use apenas se quiser recomeçar do zero

-- 1. Dropar a tabela existente (cuidado: apaga todos os dados!)
DROP TABLE IF EXISTS user_settings CASCADE;

-- 2. Recriar a tabela com todos os campos atualizados
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,

  -- Metas mensais
  meta_leads_mes INTEGER DEFAULT 100,
  meta_vendas_mes INTEGER DEFAULT 10,
  meta_faturamento_mes DECIMAL(10,2) DEFAULT 100000.00, -- R$ 100k
  meta_arrecadacao_mes DECIMAL(10,2) DEFAULT 50000.00, -- R$ 50k (50% do faturamento)
  meta_calls_mes INTEGER DEFAULT 50,
  meta_follow_ups_mes INTEGER DEFAULT 200,
  taxa_conversao_ideal DECIMAL(5,2) DEFAULT 10.00, -- 10% conversão ideal

  -- Configurações de notificação
  notificacao_email BOOLEAN DEFAULT true,
  notificacao_whatsapp BOOLEAN DEFAULT true,
  notificacao_follow_ups BOOLEAN DEFAULT true,

  -- Configurações de workflow
  auto_create_follow_ups BOOLEAN DEFAULT true,
  follow_up_call_intervals TEXT DEFAULT '1d,3h,1h,30m', -- intervalos para follow-ups de calls

  -- Configurações visuais
  tema TEXT DEFAULT 'light' CHECK (tema IN ('light', 'dark')),
  cor_primaria TEXT DEFAULT '#3b82f6',

  -- Configurações de funil
  status_pipeline TEXT[] DEFAULT ARRAY['novo', 'qualificado', 'proposta', 'negociacao', 'fechado', 'perdido'],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Recriar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- 4. Inserir configurações padrão para o usuário atual
INSERT INTO user_settings (user_id)
VALUES ('default_user')
ON CONFLICT (user_id) DO NOTHING;

-- 5. Visualizar configurações criadas
SELECT * FROM user_settings WHERE user_id = 'default_user';