import { supabase } from './supabase'
import { getAdminClient } from './adminClient'

export const listarUsuarios = async () => {
  const { data, error } = await getAdminClient()
    .from('perfiles')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data
}

export const crearUsuario = async ({ nombre, email, password, rol, portafolio }) => {
  const admin = getAdminClient()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,   // false → Supabase envía correo de confirmación
    user_metadata: { nombre },
  })
  if (authError) throw authError

  // El trigger handle_new_user() ya creó la fila en perfiles; la actualizamos
  const { error: profileError } = await admin
    .from('perfiles')
    .upsert({
      id:         authData.user.id,
      nombre,
      email,
      rol:        rol || 'analista',
      portafolio: portafolio || null,
      activo:     true,
    })
  if (profileError) throw profileError

  return authData.user
}

export const eliminarUsuario = async (userId) => {
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw error
  await admin.from('perfiles').delete().eq('id', userId)
}

export const enviarRecuperacion = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/mi-cuenta`,
  })
  if (error) throw error
}

// ── Configuración del sistema ──────────────────────────────────

export const getConfiguracion = async () => {
  const { data } = await supabase.from('configuracion_sistema').select('*')
  return Object.fromEntries((data ?? []).map(r => [r.clave, r.valor]))
}

export const setConfiguracion = async (clave, valor, userId) => {
  const { error } = await supabase.from('configuracion_sistema')
    .upsert({ clave, valor, updated_by: userId, updated_at: new Date().toISOString() })
  if (error) throw error
}

export const setConfiguracionBatch = async (pares, userId) => {
  const rows = Object.entries(pares).map(([clave, valor]) => ({
    clave, valor, updated_by: userId, updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from('configuracion_sistema').upsert(rows)
  if (error) throw error
}

export const actualizarUsuario = async (id, campos) => {
  const { data, error } = await getAdminClient()
    .from('perfiles')
    .update({
      nombre:     campos.nombre,
      rol:        campos.rol,
      portafolio: campos.portafolio || null,
      activo:     campos.activo,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Mi cuenta ──────────────────────────────────────────────────

export const actualizarMiPerfil = async (userId, { nombre }) => {
  const { data, error } = await supabase
    .from('perfiles')
    .update({ nombre })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const cambiarPassword = async (nuevaPassword) => {
  const { error } = await supabase.auth.updateUser({ password: nuevaPassword })
  if (error) throw error
}

export const cambiarEmail = async (nuevoEmail) => {
  const { error } = await supabase.auth.updateUser({ email: nuevoEmail })
  if (error) throw error
}
