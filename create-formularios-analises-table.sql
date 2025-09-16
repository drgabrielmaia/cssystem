-- Tabela para armazenar análises de formulários do Gemma3:1b
CREATE TABLE IF NOT EXISTS public.formularios_analises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resposta_id UUID NOT NULL REFERENCES public.formularios_respostas(id) ON DELETE CASCADE,
    analise_json JSONB NOT NULL,
    data_analise TIMESTAMPTZ DEFAULT NOW(),
    modelo_ia VARCHAR(50) DEFAULT 'gemma3:1b',
    tempo_resposta INTEGER, -- em millisegundos
    versao_analise INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_formularios_analises_resposta_id ON public.formularios_analises(resposta_id);
CREATE INDEX IF NOT EXISTS idx_formularios_analises_data ON public.formularios_analises(data_analise);
CREATE INDEX IF NOT EXISTS idx_formularios_analises_modelo ON public.formularios_analises(modelo_ia);

-- Índice GIN para buscar dentro do JSON
CREATE INDEX IF NOT EXISTS idx_formularios_analises_json ON public.formularios_analises USING GIN (analise_json);

-- RLS (Row Level Security) 
ALTER TABLE public.formularios_analises ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura e escrita (ajustar conforme necessário)
CREATE POLICY "Permitir todas operações nas análises" ON public.formularios_analises
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_formularios_analises_updated_at
    BEFORE UPDATE ON public.formularios_analises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.formularios_analises IS 'Análises de formulários geradas pelo Gemma3:1b';
COMMENT ON COLUMN public.formularios_analises.analise_json IS 'Resultado completo da análise em JSON';
COMMENT ON COLUMN public.formularios_analises.tempo_resposta IS 'Tempo de resposta da IA em millisegundos';
COMMENT ON COLUMN public.formularios_analises.versao_analise IS 'Versão do modelo de análise utilizado';