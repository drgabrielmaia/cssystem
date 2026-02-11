import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = [
  '/login',
  '/cadastro', 
  '/forms',
  '/privacy-policy',
  '/api/webhook'
]

// Rotas de formulários públicos (dinâmicas)
const PUBLIC_DYNAMIC_PATTERNS = [
  /^\/forms\/[^\/]+$/,  // /forms/[slug]
  /^\/agendar\/[^\/]+$/, // /agendar/[token]
  /^\/agenda\/agendar\/[^\/]+$/, // /agenda/agendar/[token]
]

// Verificar se é rota pública
function isPublicRoute(pathname: string): boolean {
  // Verificar rotas estáticas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return true
  }

  // Verificar padrões dinâmicos
  if (PUBLIC_DYNAMIC_PATTERNS.some(pattern => pattern.test(pathname))) {
    return true
  }

  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  console.log('🔐 Middleware verificando rota:', pathname)

  // Permitir recursos estáticos e API routes específicas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/cron')
  ) {
    return NextResponse.next()
  }

  // Verificar se é rota pública
  if (isPublicRoute(pathname)) {
    console.log('✅ Rota pública permitida:', pathname)
    return NextResponse.next()
  }

  // Para todas as outras rotas, validar autenticação
  try {
    let response = NextResponse.next({
      request: {
        headers: req.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            req.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            req.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Verificar sessão ativa no Supabase
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Se não tem sessão válida, redirecionar para login
    if (!session) {
      console.log('❌ Acesso negado - sem sessão válida')
      const redirectUrl = new URL('/login', req.url)
      
      // Preservar URL original para redirect após login
      if (pathname !== '/') {
        redirectUrl.searchParams.set('redirect', pathname)
      }
      
      return NextResponse.redirect(redirectUrl)
    }

    // Validar se usuário existe e está ativo
    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('is_active, organization_id')
      .eq('email', session.user.email)
      .single()

    if (!orgUser || !orgUser.is_active) {
      console.log('❌ Usuário inativo ou não encontrado')
      return NextResponse.redirect(new URL('/login?error=unauthorized', req.url))
    }

    console.log('✅ Acesso autorizado para:', session.user.email)
    return response

  } catch (error) {
    console.error('❌ Erro no middleware de auth:', error)
    return NextResponse.redirect(new URL('/login?error=auth_error', req.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/webhook|api/cron).*)',
  ],
}