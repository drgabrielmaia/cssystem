import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // IMMEDIATELY RETURN FOR ALL STATIC ASSETS - NO PROCESSING
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.js') ||
    pathname.includes('.css') ||
    pathname.includes('.map') ||
    pathname.includes('.ico') ||
    pathname.includes('.png') ||
    pathname.includes('.jpg') ||
    pathname.includes('.jpeg') ||
    pathname.includes('.gif') ||
    pathname.includes('.webp') ||
    pathname.includes('.svg') ||
    pathname.includes('.woff') ||
    pathname.includes('.ttf') ||
    pathname.includes('.eot') ||
    pathname.includes('.json')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Public API routes that don't need authentication
  const publicApiRoutes = [
    '/api/checkout',
    '/api/pix-qr',
    '/api/instagram/webhook',
    '/api/whatsapp/send-message',
    '/api/whatsapp/disconnect-all',
    '/api/notify-followup',
    '/api/chat-ai',
    '/api/analyze-form',
    '/api/analisar-formulario'
  ]

  // Public pages that don't need authentication
  const publicRoutes = [
    '/login',
    '/formulario',
    '/forms',
    '/agendar',
    '/financeiro/login',
    '/financeiro-plataforma'
  ]

  const isPublicApiRoute = publicApiRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Check for custom admin authentication (no DB query needed)
  const hasCustomAuth = request.cookies.get('admin_auth')?.value === 'true'

  // If it's a public route or public API, skip authentication entirely
  if (isPublicRoute || isPublicApiRoute) {
    return response
  }

  // ALL API routes should return 401 instead of redirect
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Only create Supabase client and check authentication for protected routes
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

  // Only check authentication for protected routes
  const { data: { user } } = await supabase.auth.getUser()

  // If user is not authenticated and trying to access protected routes
  if (!user && !hasCustomAuth) {
    if (isApiRoute) {
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
      request.nextUrl.pathname === route
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
     * Exclude ALL _next paths completely from middleware
     */
    '/((?!_next)(?!favicon.ico)(?!.*\\.).*)',
  ],
}