import { supabase } from './supabase'
import { generarTablaAmortizacion, generarTablaCredito } from '../utils/amortizacion'

// ── Arrendamiento ──────────────────────────────────────────────

export const getContratosArrendamiento = async (filtros = {}) => {
  let query = supabase
    .from('contratos_arrendamiento')
    .select(`*, clientes(razon_social, rfc, tipo_persona)`)
    .order('created_at', { ascending: false })

  if (filtros.estatus)    query = query.eq('estatus', filtros.estatus)
  if (filtros.cliente_id) query = query.eq('cliente_id', filtros.cliente_id)
  if (filtros.portafolio) query = query.eq('portafolio', filtros.portafolio)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getContratoArrendamientoById = async (id) => {
  const { data, error } = await supabase
    .from('contratos_arrendamiento')
    .select(`*, clientes(id, razon_social, rfc, tipo_persona, email, telefono)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createContratoArrendamiento = async (contrato, userId) => {
  const { data, error } = await supabase
    .from('contratos_arrendamiento')
    .insert([{ ...contrato, created_by: userId }])
    .select()
    .single()
  if (error) throw error

  const tabla = generarTablaAmortizacion(data)
  const filas = tabla.map(f => ({ ...f, contrato_tipo: 'arrendamiento', contrato_id: data.id }))
  const { error: errorTabla } = await supabase.from('tabla_amortizacion').insert(filas)
  if (errorTabla) throw errorTabla

  return data
}

export const updateContratoArrendamiento = async (id, contrato) => {
  const { data, error } = await supabase
    .from('contratos_arrendamiento')
    .update(contrato).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── Crédito simple ─────────────────────────────────────────────

export const getContratosCredito = async (filtros = {}) => {
  let query = supabase
    .from('contratos_credito')
    .select(`*, clientes(razon_social, rfc, tipo_persona)`)
    .order('created_at', { ascending: false })

  if (filtros.estatus)    query = query.eq('estatus', filtros.estatus)
  if (filtros.cliente_id) query = query.eq('cliente_id', filtros.cliente_id)
  if (filtros.portafolio) query = query.eq('portafolio', filtros.portafolio)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getContratoCreditoById = async (id) => {
  const { data, error } = await supabase
    .from('contratos_credito')
    .select(`*, clientes(id, razon_social, rfc, tipo_persona, email, telefono)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createContratoCredito = async (contrato, userId) => {
  const { data, error } = await supabase
    .from('contratos_credito')
    .insert([{ ...contrato, created_by: userId }])
    .select()
    .single()
  if (error) throw error

  const tabla = generarTablaCredito(data)
  const filas = tabla.map(f => ({ ...f, contrato_tipo: 'credito', contrato_id: data.id }))
  const { error: errorTabla } = await supabase.from('tabla_amortizacion').insert(filas)
  if (errorTabla) throw errorTabla

  return data
}

export const updateContratoCredito = async (id, contrato) => {
  const { data, error } = await supabase
    .from('contratos_credito')
    .update(contrato).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── Tabla de amortización ──────────────────────────────────────

export const getTablaAmortizacion = async (contratoId, contratoTipo) => {
  const { data, error } = await supabase
    .from('tabla_amortizacion')
    .select('*')
    .eq('contrato_id', contratoId)
    .eq('contrato_tipo', contratoTipo)
    .order('numero_pago')
  if (error) throw error
  return data
}

// ── Número de contrato auto ────────────────────────────────────

export const generarNumeroContrato = async (tipo = 'ARR') => {
  const anio    = new Date().getFullYear()
  const prefijo = `${tipo}-${anio}-`
  const tabla   = tipo === 'ARR' ? 'contratos_arrendamiento' : 'contratos_credito'

  const { data } = await supabase
    .from(tabla)
    .select('numero_contrato')
    .ilike('numero_contrato', `${prefijo}%`)
    .order('numero_contrato', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return `${prefijo}0001`
  const num = parseInt(data[0].numero_contrato.split('-').pop(), 10) + 1
  return `${prefijo}${String(num).padStart(4, '0')}`
}
