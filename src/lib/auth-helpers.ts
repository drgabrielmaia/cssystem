import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

export interface AuthContext {
  userId: string
  email: string
  organizationId: string
  role: 'owner' | 'admin' | 'manager' | 'viewer'
}

/**
 * Validates user authentication and returns context
 * Throws error if not authenticated or not in organization
 */
export async function requireAuth(request?: NextRequest): Promise<AuthContext> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // Check authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    throw new Error('Unauthorized: No valid session')
  }
  
  // Get user's organization context
  const { data: orgUser, error: orgError } = await supabase
    .from('organization_users')
    .select('organization_id, role')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .single()
    
  if (orgError || !orgUser) {
    throw new Error('Forbidden: User not associated with any organization')
  }
  
  return {
    userId: session.user.id,
    email: session.user.email!,
    organizationId: orgUser.organization_id,
    role: orgUser.role as AuthContext['role']
  }
}

/**
 * Validates user has specific role
 */
export async function requireRole(
  roles: Array<'owner' | 'admin' | 'manager' | 'viewer'>,
  request?: NextRequest
): Promise<AuthContext> {
  const auth = await requireAuth(request)
  
  if (!roles.includes(auth.role)) {
    throw new Error(`Forbidden: Requires one of these roles: ${roles.join(', ')}`)
  }
  
  return auth
}

/**
 * Validates user is admin or owner
 */
export async function requireAdmin(request?: NextRequest): Promise<AuthContext> {
  return requireRole(['owner', 'admin'], request)
}

/**
 * Validates user is manager or above
 */
export async function requireManager(request?: NextRequest): Promise<AuthContext> {
  return requireRole(['owner', 'admin', 'manager'], request)
}

/**
 * Creates authenticated Supabase client with organization context
 */
export async function createAuthenticatedClient() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const auth = await requireAuth()
  
  return { supabase, auth }
}

/**
 * Standard error response handler
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof Error) {
    const message = error.message
    
    if (message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { error: message.replace('Forbidden: ', '') },
        { status: 403 }
      )
    }
    
    // Log internal errors but don't expose details
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  
  return NextResponse.json(
    { error: 'Unknown error occurred' },
    { status: 500 }
  )
}

/**
 * Input validation schemas
 */
export const validationSchemas = {
  lead: z.object({
    nome_completo: z.string().min(1).max(255),
    email: z.string().email(),
    telefone: z.string().regex(/^\d{10,11}$/),
    empresa: z.string().optional(),
    cargo: z.string().optional(),
    temperatura: z.enum(['quente', 'morno', 'frio']).optional(),
    nivel_interesse: z.enum(['alto', 'medio', 'baixo']).optional(),
    orcamento_disponivel: z.number().min(0).optional(),
    decisor_principal: z.boolean().optional(),
    dor_principal: z.string().optional()
  }),
  
  mentorado: z.object({
    nome_completo: z.string().min(1).max(255),
    email: z.string().email(),
    telefone: z.string().optional(),
    cpf: z.string().regex(/^\d{11}$/).optional(),
    data_nascimento: z.string().datetime().optional(),
    estado_atual: z.string(),
    status_login: z.enum(['ativo', 'inativo']).default('ativo')
  }),
  
  closer: z.object({
    nome_completo: z.string().min(1).max(255),
    email: z.string().email(),
    telefone: z.string().optional(),
    tipo_closer: z.enum(['interno', 'externo']).optional(),
    status_contrato: z.enum(['ativo', 'desligado']).default('ativo'),
    meta_mensal: z.number().min(0).optional(),
    comissao_percentual: z.number().min(0).max(100).optional()
  }),
  
  appointment: z.object({
    lead_id: z.string().uuid(),
    closer_id: z.string().uuid(),
    date: z.string().datetime(),
    duration_minutes: z.number().min(15).max(180).default(30),
    type: z.enum(['call', 'meeting', 'demo']).default('call'),
    notes: z.string().optional()
  })
}

/**
 * Validate request body against schema
 */
export function validateInput<T>(
  data: unknown, 
  schema: z.ZodSchema<T>
): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }))
    
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`)
  }
  
  return result.data
}

/**
 * Audit logging helper
 */
export async function logAuditEvent(
  supabase: any,
  auth: AuthContext,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: any
) {
  try {
    await supabase.from('security_audit_logs').insert({
      user_id: auth.userId,
      organization_id: auth.organizationId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
      ip_address: 'unknown', // Would need to extract from request
      user_agent: 'unknown'  // Would need to extract from request
    })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // Don't throw - audit logging should not break the main flow
  }
}