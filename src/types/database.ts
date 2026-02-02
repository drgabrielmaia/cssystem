// Tipos do banco de dados para resolver problemas de importação
export interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  organization_id: string
  estado_atual?: string
  estado_entrada?: string
  porcentagem_comissao?: number
  data_nascimento?: string
  endereco_completo?: string
  endereco?: string
  profissao?: string
  formacao_academica?: string
  renda_mensal?: number
  objetivo_principal?: string
  tempo_atuacao?: string
  experiencia_vendas?: string
  canais_venda?: string
  publico_alvo?: string
  ticket_medio?: number
  faturamento_mensal?: number
  principais_desafios?: string
  created_at?: string
  updated_at?: string
  [key: string]: any // Allow additional properties
}

export interface FormularioResposta {
  id: string
  mentorado_id: string
  formulario_id: string
  formulario?: string
  resposta: string
  resposta_json?: any
  created_at: string
  updated_at: string
  [key: string]: any // Allow additional properties
}

export interface DespesaMensal {
  id: string
  mes: string
  ano: number
  nome?: string
  salarios_funcionarios: number
  marketing_trafego_pago: number
  ferramentas_tecnologia: number
  consultores_terceirizados: number
  outras_despesas: number
  total_despesas: number
  created_at: string
  updated_at: string
}