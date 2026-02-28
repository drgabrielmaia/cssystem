// ======================================================
// TIPOS E INTERFACES DO SISTEMA DE COMISSÕES
// ======================================================

// Status types
export type ReferralStatus = 
  | 'pending'      // Aguardando primeiro contato
  | 'contacted'    // Lead contactado
  | 'qualified'    // Lead qualificado
  | 'negotiating'  // Em negociação
  | 'converted'    // Convertido em cliente
  | 'lost'         // Perdido
  | 'cancelled';   // Cancelado

export type PaymentStatus = 
  | 'pending'      // Aguardando confirmação
  | 'confirmed'    // Pagamento confirmado
  | 'processing'   // Processando
  | 'failed'       // Falhou
  | 'refunded'     // Reembolsado
  | 'cancelled';   // Cancelado

export type CommissionStatus = 
  | 'pending'      // Aguardando pagamento do cliente
  | 'eligible'     // Elegível para saque
  | 'requested'    // Saque solicitado
  | 'approved'     // Aprovado para pagamento
  | 'processing'   // Processando pagamento
  | 'paid'         // Pago
  | 'cancelled'    // Cancelado
  | 'on_hold';     // Em espera

export type CommissionMilestone = 
  | 'first_50_percent'   // Primeiro pagamento de 50%
  | 'second_50_percent'  // Segundo pagamento de 50%
  | 'full_payment'       // Pagamento integral
  | 'monthly_recurring'  // Recorrente mensal
  | 'custom';            // Personalizado

export type WithdrawalStatus = 
  | 'pending'      // Aguardando revisão
  | 'approved'     // Aprovado
  | 'processing'   // Processando pagamento
  | 'completed'    // Concluído
  | 'rejected'     // Rejeitado
  | 'cancelled';   // Cancelado

// Main interfaces
export interface Referral {
  id: string;
  mentorado_id: string;
  lead_id: string;
  organization_id: string;
  referral_code?: string;
  referral_date: string;
  referral_source?: string;
  referral_notes?: string;
  status: ReferralStatus;
  contract_value?: number;
  payment_plan?: string;
  conversion_date?: string;
  first_payment_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Relations (when joined)
  mentorado?: {
    id: string;
    nome_completo: string;
    email: string;
  };
  lead?: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
  };
}

export interface ReferralPayment {
  id: string;
  referral_id: string;
  organization_id: string;
  payment_amount: number;
  payment_percentage?: number;
  payment_date: string;
  payment_method?: string;
  payment_reference?: string;
  status: PaymentStatus;
  confirmed_at?: string;
  confirmed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  referral?: Referral;
}

export interface Commission {
  id: string;
  mentorado_id: string;
  referral_id: string;
  payment_id?: string;
  organization_id: string;
  base_amount: number;
  commission_percentage: number;
  commission_amount: number;
  commission_type: 'referral' | 'bonus' | 'adjustment' | 'recurring';
  milestone?: CommissionMilestone;
  status: CommissionStatus;
  eligible_date?: string;
  requested_date?: string;
  approved_date?: string;
  paid_date?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_receipt_url?: string;
  approved_by?: string;
  paid_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  mentorado?: {
    id: string;
    nome_completo: string;
    email: string;
  };
  referral?: Referral;
  payment?: ReferralPayment;
}

