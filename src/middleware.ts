import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Skip authentication for static assets and API routes that don't need auth
  const staticRoutes = [
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
    '/api/checkout',
    '/api/pix-qr',
    '/api/instagram/webhook'
  ]

  const isStaticRoute = staticRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isStaticRoute) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value)
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          request.cookies.delete(name)
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.delete(name)
        },
      },
    }
  )

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  // Check for custom admin authentication
  const hasCustomAuth = request.cookies.get('admin_auth')?.value === 'true'

  // Allow access to public routes without authentication
  const publicRoutes = ['/login', '/formulario', '/forms', '/api/chat-ai', '/api/analyze-form', '/api/analisar-formulario', '/api/checkout', '/api/pix-qr', '/agendar', '/mentorado', '/api/instagram', '/financeiro/login', '/financeiro-plataforma']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // API routes that need authentication but should not redirect (return 401 instead)
  const protectedApiRoutes = ['/api/video', '/api/mentorados', '/api/financeiro', '/api/admin', '/api/whatsapp']
  const isProtectedApiRoute = protectedApiRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // If user is not authenticated and trying to access protected routes
  if (!user && !hasCustomAuth && !isPublicRoute) {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is authenticated (either Supabase or custom), check permissions
  if (user || hasCustomAuth) {
    const isMentorado = user?.user_metadata?.role === 'mentorado'

    // Admin routes that mentorados cannot access
    const adminRoutes = ['/', '/leads', '/configuracoes', '/cadastro']
    const isAdminRoute = adminRoutes.some(route =>
      request.nextUrl.pathname === route ||
      (route === '/' && request.nextUrl.pathname === '/')
    )

    if (isMentorado) {
      // If mentorado is trying to access admin routes, redirect to mentorado dashboard
      if (isAdminRoute) {
        return NextResponse.redirect(new URL('/mentorado', request.url))
      }
    } else {
      // If admin is trying to access login and is already authenticated, redirect to home
      if (request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|ttf|eot)$).*)',
  ],
}