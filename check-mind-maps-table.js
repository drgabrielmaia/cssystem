// Script para verificar a tabela mind_maps no Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMindMapsTable() {
  try {
    console.log('🔍 Verificando tabela mind_maps...')

    // 1. Verificar se a tabela existe fazendo uma query simples
    console.log('\n1. Testando acesso à tabela mind_maps:')
    const { data: testData, error: testError } = await supabase
      .from('mind_maps')
      .select('*')
      .limit(1)

    if (testError) {
      console.error('❌ Erro ao acessar mind_maps:', testError.message)

      if (testError.message.includes('does not exist') || testError.message.includes('relation') || testError.code === '42P01') {
        console.log('\n🚨 A tabela mind_maps NÃO EXISTE!')
        console.log('💡 Precisa criar a tabela mind_maps no Supabase')

        console.log('\n📋 SQL para criar a tabela:')
        console.log(`
CREATE TABLE public.mind_maps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_mind_maps_mentorado_id ON public.mind_maps(mentorado_id);

-- RLS (Row Level Security)
ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;

-- Política de acesso (permitir tudo por enquanto - ajustar depois)
CREATE POLICY "Allow all operations on mind_maps" ON public.mind_maps FOR ALL USING (true);
        `)

        return
      }

      console.error('❌ Outro erro:', testError)
      return
    }

    console.log('✅ Tabela mind_maps existe e é acessível!')
    console.log(`📊 Registros encontrados: ${testData?.length || 0}`)

    if (testData && testData.length > 0) {
      console.log('\n📋 Primeiros registros:')
      testData.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.id}`)
        console.log(`      Mentorado: ${record.mentorado_id}`)
        console.log(`      Título: ${record.title}`)
        console.log(`      Nós: ${Array.isArray(record.nodes) ? record.nodes.length : 'N/A'}`)
        console.log(`      Conexões: ${Array.isArray(record.connections) ? record.connections.length : 'N/A'}`)
      })
    }

    // 2. Verificar se Ana Luísa tem mapa mental
    console.log('\n2. Verificando se Ana Luísa tem mapa mental:')
    const { data: anaMap, error: anaError } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('mentorado_id', '001a635f-e66e-4b4c-a1e5-9d21d2f5790e') // ID da Ana Luísa

    if (anaError) {
      console.error('❌ Erro ao buscar mapa da Ana Luísa:', anaError)
    } else {
      console.log(`📊 Mapas da Ana Luísa: ${anaMap?.length || 0}`)
      if (anaMap && anaMap.length > 0) {
        anaMap.forEach((map, index) => {
          console.log(`   ${index + 1}. Título: ${map.title}`)
          console.log(`      Nós: ${map.nodes?.length || 0}`)
          console.log(`      Última atualização: ${map.updated_at}`)
        })
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

checkMindMapsTable()