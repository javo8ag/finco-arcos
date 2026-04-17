import { createClient } from '@supabase/supabase-js'

// Cliente con service role — bypasa RLS, solo usar para operaciones admin
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)