export interface CommissionHistory {
  id: string;
  commission_id: string;
  action: string;
  old_status?: string;
  new_status?: string;
  old_amount?: number;
  new_amount?: number;
  performed_by: string;
  performed_at: string;
  details?: Record<string, any>;
  notes?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface CommissionSettings {
  id: string;
  organization_id: string;
  default_commission_percentage: number;
  first_milestone_percentage: number;
  second_milestone_percentage: number;
  minimum_payment_percentage: number;
  auto_approve_threshold?: number;
  payment_day_of_month?: number;
  minimum_withdrawal_amount: number;
  notify_on_eligible: boolean;
  notify_on_payment: boolean;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  mentorado_id: string;
  organization_id: string;
  commission_ids: string[];
  total_amount: number;
  fee_amount?: number;
  net_amount: number;
  payment_data?: Record<string, any>;
  status: WithdrawalStatus;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  completed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  payment_proof_url?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  mentorado?: {
    id: string;
    nome_completo: string;
    email: string;
  };
  commissions?: Commission[];
}

// View interfaces
export interface CommissionSummary {
  mentorado_id: string;
  nome_completo: string;
  email: string;
  organization_id: string;
  total_referrals: number;
  converted_referrals: number;
  pending_amount: number;
  eligible_amount: number;
  approved_amount: number;
  paid_amount: number;
  total_commission_amount: number;
}

export interface ReferralDetails {
  referral_id: string;
  mentorado_id: string;
  mentorado_nome: string;
  lead_id: string;
  lead_nome: string;
  lead_email?: string;
  lead_telefone?: string;
  referral_date: string;
  referral_status: ReferralStatus;
  contract_value?: number;
  conversion_date?: string;
  total_paid: number;
  payment_percentage: number;
  payment_count: number;
  organization_id: string;
}

export interface PendingCommission {
  commission_id: string;
  mentorado_id: string;
  mentorado_nome: string;
  mentorado_email: string;
  commission_amount: number;
  milestone?: CommissionMilestone;
  status: CommissionStatus;
  eligible_date?: string;
  lead_id: string;
  lead_nome: string;
  organization_id: string;
}

// Dashboard statistics
export interface CommissionStats {
  totalReferrals: number;
  activeReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
  totalEarned: number;
  pendingAmount: number;
  availableForWithdrawal: number;
  paidAmount: number;
  averageCommission: number;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
}

// Filter and search options
export interface CommissionFilters {
  status?: CommissionStatus[];
  milestone?: CommissionMilestone[];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  mentoradoId?: string;
  referralId?: string;
  searchTerm?: string;
}

export interface ReferralFilters {
  status?: ReferralStatus[];
  source?: string[];
  dateFrom?: string;
  dateTo?: string;
  mentoradoId?: string;
  leadName?: string;
  searchTerm?: string;
}

// Form data for creating/updating
export interface CreateReferralData {
  mentorado_id: string;
  lead_id: string;
  referral_source?: string;
  referral_notes?: string;
}

export interface UpdateReferralData {
  status?: ReferralStatus;
  contract_value?: number;
  payment_plan?: string;
  referral_notes?: string;
}

export interface CreatePaymentData {
  referral_id: string;
  payment_amount: number;
  payment_percentage?: number;
  payment_date: string;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
}

export interface CreateWithdrawalData {
  commission_ids?: string[];
  payment_data?: {
    pix_key?: string;
    bank_account?: {
      bank_code: string;
      agency: string;
      account: string;
      account_type: 'checking' | 'savings';
    };
  };
}

// Admin actions
export interface ApproveWithdrawalData {
  withdrawal_id: string;
  admin_notes?: string;
}

export interface RejectWithdrawalData {
  withdrawal_id: string;
  rejection_reason: string;
  admin_notes?: string;
}

export interface ProcessPaymentData {
  withdrawal_id: string;
  payment_method: string;
  payment_reference: string;
  payment_proof_url?: string;
  admin_notes?: string;
}

// Notification types
export interface CommissionNotification {
  id: string;
  type: 'new_referral' | 'payment_confirmed' | 'commission_eligible' | 'withdrawal_approved' | 'payment_completed';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

// Lead Qualification Types
export type LeadTemperature = 'quente' | 'morno' | 'frio';
export type PaymentIntent = 'a_vista' | 'parcelado' | 'vai_conseguir' | 'nao_tem';
export type UrgencyLevel = 'imediato' | 'ate_30_dias' | 'ate_3_meses' | 'pesquisando';
export type BusinessSituation = 'tem_negocio_escalando' | 'quer_comecar_com_experiencia' | 'iniciante_total';

export interface LeadQualification {
  id: string;
  nome_completo: string;
  email: string;
  whatsapp: string;
  origem_conhecimento: string;
  tempo_seguindo?: string;
  nome_indicacao?: string;
  situacao_negocio: BusinessSituation;
  faturamento_atual?: number;
  objetivo_faturamento?: number;
  forma_pagamento: PaymentIntent;
  urgencia: UrgencyLevel;
  motivacao_principal?: string;
  investiu_mentoria_antes: boolean;
  maior_desafio?: string;
  score_total: number;
  temperatura: LeadTemperature;
  score_breakdown: Record<string, any>;
  psychological_profile?: Record<string, any>;
  engagement_signals?: Record<string, any>;
  form_version: string;
  completion_time?: number;
  abandonment_points?: string[];
  device_info?: Record<string, any>;
  ip_address?: string;
  status: string;
  assigned_to?: string;
  follow_up_date?: string;
  notes?: string;
  crm_id?: string;
  email_sent: boolean;
  whatsapp_sent: boolean;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadScoringRule {
  id: string;
  rule_name: string;
  rule_category: string;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  points: number;
  weight_percentage: number;
  is_active: boolean;
  description?: string;
  instant_hot_qualifier: boolean;
  created_at: string;
  updated_at: string;
}

// Form data for lead qualification
export interface LeadQualificationFormData {
  nome_completo: string;
  email: string;
  whatsapp: string;
  origem_conhecimento: string;
  tempo_seguindo?: string;
  nome_indicacao?: string;
  situacao_negocio: BusinessSituation;
  faturamento_atual?: number;
  objetivo_faturamento?: number;
  forma_pagamento: PaymentIntent;
  urgencia: UrgencyLevel;
  motivacao_principal?: string;
  investiu_mentoria_antes: boolean;
  maior_desafio?: string;
}

// Mentorado strategic info
export interface MentoradoInfo {
  id: string;
  mentorado_id: string;
  tempo_mentoria: 'este_mes' | 'ultimos_3_meses' | 'ultimos_6_meses' | 'ultimos_12_meses' | 'mais_de_1_ano';
  faturamento_antes: number;
  faturamento_atual: number;
  maior_conquista?: string;
  principal_dificuldade?: string;
  expectativas_futuras?: string;
  recomendaria_mentoria: boolean;
  nota_satisfacao: number;
  sugestoes_melhoria?: string;
  objetivos_proximos_meses?: string;
  created_at: string;
  updated_at: string;
}

export interface MentoradoInfoFormData {
  tempo_mentoria: 'este_mes' | 'ultimos_3_meses' | 'ultimos_6_meses' | 'ultimos_12_meses' | 'mais_de_1_ano';
  faturamento_antes: number;
  faturamento_atual: number;
  maior_conquista?: string;
  principal_dificuldade?: string;
  expectativas_futuras?: string;
  recomendaria_mentoria: boolean;
  nota_satisfacao: number;
  sugestoes_melhoria?: string;
  objetivos_proximos_meses?: string;
}

// ======================================================
// ADVANCED LEADS TRACKING SYSTEM TYPES
// ======================================================

export type TipoInteracao = 
  | 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'demo' | 'follow_up' 
  | 'proposta' | 'negociacao' | 'objecao' | 'fechamento' | 'outro';

export type ResultadoInteracao = 
  | 'contato_realizado' | 'sem_resposta' | 'agendamento_feito' | 'proposta_enviada'
  | 'negociacao_iniciada' | 'fechamento_positivo' | 'fechamento_negativo'
  | 'follow_up_agendado' | 'lead_desqualificado' | 'aguardando_retorno';

export type SentimentoLead = 'muito_positivo' | 'positivo' | 'neutro' | 'negativo' | 'muito_negativo';

export type QualificacaoBudget = 'tem_budget' | 'precisa_aprovar' | 'sem_budget';
export type QualificacaoAutoridade = 'decisor' | 'influenciador' | 'sem_autoridade';
export type QualificacaoNecessidade = 'urgente' | 'importante' | 'nice_to_have';
export type QualificacaoTimeline = 'imediato' | '30_dias' | '3_meses' | 'mais_3_meses';

export type EstiloComunicacao = 'analitico' | 'expressivo' | 'amigavel' | 'diretor';
export type AuthorityNivel = 'decisor_final' | 'influenciador_forte' | 'influenciador_fraco' | 'sem_influencia';

export interface LeadExtendido {
  id: string;
  nome_completo: string;
  email?: string;
  telefone?: string;
  empresa?: string;
  cargo?: string;
  status: string;
  temperatura?: LeadTemperature;
  prioridade?: string;
  lead_score?: number;
  origem?: string;
  fonte_detalhada?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  valor_potencial?: number;
  probabilidade_fechamento?: number;
  data_primeiro_contato?: string;
  data_ultima_interacao?: string;
  next_followup_date?: string;
  motivo_perda?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  closer_id?: string;
  sdr_id?: string;
  organization_id: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  closer?: {
    id: string;
    nome_completo: string;
    tipo_closer: string;
  };
  sdr?: {
    id: string;
    nome_completo: string;
    tipo_closer: string;
  };
  interactions?: LeadInteraction[];
  qualification?: LeadQualificationDetails;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  closer_id?: string;
  organization_id?: string;
  tipo_interacao: TipoInteracao;
  data_interacao: string;
  duracao_minutos?: number;
  canal?: string;
  resumo: string;
  detalhes_completos?: string;
  objecoes_encontradas?: string[];
  pontos_dor_identificados?: string[];
  interesse_manifestado?: number;
  resultado: ResultadoInteracao;
  proxima_acao?: string;
  data_proxima_acao?: string;
  responsavel_proxima_acao?: string;
  valor_proposta?: number;
  desconto_oferecido?: number;
  condicoes_pagamento?: string;
  qualificacao_budget?: QualificacaoBudget;
  qualificacao_autoridade?: QualificacaoAutoridade;
  qualificacao_necessidade?: QualificacaoNecessidade;
  qualificacao_timeline?: QualificacaoTimeline;
  sentimento_lead?: SentimentoLead;
  nivel_interesse?: number;
  probabilidade_fechamento_percebida?: number;
  gravacao_url?: string;
  anexos_urls?: string[];
  created_at: string;
  updated_at: string;
  
