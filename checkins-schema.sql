-- Schema para sistema de check-ins
-- Para ser adicionado ao Supabase

-- Tabela de check-ins agendados
CREATE TABLE checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_agendada TIMESTAMP WITH TIME ZONE NOT NULL,
  duracao_minutos INTEGER DEFAULT 60,
  status VARCHAR(50) DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'realizado', 'cancelado', 'reagendado')),
  tipo VARCHAR(50) DEFAULT 'checkin' CHECK (tipo IN ('checkin', 'mentoria', 'follow-up', 'avaliacao')),
  link_reuniao TEXT,
  notas_pre_reuniao TEXT,
  notas_pos_reuniao TEXT,
  objetivos TEXT[],
  resultados_alcancados TEXT[],
  proximos_passos TEXT[],
  nota_satisfacao INTEGER CHECK (nota_satisfacao >= 1 AND nota_satisfacao <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID DEFAULT auth.uid(),
  cancelado_por UUID REFERENCES auth.users(id),
  motivo_cancelamento TEXT,
  data_cancelamento TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_checkins_mentorado_id ON checkins(mentorado_id);
CREATE INDEX idx_checkins_data_agendada ON checkins(data_agendada);
CREATE INDEX idx_checkins_status ON checkins(status);
CREATE INDEX idx_checkins_tipo ON checkins(tipo);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_checkins_updated_at 
    BEFORE UPDATE ON checkins 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso aos dados dos próprios check-ins
CREATE POLICY "Users can view their own checkins" ON checkins
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own checkins" ON checkins
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own checkins" ON checkins
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own checkins" ON checkins
    FOR DELETE USING (auth.uid() = created_by);

-- Função para buscar próximos check-ins
CREATE OR REPLACE FUNCTION get_upcoming_checkins(dias_futuro INTEGER DEFAULT 7)
RETURNS TABLE (
    id UUID,
    mentorado_nome TEXT,
    mentorado_email TEXT,
    titulo TEXT,
    data_agendada TIMESTAMP WITH TIME ZONE,
    status TEXT,
    tipo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        m.nome_completo,
        m.email,
        c.titulo,
        c.data_agendada,
        c.status,
        c.tipo
    FROM checkins c
    JOIN mentorados m ON c.mentorado_id = m.id
    WHERE c.data_agendada >= NOW()
    AND c.data_agendada <= NOW() + INTERVAL '1 day' * dias_futuro
    AND c.status IN ('agendado', 'confirmado')
    ORDER BY c.data_agendada ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para estatísticas de check-ins
CREATE OR REPLACE FUNCTION get_checkin_stats()
RETURNS TABLE (
    total_agendados BIGINT,
    total_realizados BIGINT,
    total_cancelados BIGINT,
    media_satisfacao NUMERIC,
    proximo_checkin TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status IN ('agendado', 'confirmado')) as total_agendados,
        COUNT(*) FILTER (WHERE status = 'realizado') as total_realizados,
        COUNT(*) FILTER (WHERE status = 'cancelado') as total_cancelados,
        AVG(nota_satisfacao) FILTER (WHERE nota_satisfacao IS NOT NULL) as media_satisfacao,
        MIN(data_agendada) FILTER (WHERE data_agendada > NOW() AND status IN ('agendado', 'confirmado')) as proximo_checkin
    FROM checkins
    WHERE created_by = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
