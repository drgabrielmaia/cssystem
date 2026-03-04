import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// =====================================================================
// Middleware — Supabase REMOVED, auth handled client-side + api-cs JWT
// =====================================================================

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = [
  '/login',
  '/cadastro',
  '/forms',
  '/privacy-policy',
  '/mentorado',
]

// APIs públicas específicas
const PUBLIC_APIS = [
  '/api/webhook',
  '/api/cron',
  '/api/config',
  '/api/ranking',
  '/api/check-admin-status',
]

// Rotas de formulários públicos (dinâmicas)
const PUBLIC_DYNAMIC_PATTERNS = [
  /^\/forms\/[^\/]+$/,  // /forms/[slug]
  /^\/agendar\/[^\/]+$/, // /agendar/[token]
  /^\/agenda\/agendar\/[^\/]+$/, // /agenda/agendar/[token]
]

// Verificar se é rota pública
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return true
  }
  if (PUBLIC_DYNAMIC_PATTERNS.some(pattern => pattern.test(pathname))) {
    return true
  }
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Permitir recursos estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Verificar APIs públicas específicas
  if (PUBLIC_APIS.some(api => pathname.startsWith(api))) {
    return NextResponse.next()
  }

  // Verificar se é rota pública
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Auth is handled client-side by AuthContext and MentoradoAuthContext
  // JWT tokens are stored in localStorage (not accessible by middleware)
  // Just pass through — if the user isn't authenticated,
  // the client-side context will redirect them
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