  // Relations
  closer?: {
    id: string;
    nome_completo: string;
  };
}

export interface LeadQualificationDetails {
  id: string;
  lead_id: string;
  closer_id: string;
  organization_id?: string;
  
  // BANT Qualification
  budget_confirmado: boolean;
  budget_valor_disponivel?: number;
  budget_fonte?: string;
  
  authority_nivel?: AuthorityNivel;
  authority_pessoas_envolvidas?: any[];
  authority_processo_aprovacao?: string;
  
  need_dor_principal?: string;
  need_consequencias_nao_resolver?: string;
  need_tentativas_anteriores?: string;
  need_urgencia_score?: number;
  
  timeline_meta_implementacao?: string;
  timeline_fatores_urgencia?: string[];
  timeline_restricoes?: string[];
  
  // Situação atual
  situacao_atual?: string;
  solucao_atual?: string;
  satisfacao_solucao_atual?: number;
  
  // Concorrência
  concorrentes_considerados?: string[];
  nossa_vantagem_percebida?: string;
  principais_objecoes?: string[];
  
  // Perfil comportamental
  estilo_comunicacao?: EstiloComunicacao;
  gatilhos_motivacionais?: string[];
  medos_preocupacoes?: string[];
  
  // Informações da empresa
  empresa_nome?: string;
  empresa_tamanho?: string;
  empresa_setor?: string;
  empresa_faturamento?: number;
  empresa_num_funcionarios?: number;
  cargo_lead?: string;
  nivel_hierarquico?: string;
  
