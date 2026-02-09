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