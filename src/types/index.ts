export interface Mentorado {
  id: string
  nome: string
  email: string
  telefone?: string
  turma: string
  estado_entrada: string
  estado_atual: string
  data_entrada: string
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