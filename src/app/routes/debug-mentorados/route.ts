import { NextResponse } from 'next/server'

// Generate mock data function
function generateMockMentorados() {
  return Array.from({ length: 78 }, (_, i) => ({
    id: `mock-${i + 1}`,
    nome_completo: `Mentorado ${i + 1} - ${['Ana Silva', 'Bruno Santos', 'Carla Oliveira', 'Diego Lima', 'Eduarda Costa', 'Felipe Martins', 'Gabriela Rocha', 'Henrique Alves', 'Isabela Dias', 'João Victor'][i % 10]}`,
    email: `mentorado${i + 1}@email.com`,
    telefone: `(11) 9999-${String(i).padStart(4, '0')}`,
    turma: ['Turma A', 'Turma B', 'Turma C'][i % 3],
    estado_entrada: ['novo', 'interessado'][i % 2],
    estado_atual: ['ativo', 'engajado', 'pausado', 'inativo'][i % 4],
    data_entrada: new Date(2024, 7, (i % 30) + 1).toISOString().split('T')[0],
    created_at: new Date(2024, 7, (i % 30) + 1).toISOString(),
    data_inicio_mentoria: new Date(2024, 7, (i % 30) + 5).toISOString().split('T')[0],
    data_nascimento: new Date(1990 + (i % 30), (i % 12), (i % 28) + 1).toISOString().split('T')[0]
  }))
}

export async function GET() {
  console.log('🧪 API Debug: Gerando dados mockados...')
  
  // Test Supabase API first
  try {
    console.log('🔍 API Debug: Tentando buscar da API Supabase...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL ou chave não configuradas no ambiente')
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/mentorados?select=*&order=nome_completo.asc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      }
    )

    const supabaseData = await response.json()
    console.log('📡 API Debug: Resultado da API:', supabaseData?.length || 0, 'mentorados')
    
    const mockData = generateMockMentorados()
    console.log('📝 API Debug: Dados mockados gerados:', mockData.length, 'mentorados')
    
    return NextResponse.json({
      success: true,
      supabase: {
        status: response.status,
        count: supabaseData?.length || 0,
        data: supabaseData
      },
      mock: {
        count: mockData.length,
        sample: mockData.slice(0, 3) // First 3 for debugging
      },
      message: supabaseData?.length > 0 
        ? `API retornou ${supabaseData.length} registros` 
        : `API retornou vazio, usando ${mockData.length} registros mockados`
    })
    
  } catch (error) {
    console.error('💥 API Debug: Erro na API:', error)
    const mockData = generateMockMentorados()
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      mock: {
        count: mockData.length,
        sample: mockData.slice(0, 3)
      },
      message: `Erro na API, usando ${mockData.length} registros mockados`
    })
  }
}