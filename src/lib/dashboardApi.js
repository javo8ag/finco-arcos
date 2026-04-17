import { supabase } from './supabase'
import { subMonths, format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ── KPIs principales ───────────────────────────────────────────

export const getDashboardData = async () => {
  const hoy = new Date()
  const inicioMes = startOfMonth(hoy).toISOString().split('T')[0]
  const finMes    = endOfMonth(hoy).toISOString().split('T')[0]

  const [
    { data: contratos },
    { data: tablaPendiente },
    { data: pagosMes },
    { data: contratosRecientes },
    { data: pagosRecientes },
  ] = await Promise.all([
    // Contratos arrendamiento activos/en mora
    supabase.from('contratos_arrendamiento')
      .select('id, numero_contrato, estatus, valor_activo, enganche, fecha_inicio, fecha_vencimiento, renta_mensual, clientes(razon_social)')
      .in('estatus', ['Activo', 'En mora', 'Vencido', 'Liquidado']),

    // Primera fila pendiente por contrato (para saldo insoluto)
    supabase.from('tabla_amortizacion')
      .select('contrato_id, contrato_tipo, saldo_insoluto, capital, fecha_pago, numero_pago, total_pago, estatus_pago')
      .eq('contrato_tipo', 'arrendamiento')
      .neq('estatus_pago', 'Pagado')
      .order('numero_pago'),

    // Pagos del mes actual
    supabase.from('pagos')
      .select('monto_recibido, fecha_pago, aplicado_capital')
      .gte('fecha_pago', inicioMes)
      .lte('fecha_pago', finMes),

    // Últimos 5 contratos creados
    supabase.from('contratos_arrendamiento')
      .select('numero_contrato, valor_activo, fecha_inicio, estatus, clientes(razon_social)')
      .order('created_at', { ascending: false })
      .limit(5),

    // Últimos 5 pagos
    supabase.from('pagos')
      .select('fecha_pago, monto_recibido, tipo_pago, forma_pago, clientes(razon_social)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // ── Saldo insoluto por contrato (primera fila pendiente) ──
  const saldoPorContrato = {}
  for (const f of tablaPendiente ?? []) {
    if (!saldoPorContrato[f.contrato_id]) {
      // saldo = saldo_insoluto del período anterior + capital de este período
      saldoPorContrato[f.contrato_id] = (f.saldo_insoluto ?? 0) + (f.capital ?? 0)
    }
  }

  // ── KPIs ──────────────────────────────────────────────────
  const activos   = (contratos ?? []).filter(c => c.estatus === 'Activo')
  const enMora    = (contratos ?? []).filter(c => c.estatus === 'En mora')
  const liquidados= (contratos ?? []).filter(c => c.estatus === 'Liquidado')

  const carteraTotal   = Object.values(saldoPorContrato).reduce((s, v) => s + v, 0)
  const cobradoMes     = (pagosMes ?? []).reduce((s, p) => s + (p.monto_recibido ?? 0), 0)

  // Cartera vencida: pagos con más de 30 días de atraso
  const hace30 = subMonths(hoy, 1).toISOString().split('T')[0]
  const pagosVencidos = (tablaPendiente ?? []).filter(f => f.fecha_pago < hace30)
  const contratoVencidoIds = [...new Set(pagosVencidos.map(f => f.contrato_id))]
  const carteraVencida = contratoVencidoIds.reduce((s, id) => s + (saldoPorContrato[id] ?? 0), 0)
  const indMorosidad = carteraTotal > 0 ? (carteraVencida / carteraTotal * 100) : 0

  // ── Próximos a vencer (30 días) ───────────────────────────
  const en30dias = new Date(); en30dias.setDate(en30dias.getDate() + 30)
  const proximosVencer = (contratos ?? []).filter(c =>
    c.estatus === 'Activo' && c.fecha_vencimiento &&
    new Date(c.fecha_vencimiento) <= en30dias
  )

  // ── Buckets de mora ───────────────────────────────────────
  const buckets = { '1-30': [], '31-60': [], '61-90': [], '+90': [] }
  for (const f of tablaPendiente ?? []) {
    const dias = Math.floor((hoy - new Date(f.fecha_pago + 'T12:00:00')) / 86400000)
    if (dias <= 0) continue
    const id = f.contrato_id
    const contrato = (contratos ?? []).find(c => c.id === id)
    if (!contrato) continue
    const entry = { contrato, dias, saldo: saldoPorContrato[id] ?? 0 }
    if (dias <= 30)      buckets['1-30'].push(entry)
    else if (dias <= 60) buckets['31-60'].push(entry)
    else if (dias <= 90) buckets['61-90'].push(entry)
    else                 buckets['+90'].push(entry)
  }
  // deduplicar por contrato_id (solo el más antiguo)
  for (const key of Object.keys(buckets)) {
    const seen = new Set()
    buckets[key] = buckets[key].filter(e => {
      if (seen.has(e.contrato.id)) return false
      seen.add(e.contrato.id)
      return true
    })
  }

  // ── Gráfica: colocación mensual (últimos 12 meses) ────────
  const meses12 = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(hoy, 11 - i)
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy', { locale: es }) }
  })
  const colocacionMensual = meses12.map(({ key, label }) => {
    const total = (contratos ?? [])
      .filter(c => c.fecha_inicio?.startsWith(key))
      .reduce((s, c) => s + (c.valor_activo ?? 0), 0)
    return { mes: label, colocacion: total }
  })

  // ── Gráfica: cobros mensuales (últimos 6 meses) ───────────
  const { data: todosPagos } = await supabase.from('pagos')
    .select('monto_recibido, fecha_pago')
    .gte('fecha_pago', subMonths(hoy, 6).toISOString().split('T')[0])

  const meses6 = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(hoy, 5 - i)
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy', { locale: es }) }
  })
  const cobrosMensuales = meses6.map(({ key, label }) => {
    const cobrado = (todosPagos ?? [])
      .filter(p => p.fecha_pago?.startsWith(key))
      .reduce((s, p) => s + (p.monto_recibido ?? 0), 0)
    return { mes: label, cobrado }
  })

  // ── Gráfica: cartera por estatus (dona) ───────────────────
  const cartPorEstatus = [
    { name: 'Activo',    value: activos.length,    fill: '#2d43d0' },
    { name: 'En mora',   value: enMora.length,     fill: '#ff7900' },
    { name: 'Liquidado', value: liquidados.length, fill: '#22c55e' },
    { name: 'Vencido',   value: (contratos ?? []).filter(c => c.estatus === 'Vencido').length, fill: '#ef4444' },
  ].filter(e => e.value > 0)

  return {
    kpis: {
      carteraTotal,
      carteraVencida,
      indMorosidad,
      cobradoMes,
      totalActivos:   activos.length,
      totalEnMora:    enMora.length,
      totalLiquidados: liquidados.length,
      totalContratos: (contratos ?? []).length,
    },
    proximosVencer,
    buckets,
    colocacionMensual,
    cobrosMensuales,
    cartPorEstatus,
    pagosRecientes: pagosRecientes ?? [],
  }
}
