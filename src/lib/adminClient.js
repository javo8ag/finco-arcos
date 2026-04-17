import { createClient } from '@supabase/supabase-js'

// Cliente con service role — se crea bajo demanda para no romper el arranque
// si la variable no está configurada en el entorno
let _adminClient = null

export const getAdminClient = () => {
  const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY no está configurada.')
  if (!_adminClient) {
    _adminClient = createClient(import.meta.env.VITE_SUPABASE_URL, key)
  }
  return _adminClient
}