  // Scores
  qualification_score: number;
  qualification_details: Record<string, any>;
  
  data_qualificacao: string;
  created_at: string;
  updated_at: string;
}

export interface LeadFollowupSequence {
  id: string;
  organization_id?: string;
  nome_sequencia: string;
  descricao?: string;
  ativo: boolean;
  criterios_ativacao: Record<string, any>;
  steps: FollowupStep[];
  pausar_fim_semana: boolean;
  pausar_feriados: boolean;
  timezone: string;
  horario_envio_inicio: string;
  horario_envio_fim: string;
  leads_atingidos: number;
  taxa_resposta: number;
  taxa_conversao: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface FollowupStep {
  step_numero: number;
  delay_days: number;
  delay_hours?: number;
  tipo_acao: 'email' | 'whatsapp' | 'ligacao' | 'tarefa';
  titulo: string;
  conteudo: string;
  template_vars?: string[];
  condicoes_execucao?: Record<string, any>;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document';
  media_filename?: string;
  media_mimetype?: string;
}

export interface LeadFollowupExecution {
  id: string;
  lead_id: string;
  sequence_id: string;
  organization_id?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'responded';
  step_atual: number;
  proxima_execucao?: string;
  pausado_ate?: string;
  steps_executados: any[];
  respostas_recebidas: any[];
  total_touchpoints: number;
  data_resposta?: string;
  converteu: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  closer_id: string;
  organization_id?: string;
  tipo_nota: 'geral' | 'reuniao' | 'ligacao' | 'email' | 'proposta' | 'objecao' | 'follow_up' | 'interno';
  titulo?: string;
  conteudo: string;
  visibilidade: 'private' | 'team' | 'organization';
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  lembrete_data?: string;
  lembrete_enviado: boolean;
  anexos?: string[];
  created_at: string;
  updated_at: string;
  
