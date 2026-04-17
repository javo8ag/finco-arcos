import { supabase } from './supabase'

export const getClientes = async (filtros = {}) => {
  let query = supabase
    .from('clientes')
    .select('*')
    .eq('activo', true)
    .order('razon_social')

  if (filtros.busqueda) {
    query = query.or(
      `razon_social.ilike.%${filtros.busqueda}%,rfc.ilike.%${filtros.busqueda}%`
    )
  }
  if (filtros.tipo_persona) query = query.eq('tipo_persona', filtros.tipo_persona)
  if (filtros.clasificacion_riesgo) query = query.eq('clasificacion_riesgo', filtros.clasificacion_riesgo)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getClienteById = async (id) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createCliente = async (cliente) => {
  const { data, error } = await supabase
    .from('clientes')
    .insert([{ ...cliente, rfc: cliente.rfc.toUpperCase() }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateCliente = async (id, cliente) => {
  const { data, error } = await supabase
    .from('clientes')
    .update({ ...cliente, rfc: cliente.rfc?.toUpperCase() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteCliente = async (id) => {
  const { error } = await supabase
    .from('clientes')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}
