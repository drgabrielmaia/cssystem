const API_BASE_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'

const AUTH_TOKEN_KEY = 'cs_auth_token'
const AUTH_USER_KEY = 'cs_auth_user'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  // Also set as cookie for middleware access
  document.cookie = `cs_auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(AUTH_USER_KEY)
  return stored ? JSON.parse(stored) : null
}

export function setStoredUser(user: any) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  document.cookie = 'cs_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    // Only clear auth and redirect if user had a token (admin user)
    // Don't redirect or clear token for mentorados
    if (token && typeof window !== 'undefined') {
      const isMentoradoPage = window.location.pathname.startsWith('/mentorado')
      if (!isMentoradoPage) {
        clearAuth()
        window.location.href = '/login'
        throw new Error('Sessão expirada')
      }
      // For mentorado pages, just return the response without clearing the token
      // The mentorado token may be valid for uploads but not for /auth/me
    }
  }

  return response
}
