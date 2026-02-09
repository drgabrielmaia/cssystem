// Lead Qualification System Types
export type LeadTemperature = 'quente' | 'morno' | 'frio'
export type PaymentIntent = 'a_vista' | 'parcelado' | 'vai_conseguir' | 'nao_tem'
export type UrgencyLevel = 'imediato' | 'ate_30_dias' | 'ate_3_meses' | 'pesquisando'
export type BusinessSituation = 'tem_negocio_escalando' | 'quer_comecar_com_experiencia' | 'iniciante_total'

export interface LeadQualification {
  id?: string
  // Personal Information
  nome_completo: string
  email: string
  whatsapp: string
  
  // Referral and Social Proof
  origem_conhecimento: string
  tempo_seguindo?: string
  nome_indicacao?: string
  
  // Business Information
  situacao_negocio: BusinessSituation
  faturamento_atual?: number
  objetivo_faturamento?: number
  
  // Intent and Urgency
  forma_pagamento: PaymentIntent
  urgencia: UrgencyLevel
  
  // Motivation and Experience
  motivacao_principal?: string
  investiu_mentoria_antes?: boolean
  maior_desafio?: string
  
  // Scoring Results
  score_total?: number
  temperatura?: LeadTemperature
  score_breakdown?: ScoreBreakdown
  
  // Psychological Profiling
  psychological_profile?: PsychologicalProfile
  engagement_signals?: EngagementSignals
  
  // Form Metadata
  form_version?: string
  completion_time?: number
  abandonment_points?: string[]
  device_info?: DeviceInfo
  ip_address?: string
  
  // Status and Follow-up
  status?: string
  assigned_to?: string
  follow_up_date?: Date
  notes?: string
  
  // Integration Fields
  crm_id?: string
  email_sent?: boolean
  whatsapp_sent?: boolean
  
  // Organization
  organization_id?: string
  
  // Timestamps
  created_at?: string
  updated_at?: string
}

export interface ScoreBreakdown {
  payment_intent: {
    score: number
    weight: string
  }
  social_proof: {
    score: number
    weight: string
  }
  urgency: {
    score: number
    weight: string
  }
  situation: {
    score: number
    weight: string
  }
  total: number
  max_possible: number
}

export interface PsychologicalProfile {
  buyer_persona?: 'analytical' | 'expressive' | 'driver' | 'amiable'
  decision_factors: string[]
  objections: string[]
  motivators: string[]
  communication_preference?: 'visual' | 'auditory' | 'kinesthetic'
  risk_tolerance?: 'low' | 'medium' | 'high'
}

export interface EngagementSignals {
  form_start_time: string
  form_complete_time?: string
  total_time_seconds: number
  field_times: Record<string, number>
  field_changes: Record<string, number>
  hesitation_points: string[]
  scroll_depth: number
  mouse_activity: number
  device_switches: number
}

export interface DeviceInfo {
  user_agent: string
  platform: string
  screen_resolution: string
  browser: string
  is_mobile: boolean
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export interface LeadInteraction {
  id: string
  lead_id: string
  interaction_type: 'email' | 'whatsapp' | 'call' | 'meeting'
  interaction_date: string
  notes?: string
  outcome?: string
  next_action?: string
  created_by?: string
  created_at: string
}

export interface FormVariation {
  id: string
  variation_name: string
  variation_code: string
  is_active: boolean
  traffic_percentage: number
  questions_order?: any
  copy_variations?: any
  design_tokens?: any
  total_views: number
  total_submissions: number
  total_hot_leads: number
  conversion_rate?: number
  created_at: string
  updated_at: string
}

export interface FormAnalytics {
  id: string
  session_id: string
  lead_id?: string
  variation_id?: string
  field_interactions?: Record<string, number>
  field_changes?: Record<string, number>
  scroll_depth?: number
  mouse_movements?: number
  abandoned: boolean
  abandonment_field?: string
  abandonment_time?: number
  user_agent?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  created_at: string
}

export interface ScoringRule {
  id: string
  rule_name: string
  rule_category: string
  condition_field: string
  condition_operator: string
  condition_value: string
  points: number
  weight_percentage: number
  is_active: boolean
  description?: string
  instant_hot_qualifier: boolean
  created_at: string
  updated_at: string
}

// Form Step Configuration
export interface FormStep {
  id: string
  title: string
  subtitle?: string
  fields: FormField[]
  validation?: FormValidation
  conditional?: ConditionalLogic
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'radio' | 'textarea' | 'number' | 'currency'
  placeholder?: string
  required: boolean
  options?: SelectOption[]
  validation?: FieldValidation
  helpText?: string
  psychological_trigger?: string
  scoring_impact?: string
  conditional?: ConditionalLogic
}

export interface SelectOption {
  value: string
  label: string
  score?: number
  instant_qualifier?: boolean
  psychological_weight?: number
}

export interface FieldValidation {
  pattern?: string
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  custom?: (value: any) => boolean | string
}

export interface FormValidation {
  onSubmit?: (data: any) => boolean | string
  dependencies?: string[]
}

export interface ConditionalLogic {
  show_if?: {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: any
  }
  require_if?: {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: any
  }
}

// Scoring Algorithm Configuration
export interface ScoringConfig {
  weights: {
    payment_intent: number
    social_proof: number
    urgency: number
    situation: number
  }
  thresholds: {
    hot: number
    warm: number
  }
  instant_qualifiers: string[]
  penalty_factors: string[]
}

// Analytics Events
export type AnalyticsEvent = 
  | FormStartEvent
  | FormProgressEvent
  | FormFieldEvent
  | FormAbandonEvent
  | FormCompleteEvent

export interface FormStartEvent {
  type: 'form_start'
  session_id: string
  variation_id?: string
  timestamp: string
  device_info: DeviceInfo
}

export interface FormProgressEvent {
  type: 'form_progress'
  session_id: string
  step: number
  total_steps: number
  timestamp: string
}

export interface FormFieldEvent {
  type: 'field_interaction'
  session_id: string
  field_name: string
  interaction_type: 'focus' | 'blur' | 'change'
  time_spent?: number
  timestamp: string
}

export interface FormAbandonEvent {
  type: 'form_abandon'
  session_id: string
  abandonment_field: string
  abandonment_step: number
  time_on_form: number
  timestamp: string
}

export interface FormCompleteEvent {
  type: 'form_complete'
  session_id: string
  lead_id: string
  score: number
  temperature: LeadTemperature
  completion_time: number
  timestamp: string
}