// =====================================================================
// Supabase server client REMOVED — all data goes through api-cs (Docker PostgreSQL)
// Stubs provided so existing API routes don't crash
// =====================================================================

import { supabase } from '../supabase'

// Returns the same stub supabase object — all queries go through ApiQueryBuilder
export function createClient(_cookieStore?: any) {
  return supabase
}

// For middleware — same stub
export function createMiddlewareClient(_request?: any) {
  return supabase
}