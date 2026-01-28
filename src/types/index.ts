export interface Mentorado {
  id: string
  nome: string
  nome_completo: string
  email: string
  telefone?: string
  // turma: string  // Campo não existe na tabela - precisa ser adicionado
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
  pontuacao_total?: number // Nova: pontuação total do mentorado
  genero?: string // Para ranking por gênero
  especialidade?: string
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
  turma: string  // Campo mantido para compatibilidade, mas não existe na tabela
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

// Interface para sistema de pontuação
export interface PontuacaoMentorado {
  id: string
  mentorado_id: string
  tipo_acao: 'indicacao' | 'aula_completa' | 'meta_atingida' | 'participacao_evento' | 'custom'
  pontos: number
  descricao: string
  data_acao: string
  criado_por?: string // ID do admin que adicionou
  meta_data?: Record<string, any> // Dados extras como ID da indicação, etc.
  mentorado?: { nome_completo: string } // Quando incluído via select
  created_at: string
}

// Interface para ranking atualizada
export interface RankingMentorado {
  mentorado_id: string
  nome_completo: string
  pontuacao_total: number
  total_indicacoes: number // Manter para compatibilidade
  genero: string
  especialidade?: string
  posicao?: number
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