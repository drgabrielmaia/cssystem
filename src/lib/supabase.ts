import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types para as tabelas
export interface AutomationRule {
  id: string
  name: string
  trigger_type: 'comment_keyword' | 'dm_keyword' | 'new_follower' | 'story_mention'
  keywords: string[]
  response_message: string
  is_active: boolean
  responses_sent: number
  created_at: string
  updated_at: string
}

export interface Funnel {
  id: string
  name: string
  description?: string
  is_active: boolean
  leads_count: number
  conversions_count: number
  created_at: string
  updated_at: string
}

export interface FunnelStep {
  id: string
  funnel_id: string
  step_order: number
  step_type: 'message' | 'delay' | 'condition' | 'action'
  content?: string
  delay_minutes?: number
  condition_rule?: string
  action_type?: string
  next_step_id?: string
  created_at: string
}

// Funções para Automações
export const automationService = {
  // Listar todas as automações
  async getAll() {
    const { data, error } = await supabase
      .from('instagram_automations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as AutomationRule[]
  },

  // Criar nova automação
  async create(automation: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('instagram_automations')
      .insert([automation])
      .select()

    if (error) throw error
    return data[0] as AutomationRule
  },

  // Atualizar automação
  async update(id: string, updates: Partial<AutomationRule>) {
    const { data, error } = await supabase
      .from('instagram_automations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0] as AutomationRule
  },

  // Deletar automação
  async delete(id: string) {
    const { error } = await supabase
      .from('instagram_automations')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Ativar/Desativar automação
  async toggleActive(id: string) {
    // Primeiro buscar o estado atual
    const { data: current } = await supabase
      .from('instagram_automations')
      .select('is_active')
      .eq('id', id)
      .single()

    if (!current) throw new Error('Automação não encontrada')

    // Inverter o estado
    const { data, error } = await supabase
      .from('instagram_automations')
      .update({
        is_active: !current.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0] as AutomationRule
  }
}

// Funções para Funis
export const funnelService = {
  // Listar todos os funis
  async getAll() {
    const { data, error } = await supabase
      .from('instagram_funnels')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Funnel[]
  },

  // Criar novo funil
  async create(funnel: Omit<Funnel, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('instagram_funnels')
      .insert([funnel])
      .select()

    if (error) throw error
    return data[0] as Funnel
  },

  // Atualizar funil
  async update(id: string, updates: Partial<Funnel>) {
    const { data, error } = await supabase
      .from('instagram_funnels')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0] as Funnel
  },

  // Deletar funil
  async delete(id: string) {
    const { error } = await supabase
      .from('instagram_funnels')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Funções para Steps de Funis
export const funnelStepService = {
  // Buscar steps de um funil
  async getByFunnelId(funnelId: string) {
    const { data, error } = await supabase
      .from('instagram_funnel_steps')
      .select('*')
      .eq('funnel_id', funnelId)
      .order('step_order', { ascending: true })

    if (error) throw error
    return data as FunnelStep[]
  },

  // Criar novo step
  async create(step: Omit<FunnelStep, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('instagram_funnel_steps')
      .insert([step])
      .select()

    if (error) throw error
    return data[0] as FunnelStep
  },

  // Atualizar step
  async update(id: string, updates: Partial<FunnelStep>) {
    const { data, error } = await supabase
      .from('instagram_funnel_steps')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0] as FunnelStep
  },

  // Deletar step
  async delete(id: string) {
    const { error } = await supabase
      .from('instagram_funnel_steps')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}