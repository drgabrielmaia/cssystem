import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  // Allow access to public routes without authentication
  const publicRoutes = ['/login', '/formulario', '/forms', '/api/chat-ai', '/api/analyze-form', '/api/analisar-formulario', '/mentorado']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is authenticated, check if it's a mentorado
  if (user) {
    const isMentorado = user.user_metadata?.role === 'mentorado'

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
      // If admin is trying to access login, redirect to home
      if (request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}