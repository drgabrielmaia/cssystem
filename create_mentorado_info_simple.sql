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
CREATE POLICY "Mentorados podem gerenciar suas informações" ON mentorado_info
  FOR ALL USING (mentorado_id = auth.uid());

-- Grant permissions
GRANT ALL ON mentorado_info TO authenticated;