import { supabase } from './supabase'

const round2 = (n) => Math.round(n * 100) / 100

// ── Generador tabla amortización fondeo ───────────────────────

function generarTablaFondeo({ monto_total, tasa_anual, plazo_meses, fecha_inicio, metodo }) {
  const i      = tasa_anual / 100 / 12
  const n      = plazo_meses
  const inicio = new Date(fecha_inicio + 'T12:00:00')
  let saldo    = monto_total
  const tabla  = []

  const pagoFrances = i === 0
    ? round2(monto_total / n)
    : round2(monto_total * i * Math.pow(1 + i, n) / (Math.pow(1 + i, n) - 1))

  for (let k = 1; k <= n; k++) {
    const fecha = new Date(inicio)
    fecha.setMonth(inicio.getMonth() + k)
    const interes = round2(saldo * i)

    let capital
    if (metodo === 'bullet') {
      capital = k === n ? round2(saldo) : 0
    } else if (metodo === 'aleman') {
      capital = round2(monto_total / n)
    } else {
      capital = k === n ? round2(saldo) : round2(pagoFrances - interes)
    }

    const total = round2(capital + interes)
    saldo = round2(saldo - capital)

    tabla.push({
      numero_pago:    k,
      fecha_pago:     fecha.toISOString().split('T')[0],
      capital,
      interes,
      total_pago:     total,
      saldo_insoluto: Math.max(0, saldo),
      estatus_pago:   'Pendiente',
    })
  }
  return tabla
}

// ── CRUD fondeos ──────────────────────────────────────────────

export const getFondeos = async () => {
  const { data, error } = await supabase
    .from('fondeos').select('*').order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data
}

export const getFondeoById = async (id) => {
  const { data, error } = await supabase.from('fondeos').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const crearFondeo = async (fondeo, userId) => {
  const { data, error } = await supabase
    .from('fondeos').insert([{ ...fondeo, created_by: userId }]).select().single()
  if (error) throw error

  // Generar tabla de amortización
  const tabla = generarTablaFondeo(fondeo)
  const filas = tabla.map(f => ({ ...f, fondeo_id: data.id }))
  await supabase.from('tabla_amortizacion_fondeo').insert(filas)

  return data
}

export const actualizarFondeo = async (id, cambios) => {
  const { data, error } = await supabase
    .from('fondeos').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── Tabla de amortización ─────────────────────────────────────

export const getTablaFondeo = async (fondeoId) => {
  const { data, error } = await supabase
    .from('tabla_amortizacion_fondeo')
    .select('*').eq('fondeo_id', fondeoId).order('numero_pago')
  if (error) throw error
  return data
}

export const marcarPagoFondeo = async (filaId, estatus) => {
  const { error } = await supabase
    .from('tabla_amortizacion_fondeo').update({ estatus_pago: estatus }).eq('id', filaId)
  if (error) throw error
}

// ── Contratos vinculados ──────────────────────────────────────

export const getContratosVinculados = async (fondeoId) => {
  const { data, error } = await supabase
    .from('fondeo_contratos').select('*').eq('fondeo_id', fondeoId)
  if (error) throw error
  return data
}

export const vincularContrato = async (fondeoId, contratoId, contratoTipo, montoAsignado) => {
  const { error } = await supabase.from('fondeo_contratos').upsert([{
    fondeo_id: fondeoId, contrato_id: contratoId,
    contrato_tipo: contratoTipo, monto_asignado: montoAsignado,
  }])
  if (error) throw error
}

export const desvincularContrato = async (fondeoId, contratoId) => {
  await supabase.from('fondeo_contratos')
    .delete().eq('fondeo_id', fondeoId).eq('contrato_id', contratoId)
}

// ── Dashboard de apalancamiento ───────────────────────────────

export const getDashboardFondeo = async () => {
  const hoy      = new Date().toISOString().split('T')[0]
  const en30     = new Date(); en30.setDate(en30.getDate() + 30)
  const en60     = new Date(); en60.setDate(en60.getDate() + 60)
  const en30Str  = en30.toISOString().split('T')[0]
  const en60Str  = en60.toISOString().split('T')[0]

  const [
    { data: fondeos },
    { data: tablaFondeo },
    { data: arrContratos },
    { data: crdContratos },
    { data: tablaAmort },
  ] = await Promise.all([
    supabase.from('fondeos').select('*').in('estatus', ['Activo']),
    supabase.from('tabla_amortizacion_fondeo').select('fondeo_id, saldo_insoluto, capital, fecha_pago, total_pago, estatus_pago').neq('estatus_pago', 'Pagado').order('numero_pago'),
    supabase.from('contratos_arrendamiento').select('id, valor_activo').in('estatus', ['Activo','En mora']),
    supabase.from('contratos_credito').select('id, monto_credito').in('estatus', ['Activo','En mora']),
    supabase.from('tabla_amortizacion').select('contrato_id, saldo_insoluto, capital').neq('estatus_pago', 'Pagado').order('numero_pago'),
  ])

  // Saldo por fondeo (primer período pendiente)
  const saldoFondeoMap = {}
  for (const f of tablaFondeo ?? []) {
    if (!saldoFondeoMap[f.fondeo_id]) {
      saldoFondeoMap[f.fondeo_id] = (f.saldo_insoluto ?? 0) + (f.capital ?? 0)
    }
  }

  const fondeoTotal = Object.values(saldoFondeoMap).reduce((s, v) => s + v, 0)

  // Cartera colocada (saldo insoluto activa)
  const saldoCarteraMap = {}
  for (const f of tablaAmort ?? []) {
    if (!saldoCarteraMap[f.contrato_id]) {
      saldoCarteraMap[f.contrato_id] = (f.saldo_insoluto ?? 0) + (f.capital ?? 0)
    }
  }
  const carteraTotal = Object.values(saldoCarteraMap).reduce((s, v) => s + v, 0)

  // Próximos vencimientos (fondeos que vencen en <60 días)
  const proximosVencimiento = (fondeos ?? []).filter(f => f.fecha_vencimiento <= en60Str)
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))

  // Próximos pagos de fondeo (próximos 30 días)
  const proximosPagos = (tablaFondeo ?? [])
    .filter(f => f.fecha_pago >= hoy && f.fecha_pago <= en30Str)
    .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))

  // Distribución por tipo
  const porTipo = {}
  for (const f of fondeos ?? []) {
    const saldo = saldoFondeoMap[f.id] ?? 0
    porTipo[f.tipo] = (porTipo[f.tipo] ?? 0) + saldo
  }
  const distribucionTipo = Object.entries(porTipo).map(([tipo, saldo]) => ({
    tipo: tipo.replace('_', ' '), saldo,
    pct: fondeoTotal > 0 ? (saldo / fondeoTotal * 100).toFixed(1) : '0',
  }))

  return {
    fondeoTotal,
    carteraTotal,
    apalancamiento: fondeoTotal > 0 ? carteraTotal / fondeoTotal : null,
    fondeos: (fondeos ?? []).map(f => ({ ...f, saldo: saldoFondeoMap[f.id] ?? 0 })),
    proximosVencimiento,
    proximosPagos,
    distribucionTipo,
  }
}
