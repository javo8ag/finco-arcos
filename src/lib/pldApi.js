import { supabase } from './supabase'

// Umbrales legales México (efectivo)
export const UMBRAL_PFAE = 300_000
export const UMBRAL_PM   = 500_000

// ── Alertas ───────────────────────────────────────────────────

export const getAlertas = async (filtros = {}) => {
  let q = supabase.from('pld_alertas').select('*').order('created_at', { ascending: false })
  if (filtros.tipo)    q = q.eq('tipo', filtros.tipo)
  if (filtros.estatus) q = q.eq('estatus', filtros.estatus)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const crearAlerta = async (alerta) => {
  const { data, error } = await supabase
    .from('pld_alertas').insert([alerta]).select().single()
  if (error) throw error
  return data
}

export const actualizarAlerta = async (id, cambios) => {
  const { data, error } = await supabase
    .from('pld_alertas').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── Consultas a listas negras ──────────────────────────────────

export const getConsultasListas = async (clienteId = null) => {
  let q = supabase.from('pld_consultas_listas').select('*').order('created_at', { ascending: false })
  if (clienteId) q = q.eq('cliente_id', clienteId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const registrarConsultaLista = async (consulta) => {
  const { data, error } = await supabase
    .from('pld_consultas_listas').insert([consulta]).select().single()
  if (error) throw error
  return data
}

// ── Clientes con expediente por actualizar (>12 meses) ────────

export const getClientesExpedienteVencido = async () => {
  const hace12meses = new Date()
  hace12meses.setFullYear(hace12meses.getFullYear() - 1)
  const fecha = hace12meses.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('clientes')
    .select('id, razon_social, rfc, tipo_persona, fecha_actualizacion_expediente')
    .eq('activo', true)
    .or(`fecha_actualizacion_expediente.is.null,fecha_actualizacion_expediente.lt.${fecha}`)
    .order('razon_social')
  if (error) throw error
  return data
}

// ── Verificación automática de umbral en pagos en efectivo ────

export const verificarUmbralEfectivo = async ({
  clienteId, clienteNombre, montoRecibido, formaPago, contratoNumero, userId,
}) => {
  if (formaPago !== 'Efectivo') return null

  // Necesitamos tipo_persona para saber el umbral
  const { data: cliente } = await supabase
    .from('clientes').select('tipo_persona').eq('id', clienteId).single()

  const umbral = cliente?.tipo_persona === 'PM' ? UMBRAL_PM : UMBRAL_PFAE
  if (montoRecibido < umbral) return null

  return crearAlerta({
    tipo:            'OR',
    estatus:         'Pendiente',
    cliente_id:      clienteId,
    cliente_nombre:  clienteNombre,
    contrato_numero: contratoNumero,
    monto:           montoRecibido,
    forma_pago:      formaPago,
    descripcion:     `Operación en efectivo por ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(montoRecibido)} supera umbral legal para ${cliente?.tipo_persona === 'PM' ? 'Persona Moral ($500,000)' : 'PFAE ($300,000)'}.`,
    origen:          'automatico',
    creado_por:      userId,
  })
}

// ── Stats para dashboard PLD ───────────────────────────────────

export const getStatsPLD = async () => {
  const { data, error } = await supabase
    .from('pld_alertas')
    .select('tipo, estatus')
  if (error) throw error

  const alertas = data ?? []
  return {
    pendientes: alertas.filter(a => a.estatus === 'Pendiente').length,
    OR:  alertas.filter(a => a.tipo === 'OR').length,
    OI:  alertas.filter(a => a.tipo === 'OI').length,
    OIP: alertas.filter(a => a.tipo === 'OIP').length,
    total: alertas.length,
  }
}
