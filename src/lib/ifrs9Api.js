import { supabase } from './supabase'

// Tasas de reserva preventiva sugerida por etapa (IFRS 9 simplificado)
export const TASAS_RESERVA = {
  etapa1: 0.02,   // 0 días en mora  → 2%
  etapa2: 0.10,   // 1-89 días        → 10%
  etapa3: 0.75,   // 90+ días         → 75%
}

export const ETAPAS = [
  { id: 1, label: 'Etapa 1', desc: 'Vigente / Normal',          dias: '0 días',   tasa: TASAS_RESERVA.etapa1, color: '#22c55e', bg: 'bg-green-50',  text: 'text-green-700' },
  { id: 2, label: 'Etapa 2', desc: 'Deterioro significativo',   dias: '1-89 días', tasa: TASAS_RESERVA.etapa2, color: '#f59e0b', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  { id: 3, label: 'Etapa 3', desc: 'Crédito deteriorado',       dias: '90+ días',  tasa: TASAS_RESERVA.etapa3, color: '#ef4444', bg: 'bg-red-50',    text: 'text-red-700' },
]

const asignarEtapa = (diasAtraso) => {
  if (diasAtraso <= 0)  return 1
  if (diasAtraso < 90)  return 2
  return 3
}

const calcularReserva = (etapa, saldo) => saldo * TASAS_RESERVA[`etapa${etapa}`]

export const getClasificacionCartera = async (portafolio = null) => {
  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]

  // Contratos activos + en mora + vencidos (ambos tipos)
  const baseEstatus = ['Activo', 'En mora', 'Vencido']
  const [
    { data: arrContratos },
    { data: crdContratos },
    { data: tablaRows },
  ] = await Promise.all([
    (() => {
      let q = supabase.from('contratos_arrendamiento')
        .select('id, numero_contrato, estatus, portafolio, clientes(razon_social, rfc)')
        .in('estatus', baseEstatus)
      if (portafolio) q = q.eq('portafolio', portafolio)
      return q
    })(),
    (() => {
      let q = supabase.from('contratos_credito')
        .select('id, numero_contrato, estatus, portafolio, clientes(razon_social, rfc)')
        .in('estatus', baseEstatus)
      if (portafolio) q = q.eq('portafolio', portafolio)
      return q
    })(),
    // Todas las filas no pagadas (para calcular saldo + días más antiguo vencido)
    supabase.from('tabla_amortizacion')
      .select('contrato_id, contrato_tipo, numero_pago, fecha_pago, saldo_insoluto, capital, estatus_pago')
      .neq('estatus_pago', 'Pagado')
      .order('numero_pago'),
  ])

  // Saldo insoluto por contrato (primer período pendiente)
  const saldoMap  = {}  // contrato_id → saldo
  const primerVencidoMap = {} // contrato_id → fecha del primer pago atrasado

  for (const fila of tablaRows ?? []) {
    const id = fila.contrato_id

    // Saldo: primera fila pendiente = saldo_insoluto + capital de ese período
    if (!saldoMap[id]) {
      saldoMap[id] = (fila.saldo_insoluto ?? 0) + (fila.capital ?? 0)
    }

    // Primer pago vencido (fecha_pago < hoy y no pagado)
    if (fila.fecha_pago < hoyStr && fila.estatus_pago !== 'Pagado') {
      if (!primerVencidoMap[id] || fila.fecha_pago < primerVencidoMap[id]) {
        primerVencidoMap[id] = fila.fecha_pago
      }
    }
  }

  // Construir clasificación por contrato
  const clasificados = [
    ...(arrContratos ?? []).map(c => ({ ...c, _tipo: 'arrendamiento' })),
    ...(crdContratos  ?? []).map(c => ({ ...c, _tipo: 'credito' })),
  ].map(c => {
    const saldo = saldoMap[c.id] ?? 0
    const primerVencido = primerVencidoMap[c.id]
    const diasAtraso = primerVencido
      ? Math.floor((hoy - new Date(primerVencido + 'T12:00:00')) / 86400000)
      : 0
    const etapa = asignarEtapa(diasAtraso)
    const reserva = calcularReserva(etapa, saldo)

    return {
      id:              c.id,
      numero_contrato: c.numero_contrato,
      tipo:            c._tipo,
      estatus:         c.estatus,
      portafolio:      c.portafolio,
      cliente:         c.clientes?.razon_social ?? '—',
      rfc:             c.clientes?.rfc ?? '—',
      saldo,
      diasAtraso,
      etapa,
      reserva,
    }
  }).sort((a, b) => b.diasAtraso - a.diasAtraso)

  // Resumen por etapa
  const summary = { 1: { count: 0, saldo: 0, reserva: 0 }, 2: { count: 0, saldo: 0, reserva: 0 }, 3: { count: 0, saldo: 0, reserva: 0 } }
  for (const c of clasificados) {
    summary[c.etapa].count++
    summary[c.etapa].saldo   += c.saldo
    summary[c.etapa].reserva += c.reserva
  }

  const totalSaldo   = clasificados.reduce((s, c) => s + c.saldo, 0)
  const totalReserva = clasificados.reduce((s, c) => s + c.reserva, 0)

  return { clasificados, summary, totalSaldo, totalReserva }
}
