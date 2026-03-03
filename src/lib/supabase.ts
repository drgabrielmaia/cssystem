import { createBrowserClient } from '@supabase/ssr'
import { ApiQueryBuilder, ApiRpcBuilder } from './api-query-builder'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Real Supabase client — used for auth, storage, and as fallback when no JWT
const _supabaseReal = createBrowserClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'cssystem'
    },
    fetch: (url, options = {}) => {
      // Block Supabase auth token refresh when using custom JWT (Docker PostgreSQL)
      // This prevents CORS errors from stale Supabase sessions
      const urlStr = typeof url === 'string' ? url : (url as Request)?.url || ''
      if (hasCustomJwt() && (urlStr.includes('/auth/v1/token') || urlStr.includes('/auth/v1/user'))) {
        return Promise.resolve(new Response(
          JSON.stringify({ error: 'session_not_found', error_description: 'Using custom JWT auth' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ))
      }
      return fetch(url, {
        ...options,
        ...(options.signal && { signal: options.signal })
      }).catch((error: any) => {
        if (error.name === 'AbortError') {
          throw error
        }
        if (error.message?.includes('Invalid Refresh') || error.message?.includes('refresh_token')) {
          throw error
        }
        throw error
      })
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Check if custom JWT token exists (logged in via Docker PostgreSQL API)
function hasCustomJwt(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('cs_auth_token')
}

// Supabase-compatible wrapper that routes data queries through the API
// when logged in via custom JWT. Auth/storage always go through real Supabase.
export const supabase = {
  from(table: string) {
    if (hasCustomJwt()) {
      return new ApiQueryBuilder(table) as any
    }
    return _supabaseReal.from(table)
  },

  rpc(name: string, params?: any) {
    if (hasCustomJwt()) {
      return new ApiRpcBuilder(name, params) as any
    }
    return _supabaseReal.rpc(name, params)
  },

  // Auth always goes through real Supabase (for mentorado pages, Supabase-based users)
  get auth() {
    return _supabaseReal.auth
  },

  // Storage always goes through real Supabase
  get storage() {
    return _supabaseReal.storage
  },

  // Realtime always goes through real Supabase
  channel(...args: any[]) {
    return (_supabaseReal as any).channel(...args)
  },

  removeChannel(...args: any[]) {
    return (_supabaseReal as any).removeChannel(...args)
  },
} as any

// Also export the real Supabase client for cases that explicitly need it
export const supabaseReal = _supabaseReal

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'cssystem'
    },
    fetch: (url, options = {}) => {
      const urlStr = typeof url === 'string' ? url : (url as Request)?.url || ''
      if (hasCustomJwt() && (urlStr.includes('/auth/v1/token') || urlStr.includes('/auth/v1/user'))) {
        return Promise.resolve(new Response(
          JSON.stringify({ error: 'session_not_found', error_description: 'Using custom JWT auth' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ))
      }
      return fetch(url, {
        ...options,
        ...(options.signal && { signal: options.signal })
      }).catch((error: any) => {
        if (error.name === 'AbortError') {
          throw error
        }
        throw error
      })
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

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
  async getAll() {
    const { data, error } = await supabase
      .from('instagram_automations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as AutomationRule[]
  },

  async create(automation: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('instagram_automations')
      .insert([automation])
      .select()

    if (error) throw error
    return data[0] as AutomationRule
  },

  async update(id: string, updates: Partial<AutomationRule>) {
    const { data, error } = await supabase
      .from('instagram_automations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0] as AutomationRule
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('instagram_automations')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async toggleActive(id: string) {
    const { data: current } = await supabase
      .from('instagram_automations')
      .select('is_active')
      .eq('id', id)
      .single()

    if (!current) throw new Error('Automação não encontrada')

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
  async getAll() {
    const { data, error } = await supabase
      .from('instagram_funnels')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Funnel[]
  },

  async create(funnel: Omit<Funnel, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('instagram_funnels')
      .insert([funnel])
      .select()

    if (error) throw error
    return data[0] as Funnel
  },

  async update(id: string, updates: Partial<Funnel>) {
    const { data, error } = await supabase
      .from('instagram_funnels')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0] as Funnel
  },

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
  comissao_fixa_indicacao?: number
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
  async getUserOrganization(userId: string) {
    try {
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

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('User not found in any organization');
          return null;
        }
        throw error;
      }

      if (!data || !data.organizations) {
        console.log('No organization data found for user');
        return null;
      }

      return {
        organization: data.organizations as any as Organization,
        role: data.role as string
      }
    } catch (error: any) {
      console.error('Error fetching user organization:', error);
      throw error;
    }
  },

  async getOrganizationUsers(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as OrganizationUser[]
  },

  async addUserToOrganization(organizationId: string, email: string, role: 'owner' | 'manager' | 'viewer') {
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
        user_id: null
      })
      .select()

    if (error) throw error
    return data[0] as OrganizationUser
  },

  async updateUserRole(userId: string, role: 'owner' | 'manager' | 'viewer') {
    const { data, error } = await supabase
      .from('organization_users')
      .update({ role })
      .eq('id', userId)
      .select()

    if (error) throw error
    return data[0] as OrganizationUser
  },

  async removeUserFromOrganization(userId: string) {
    const { error } = await supabase
      .from('organization_users')
      .delete()
      .eq('id', userId)

    if (error) throw error
  },

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

  async inviteUser(organizationId: string, email: string, role: 'owner' | 'manager' | 'viewer', invitedBy: string) {
    const { data, error } = await supabase
      .from('organization_users')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role,
        user_id: null,
      })
      .select()

    if (error) throw error
    return data[0] as OrganizationUser
  },

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

  async deleteOrganization(organizationId: string) {
    const { error: usersError } = await supabase
      .from('organization_users')
      .delete()
      .eq('organization_id', organizationId)

    if (usersError) throw usersError

    const { error: orgError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    if (orgError) throw orgError
  },

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

  async getOrganizationStats(organizationId: string) {
    try {
      const { data: users, error: usersError } = await supabase
        .from('organization_users')
        .select('role, created_at, user_id')
        .eq('organization_id', organizationId)

      if (usersError) {
        console.error('Error fetching organization users:', usersError);
        throw usersError;
      }

      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('created_at')
        .eq('id', organizationId)
        .single()

      if (orgError) {
        console.error('Error fetching organization data:', orgError);
        throw orgError;
      }

      return {
        totalMembers: users?.length || 0,
        activeMembers: users?.filter(u => u.user_id !== null).length || 0,
        pendingMembers: users?.filter(u => u.user_id === null).length || 0,
        owners: users?.filter(u => u.role === 'owner').length || 0,
        managers: users?.filter(u => u.role === 'manager').length || 0,
        viewers: users?.filter(u => u.role === 'viewer').length || 0,
        createdAt: organization?.created_at || ''
      }
    } catch (error: any) {
      console.error('Error fetching organization stats:', error);
      throw error;
    }
  }
}

// Funções para Steps de Funis
export const funnelStepService = {
  async getByFunnelId(funnelId: string) {
    const { data, error } = await supabase
      .from('instagram_funnel_steps')
      .select('*')
      .eq('funnel_id', funnelId)
      .order('step_order', { ascending: true })

    if (error) throw error
    return data as FunnelStep[]
  },

  async create(step: Omit<FunnelStep, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('instagram_funnel_steps')
      .insert([step])
      .select()

    if (error) throw error
    return data[0] as FunnelStep
  },

  async update(id: string, updates: Partial<FunnelStep>) {
    const { data, error } = await supabase
      .from('instagram_funnel_steps')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0] as FunnelStep
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('instagram_funnel_steps')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
