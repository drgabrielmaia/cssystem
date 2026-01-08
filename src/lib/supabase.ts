import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente para usar nos componentes (com cookies)
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey)

// Re-exportar tipos do arquivo types
export type { Mentorado, FormularioResposta, KPI, TurmaStats, DespesaMensal } from '@/types'

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

// Interfaces para o sistema de organizações
export interface Organization {
  id: string
  name: string
  owner_email: string
  created_at: string
  updated_at: string
}

export interface OrganizationUser {
  id: string
  organization_id: string
  user_id: string | null
  email: string
  role: 'owner' | 'manager' | 'viewer'
  created_at: string
}

// Funções para gerenciar organizações
export const organizationService = {
  // Buscar organização do usuário
  async getUserOrganization(userId: string) {
    const { data, error } = await supabase
      .from('organization_users')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name,
          owner_email,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return {
      organization: data.organizations as any as Organization,
      role: data.role as string
    }
  },

  // Buscar usuários da organização
  async getOrganizationUsers(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as OrganizationUser[]
  },

  // Adicionar usuário à organização
  async addUserToOrganization(organizationId: string, email: string, role: 'owner' | 'manager' | 'viewer') {
    // Verificar se o email já existe na organização
    const { data: existing } = await supabase
      .from('organization_users')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      throw new Error('Este email já está cadastrado na organização')
    }

    const { data, error } = await supabase
      .from('organization_users')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role,
        user_id: null // Será preenchido quando o usuário fizer login
      })
      .select()

    if (error) throw error
    return data[0] as OrganizationUser
  },

  // Atualizar role do usuário
  async updateUserRole(userId: string, role: 'owner' | 'manager' | 'viewer') {
    const { data, error } = await supabase
      .from('organization_users')
      .update({ role })
      .eq('id', userId)
      .select()

    if (error) throw error
    return data[0] as OrganizationUser
  },

  // Remover usuário da organização
  async removeUserFromOrganization(userId: string) {
    const { error } = await supabase
      .from('organization_users')
      .delete()
      .eq('id', userId)

    if (error) throw error
  },

  // Verificar se usuário tem permissão
  async checkUserPermission(userId: string, organizationId: string, requiredRole?: string[]) {
    const { data, error } = await supabase
      .from('organization_users')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (error) return false

    if (!requiredRole) return true

    return requiredRole.includes(data.role)
  },

  // Convidar usuário por email (função para futura implementação de convites)
  async inviteUser(organizationId: string, email: string, role: 'owner' | 'manager' | 'viewer', invitedBy: string) {
    const { data, error } = await supabase
      .from('organization_users')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role,
        user_id: null,
        // Futuramente adicionar campos como invited_by, invitation_token, etc.
      })
      .select()

    if (error) throw error
    return data[0] as OrganizationUser
  },

  // Listar todas as organizações do usuário
  async getUserOrganizations(userId: string) {
    const { data, error } = await supabase
      .from('organization_users')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name,
          owner_email,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)

    if (error) throw error
    return data.map(item => ({
      organization: item.organizations as any as Organization,
      role: item.role as string
    }))
  },

  // Atualizar organização
  async updateOrganization(organizationId: string, updates: Partial<Pick<Organization, 'name'>>) {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId)
      .select()

    if (error) throw error
    return data[0] as Organization
  },

  // Deletar organização (apenas owners)
  async deleteOrganization(organizationId: string) {
    // Primeiro deletar todos os usuários da organização
    const { error: usersError } = await supabase
      .from('organization_users')
      .delete()
      .eq('organization_id', organizationId)

    if (usersError) throw usersError

    // Depois deletar a organização
    const { error: orgError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    if (orgError) throw orgError
  },

  // Criar nova organização
  async createOrganization(name: string, ownerEmail: string) {
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name,
        owner_email: ownerEmail.toLowerCase()
      })
      .select()

    if (error) throw error
    return data[0] as Organization
  },

  // Buscar estatísticas da organização
  async getOrganizationStats(organizationId: string) {
    const { data: users, error: usersError } = await supabase
      .from('organization_users')
      .select('role, created_at, user_id')
      .eq('organization_id', organizationId)

    if (usersError) throw usersError

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('created_at')
      .eq('id', organizationId)
      .single()

    if (orgError) throw orgError

    return {
      totalMembers: users.length,
      activeMembers: users.filter(u => u.user_id !== null).length,
      pendingMembers: users.filter(u => u.user_id === null).length,
      owners: users.filter(u => u.role === 'owner').length,
      managers: users.filter(u => u.role === 'manager').length,
      viewers: users.filter(u => u.role === 'viewer').length,
      createdAt: organization.created_at
    }
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