import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // Temporarily disable auth persistence to test
  }
})

// Server-side client
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

// Types
export interface Mentorado {
  id: string
  nome_completo: string
  data_nascimento?: string
  telefone?: string
  email: string
  cpf?: string
  rg?: string
  endereco?: string
  crm?: string
  origem_conhecimento?: string
  data_inicio_mentoria?: string
  turma: string
  estado_entrada: string
  estado_atual: string
  data_entrada: string
  porcentagem_comissao?: number
  created_at: string
}

export interface FormularioResposta {
  id: string
  mentorado_id: string
  formulario: string
  resposta_json: any
  data_envio: string
}

export interface DespesaMensal {
  id: string
  nome: string
  agosto: number
  setembro: number
  outubro: number
  novembro: number
  dezembro: number
  janeiro: number
  fevereiro: number
  marco: number
  abril: number
  maio: number
  junho: number
  julho: number
  ano: number
  created_at: string
  updated_at: string
}

export interface CheckIn {
  id: string
  mentorado_id: string
  titulo: string
  descricao?: string
  data_agendada: string
  duracao_minutos?: number
  status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'reagendado'
  tipo: 'checkin' | 'mentoria' | 'follow-up' | 'avaliacao'
  link_reuniao?: string
  notas_pre_reuniao?: string
  notas_pos_reuniao?: string
  objetivos?: string[]
  resultados_alcancados?: string[]
  proximos_passos?: string[]
  nota_satisfacao?: number
  created_at: string
  updated_at: string
  created_by?: string
  cancelado_por?: string
  motivo_cancelamento?: string
  data_cancelamento?: string
}