  // Relations
  closer?: {
    id: string;
    nome_completo: string;
  };
}

// Advanced Performance Dashboard Types
export interface PerformanceMetrics {
  leads_total: number;
  leads_qualificados: number;
  leads_convertidos: number;
  taxa_qualificacao: number;
  taxa_conversao: number;
  valor_pipeline: number;
  valor_fechado: number;
  ticket_medio: number;
  ciclo_vendas_medio: number;
  atividade_diaria_media: number;
}

export interface CloserPerformance {
  closer_id: string;
  nome_completo: string;
  tipo_closer: string;
  periodo: {
    inicio: string;
    fim: string;
  };
  metricas: PerformanceMetrics;
  distribuicao_atividades: {
    ligacoes: number;
    emails: number;
    reunioes: number;
    whatsapp: number;
    outros: number;
  };
  qualidade_leads: {
    score_medio: number;
    temperatura_distribuicao: {
      quente: number;
      morno: number;
      frio: number;
    };
  };
  tendencias: {
    leads_mes_atual: number;
    leads_mes_anterior: number;
    conversoes_mes_atual: number;
    conversoes_mes_anterior: number;
  };
}

export interface OrganizationLeadsOverview {
  total_leads: number;
  leads_qualificados: number;
  leads_em_follow_up: number;
  conversoes_mes: number;
  receita_prevista: number;
  receita_confirmada: number;
  performance_closers: CloserPerformance[];
  leads_por_fonte: {
    fonte: string;
    quantidade: number;
    taxa_conversao: number;
  }[];
  funil_conversao: {
    stage: string;
    quantidade: number;
    taxa_conversao: number;
  }[];
}

// Form data types for creating/updating
export interface CreateLeadInteractionData {
  lead_id: string;
  tipo_interacao: TipoInteracao;
  duracao_minutos?: number;
  canal?: string;
  resumo: string;
  detalhes_completos?: string;
  objecoes_encontradas?: string[];
  pontos_dor_identificados?: string[];
  interesse_manifestado?: number;
  resultado: ResultadoInteracao;
  proxima_acao?: string;
  data_proxima_acao?: string;
  responsavel_proxima_acao?: string;
  valor_proposta?: number;
  desconto_oferecido?: number;
  condicoes_pagamento?: string;
  qualificacao_budget?: QualificacaoBudget;
  qualificacao_autoridade?: QualificacaoAutoridade;
  qualificacao_necessidade?: QualificacaoNecessidade;
  qualificacao_timeline?: QualificacaoTimeline;
  sentimento_lead?: SentimentoLead;
  nivel_interesse?: number;
  probabilidade_fechamento_percebida?: number;
  gravacao_url?: string;
  anexos_urls?: string[];
}

export interface UpdateLeadQualificationData {
  budget_confirmado?: boolean;
  budget_valor_disponivel?: number;
  budget_fonte?: string;
  authority_nivel?: AuthorityNivel;
  authority_pessoas_envolvidas?: any[];
  authority_processo_aprovacao?: string;
  need_dor_principal?: string;
  need_consequencias_nao_resolver?: string;
  need_tentativas_anteriores?: string;
  need_urgencia_score?: number;
  timeline_meta_implementacao?: string;
  timeline_fatores_urgencia?: string[];
  timeline_restricoes?: string[];
  situacao_atual?: string;
  solucao_atual?: string;
  satisfacao_solucao_atual?: number;
  concorrentes_considerados?: string[];
  nossa_vantagem_percebida?: string;
  principais_objecoes?: string[];
  estilo_comunicacao?: EstiloComunicacao;
  gatilhos_motivacionais?: string[];
  medos_preocupacoes?: string[];
  empresa_nome?: string;
  empresa_tamanho?: string;
  empresa_setor?: string;
  empresa_faturamento?: number;
  empresa_num_funcionarios?: number;
  cargo_lead?: string;
  nivel_hierarquico?: string;
}

export interface CreateLeadNoteData {
  lead_id: string;
  tipo_nota: 'geral' | 'reuniao' | 'ligacao' | 'email' | 'proposta' | 'objecao' | 'follow_up' | 'interno';
  titulo?: string;
  conteudo: string;
  visibilidade?: 'private' | 'team' | 'organization';
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
  lembrete_data?: string;
  anexos?: string[];
}

// ======================================================
// ENHANCED MENTORADOS TRACKING SYSTEM TYPES
// ======================================================

export type StatusMentoria = 'ativo' | 'pausado' | 'concluido' | 'cancelado';
export type NivelExperiencia = 'iniciante' | 'intermediario' | 'avancado';
export type TipoFeedback = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'espontaneo' | 'saida';
export type TipoAtividadeMentorado = 
  | 'login_plataforma' | 'aula_assistida' | 'material_baixado' | 'exercicio_completado'
  | 'participacao_comunidade' | 'mentoria_individual' | 'grupo_mentoria' | 'evento_participacao'
  | 'duvida_enviada' | 'feedback_dado' | 'meta_definida' | 'meta_alcancada';

export type StatusMeta = 'planejada' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada' | 'nao_alcancada';
export type CategoriaMeta = 'financeira' | 'pessoal' | 'profissional' | 'negocio';

export type TipoInteracaoMentor = 
  | 'mentoria_individual' | 'grupo_mentoria' | 'duvida_chat' | 'call_emergencia'
  | 'revisao_progresso' | 'definicao_metas' | 'feedback_performance' | 'orientacao_estrategica';

export interface MentoradoExtendido {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  cpf?: string;
  data_nascimento?: string;
  endereco?: string;
  organization_id: string;
  
