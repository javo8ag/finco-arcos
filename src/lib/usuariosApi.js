import { supabase } from './supabase'
import { supabaseAdmin } from './adminClient'

export const listarUsuarios = async () => {
  const { data, error } = await supabaseAdmin
    .from('perfiles')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data
}

export const crearUsuario = async ({ nombre, email, password, rol, portafolio }) => {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })
  if (authError) throw authError

  // El trigger handle_new_user() ya creó la fila en perfiles; la actualizamos
  const { error: profileError } = await supabaseAdmin
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

export const actualizarUsuario = async (id, campos) => {
  const { data, error } = await supabaseAdmin
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
