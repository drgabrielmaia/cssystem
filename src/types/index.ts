export interface Mentorado {
  id: string
  nome: string
  nome_completo: string
  email: string
  telefone?: string
  turma: string
  estado_entrada: string
  estado_atual: string
  data_entrada: string
  data_nascimento?: string
  endereco?: string
  crm?: string
  cpf?: string
  rg?: string
  origem_conhecimento?: string
  data_inicio_mentoria?: string
  created_at: string
}

export interface FormularioResposta {
  id: string
  mentorado_id: string
  formulario: string
  resposta_json: Record<string, any>
  data_envio: string
}

export interface KPI {
  label: string
  value: number | string
  change?: number
  changeType?: 'increase' | 'decrease'
}

export interface TurmaStats {
  turma: string
  total_mentorados: number
  ativos: number
  inativos: number
  ultima_atividade: string
}

export type FormularioTipo =
  | 'avaliacao-inicial'
  | 'progresso-mensal'
  | 'feedback-sessao'
  | 'avaliacao-final'
  | 'observacoes-gerais'

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