  // Campos estendidos
  data_inicio_mentoria?: string;
  nivel_experiencia: NivelExperiencia;
  area_atuacao?: string;
  faturamento_inicial: number;
  faturamento_meta?: number;
  status_mentoria: StatusMentoria;
  score_engajamento: number;
  ultima_atividade?: string;
  tags?: string[];
  dados_pessoais?: Record<string, any>;
  
  created_at: string;
  updated_at: string;
  
  // Relations when joined
  evolucao_financeira?: MentoradoEvolucaoFinanceira[];
  feedbacks?: MentoradoFeedback[];
  atividades?: MentoradoAtividade[];
  metas?: MentoradoMeta[];
  interacoes_mentor?: MentoradoInteracaoMentor[];
  conquistas?: MentoradoConquista[];
}

export interface MentoradoEvolucaoFinanceira {
  id: string;
  mentorado_id: string;
  organization_id?: string;
  ano: number;
  mes: number;
  
  // Métricas financeiras
  faturamento_bruto: number;
  faturamento_liquido: number;
  despesas_totais: number;
  lucro_liquido: number;
  margem_lucro: number;
  
  // Métricas de negócio
  num_clientes: number;
  ticket_medio: number;
  novos_clientes: number;
  clientes_perdidos: number;
  
  // Produtos/serviços
  principais_produtos?: any[];
  canais_venda?: any[];
  
  // Comparação com período anterior
  crescimento_faturamento: number;
  crescimento_clientes: number;
  
  // Observações
  principais_conquistas?: string;
  maiores_desafios?: string;
  acoes_implementadas?: string;
  resultados_acoes?: string;
  
  // Status
  dados_verificados: boolean;
  verificado_por?: string;
  data_verificacao?: string;
  
  created_at: string;
  updated_at: string;
}

export interface MentoradoFeedback {
  id: string;
  mentorado_id: string;
  organization_id?: string;
  tipo_feedback: TipoFeedback;
  data_feedback: string;
  periodo_referencia_inicio?: string;
  periodo_referencia_fim?: string;
  
  // Avaliação da Mentoria
  nota_geral?: number;
  nota_conteudo?: number;
  nota_suporte?: number;
  nota_comunidade?: number;
  
  // Progresso e Resultados
  tempo_mentoria?: string;
  maior_conquista?: string;
  principal_dificuldade?: string;
  expectativas_futuras?: string;
  objetivos_proximos_meses?: string;
  
  // Evolução Pessoal
  nivel_confianca_antes?: number;
  nivel_confianca_atual?: number;
  principais_aprendizados?: string;
  habilidades_desenvolvidas?: string[];
  
  // Recomendação
  recomendaria_mentoria?: boolean;
  motivo_recomendacao?: string;
  nota_nps?: number;
  
