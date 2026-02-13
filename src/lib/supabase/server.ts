import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For Server Components and Route Handlers with CookieStore
export function createClient(cookieStore: any) {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: any) {
        try {
          cookiesToSet.forEach(({ name, value, options }: any) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      }
    }
  })
}

// For middleware
export function createMiddlewareClient(request: NextRequest) {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        const cookies: { name: string; value: string }[] = []
        request.cookies.getAll().forEach(({ name, value }) => {
          cookies.push({ name, value })
        })
        return cookies
      },
      setAll(cookiesToSet: any) {
        // Not implemented for middleware
      }
    }
  })
}