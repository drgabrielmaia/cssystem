import { createClient } from '@supabase/supabase-js'

// Service role client para bypassar RLS quando necessário
export const createServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Cliente de serviço pré-configurado
export const serviceClient = createServiceClient()