  // Feedback sobre o Mentor
  qualidade_mentoria?: number;
  disponibilidade_mentor?: number;
  clareza_orientacoes?: number;
  
  // Sugestões
  sugestoes_melhoria?: string;
  recursos_adicionais_desejados?: string;
  areas_maior_dificuldade?: string[];
  
  // Planos Futuros
  pretende_continuar?: boolean;
  interesse_novos_programas?: boolean;
  areas_interesse_futuro?: string[];
  
  // Metadados
  respondido_anonimamente: boolean;
  tempo_resposta_minutos?: number;
  dispositivo_resposta?: string;
  
  created_at: string;
  updated_at: string;
}

export interface MentoradoAtividade {
  id: string;
  mentorado_id: string;
  organization_id?: string;
  tipo_atividade: TipoAtividadeMentorado;
  data_atividade: string;
  duracao_minutos?: number;
  
  // Detalhes específicos
  modulo_curso?: string;
  aula_titulo?: string;
  progresso_percentual?: number;
  
  // Engajamento
  nivel_engajamento?: number;
  qualidade_participacao?: string;
  
  // Resultados/Feedback
  nota_atividade?: number;
  comentario_atividade?: string;
  dificuldades_encontradas?: string;
  
  // Metadados
  dispositivo_utilizado?: string;
  tempo_sessao_minutos?: number;
  ip_address?: string;
  
  created_at: string;
}

export interface MentoradoMeta {
  id: string;
  mentorado_id: string;
  organization_id?: string;
  titulo_meta: string;
  descricao_meta?: string;
  categoria_meta?: CategoriaMeta;
  
  // Cronograma
  data_criacao: string;
  data_inicio?: string;
  data_fim_planejada?: string;
  data_fim_real?: string;
  
  // Valores/Métricas
  valor_inicial?: number;
  valor_meta?: number;
  valor_atual?: number;
  unidade_medida?: string;
  
  // Status
  status: StatusMeta;
  percentual_conclusao: number;
  
  // Acompanhamento
  marcos_intermediarios?: any[];
  acoes_necessarias?: string;
  obstaculos_identificados?: string;
  recursos_necessarios?: string;
  
  // Resultados
  resultado_alcancado?: string;
  licoes_aprendidas?: string;
  
  // Apoio da mentoria
  suporte_recebido?: string;
  mentor_responsavel?: string;
  
  created_at: string;
  updated_at: string;
}

export interface MentoradoInteracaoMentor {
  id: string;
  mentorado_id: string;
  mentor_id?: string;
  organization_id?: string;
  tipo_interacao: TipoInteracaoMentor;
  data_interacao: string;
  duracao_minutos?: number;
  canal?: string;
  
  // Conteúdo
  topicos_abordados?: string[];
  resumo_interacao: string;
  duvidas_esclarecidas?: string;
  orientacoes_dadas?: string;
  
  // Próximos passos
  proximos_passos?: string;
  data_proximo_followup?: string;
  
  // Avaliação
  avaliacao_mentorado?: number;
  avaliacao_mentor?: number;
  comentario_mentorado?: string;
  comentario_mentor?: string;
  
  // Anexos e materiais
  materiais_compartilhados?: string[];
  gravacao_disponivel: boolean;
  gravacao_url?: string;
  
  created_at: string;
  
  // Relations
  mentor?: {
    id: string;
    nome_completo: string;
  };
}

export interface MentoradoConquista {
  id: string;
  mentorado_id: string;
  organization_id?: string;
  titulo_conquista: string;
  descricao?: string;
  categoria?: string;
  data_conquista: string;
  contexto_conquista?: string;
  desafios_superados?: string;
  
  // Valor/Impacto
  valor_numerico?: number;
  unidade_medida?: string;
  impacto_negocio?: string;
  impacto_pessoal?: string;
  
  // Reconhecimento
  publicamente_reconhecida: boolean;
  compartilhada_comunidade: boolean;
  certificacao_relacionada?: string;
  
  // Mentoria
  contribuicao_mentoria?: string;
  mentor_envolvido?: string;
  
  // Comprovação
  evidencias_urls?: string[];
  testemunhos?: any[];
  
  created_at: string;
}

export interface MentoradoGrowthMetrics {
  mentorado_id: string;
  periodo: {
    inicio: string;
    fim: string;
  };
  crescimento_faturamento: number;
  crescimento_clientes: number;
  evolucao_ticket_medio: number;
  score_engajamento: number;
  atividades_mes: number;
  metas_ativas: number;
  metas_concluidas: number;
  ultima_atividade: string;
  feedbacks_periodo: number;
  nota_nps_media: number;
  satisfacao_geral: number;
}

export interface OrganizationMentoradosOverview {
  total_mentorados: number;
  mentorados_ativos: number;
  mentorados_engajados: number; // score > 70
  crescimento_medio_faturamento: number;
  crescimento_medio_clientes: number;
  nps_medio: number;
  satisfacao_media: number;
  retencao_rate: number;
  distribuicao_por_nivel: {
    nivel: NivelExperiencia;
    quantidade: number;
  }[];
  top_performers: {
    mentorado_id: string;
    nome_completo: string;
    crescimento_faturamento: number;
    score_engajamento: number;
  }[];
  areas_maior_dificuldade: {
    area: string;
    mencoes: number;
  }[];
}

// Form data types for creating/updating
export interface CreateMentoradoEvolucaoData {
  ano: number;
  mes: number;
  faturamento_bruto: number;
  faturamento_liquido?: number;
  despesas_totais?: number;
  num_clientes?: number;
  ticket_medio?: number;
  novos_clientes?: number;
  clientes_perdidos?: number;
  principais_produtos?: any[];
  canais_venda?: any[];
  principais_conquistas?: string;
  maiores_desafios?: string;
  acoes_implementadas?: string;
  resultados_acoes?: string;
}

export interface CreateMentoradoFeedbackData {
  tipo_feedback: TipoFeedback;
  data_feedback: string;
  nota_geral?: number;
  nota_conteudo?: number;
  nota_suporte?: number;
  nota_comunidade?: number;
  tempo_mentoria?: string;
  maior_conquista?: string;
  principal_dificuldade?: string;
  expectativas_futuras?: string;
  objetivos_proximos_meses?: string;
  nivel_confianca_antes?: number;
  nivel_confianca_atual?: number;
  principais_aprendizados?: string;
  habilidades_desenvolvidas?: string[];
  recomendaria_mentoria?: boolean;
  motivo_recomendacao?: string;
  nota_nps?: number;
  qualidade_mentoria?: number;
  disponibilidade_mentor?: number;
  clareza_orientacoes?: number;
  sugestoes_melhoria?: string;
  recursos_adicionais_desejados?: string;
  areas_maior_dificuldade?: string[];
  pretende_continuar?: boolean;
  interesse_novos_programas?: boolean;
  areas_interesse_futuro?: string[];
}

export interface CreateMentoradoMetaData {
  titulo_meta: string;
  descricao_meta?: string;
  categoria_meta?: CategoriaMeta;
  data_inicio?: string;
  data_fim_planejada?: string;
  valor_inicial?: number;
  valor_meta?: number;
  unidade_medida?: string;
  acoes_necessarias?: string;
  recursos_necessarios?: string;
}

export interface UpdateMentoradoMetaData {
  valor_atual?: number;
  percentual_conclusao?: number;
  status?: StatusMeta;
  obstaculos_identificados?: string;
  resultado_alcancado?: string;
  licoes_aprendidas?: string;
  data_fim_real?: string;
}

export interface CreateMentoradoInteracaoData {
  tipo_interacao: TipoInteracaoMentor;
  data_interacao: string;
  duracao_minutos?: number;
  canal?: string;
  topicos_abordados?: string[];
  resumo_interacao: string;
  duvidas_esclarecidas?: string;
  orientacoes_dadas?: string;
  proximos_passos?: string;
  data_proximo_followup?: string;
  avaliacao_mentorado?: number;
  comentario_mentorado?: string;
  materiais_compartilhados?: string[];
}

export interface CreateMentoradoConquistaData {
  titulo_conquista: string;
  descricao?: string;
  categoria?: string;
  data_conquista: string;
  contexto_conquista?: string;
  desafios_superados?: string;
  valor_numerico?: number;
  unidade_medida?: string;
  impacto_negocio?: string;
  impacto_pessoal?: string;
  publicamente_reconhecida?: boolean;
  compartilhada_comunidade?: boolean;
  certificacao_relacionada?: string;
  contribuicao_mentoria?: string;
  evidencias_urls?: string[];
}