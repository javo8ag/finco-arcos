import { supabase } from './supabase'
import { subMonths, subYears, addDays, format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

// ── KPIs principales ───────────────────────────────────────────

export const getDashboardData = async (portafolio = null) => {
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
    (() => {
      let q = supabase.from('contratos_arrendamiento')
        .select('id, numero_contrato, estatus, valor_activo, enganche, fecha_inicio, fecha_vencimiento, renta_mensual, portafolio, clientes(razon_social)')
        .in('estatus', ['Activo', 'En mora', 'Vencido', 'Liquidado'])
      if (portafolio) q = q.eq('portafolio', portafolio)
      return q
    })(),

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
      totalActivos:    activos.length,
      totalEnMora:     enMora.length,
      totalLiquidados: liquidados.length,
      totalContratos:  (contratos ?? []).length,
    },
    proximosVencer,
    buckets,
    colocacionMensual,
    cobrosMensuales,
    cartPorEstatus,
    pagosRecientes: pagosRecientes ?? [],
    // Para KPIs extendidos (se pasa a getKPIsExtendidos si se necesita)
    _saldoPorContrato: saldoPorContrato,
    _contratos:        contratos ?? [],
    _tablaPendiente:   tablaPendiente ?? [],
  }
}

// ── KPIs extendidos (ICOR, rendimiento, flujo, vintage, ejecutivos) ──

export const getKPIsExtendidos = async (portafolio = null, baseData = null) => {
  const hoy     = new Date()
  const hoy30   = addDays(hoy, 30).toISOString().split('T')[0]
  const hoy60   = addDays(hoy, 60).toISOString().split('T')[0]
  const hoy90   = addDays(hoy, 90).toISOString().split('T')[0]
  const hoyStr  = hoy.toISOString().split('T')[0]
  const hace12  = subYears(hoy, 1).toISOString().split('T')[0]

  // IDs de contratos del portafolio activo (para filtrar tabla_amortizacion)
  let contratoIdsArr = null
  let creditoIdsArr  = null
  if (portafolio) {
    const [{ data: arr }, { data: crd }] = await Promise.all([
      supabase.from('contratos_arrendamiento').select('id').eq('portafolio', portafolio),
      supabase.from('contratos_credito').select('id').eq('portafolio', portafolio),
    ])
    contratoIdsArr = (arr ?? []).map(r => r.id)
    creditoIdsArr  = (crd ?? []).map(r => r.id)
  }

  // Queries paralelas
  const queries = [
    // Flujo proyectado próximos 90 días (pagos pendientes futuros)
    (() => {
      let q = supabase.from('tabla_amortizacion')
        .select('fecha_pago, total_pago, contrato_id, contrato_tipo')
        .in('estatus_pago', ['Pendiente', 'Parcial'])
        .gte('fecha_pago', hoyStr)
        .lte('fecha_pago', hoy90)
      return q
    })(),

    // Intereses cobrados últimos 12 meses (para rendimiento)
    (() => {
      let q = supabase.from('pagos')
        .select('aplicado_intereses, aplicado_capital, monto_recibido')
        .gte('fecha_pago', hace12)
      return q
    })(),

    // Contratos crédito para vintage + ejecutivo
    (() => {
      let q = supabase.from('contratos_credito')
        .select('id, fecha_inicio, estatus, monto_credito, created_by, portafolio, clientes(razon_social)')
        .in('estatus', ['Activo','En mora','Vencido','Liquidado'])
      if (portafolio) q = q.eq('portafolio', portafolio)
      return q
    })(),

    // Perfiles de usuarios (para nombres de ejecutivos)
    supabase.from('perfiles').select('id, nombre, rol').eq('activo', true),
  ]

  const [
    { data: flujoRows },
    { data: pagosHistorico },
    { data: contratosCrd },
    { data: perfiles },
  ] = await Promise.all(queries)

  // ── Flujo proyectado 30/60/90 días ──────────────────────────
  const filtrarPorPortafolio = (row) => {
    if (!portafolio) return true
    if (row.contrato_tipo === 'arrendamiento') return contratoIdsArr?.includes(row.contrato_id)
    return creditoIdsArr?.includes(row.contrato_id)
  }

  const flujoFiltrado = (flujoRows ?? []).filter(filtrarPorPortafolio)
  const flujo30 = flujoFiltrado.filter(r => r.fecha_pago <= hoy30).reduce((s, r) => s + r.total_pago, 0)
  const flujo60 = flujoFiltrado.filter(r => r.fecha_pago > hoy30 && r.fecha_pago <= hoy60).reduce((s, r) => s + r.total_pago, 0)
  const flujo90 = flujoFiltrado.filter(r => r.fecha_pago > hoy60 && r.fecha_pago <= hoy90).reduce((s, r) => s + r.total_pago, 0)

  // ── Rendimiento de cartera ────────────────────────────────────
  const interesesAnual = (pagosHistorico ?? []).reduce((s, p) => s + (p.aplicado_intereses ?? 0), 0)
  const carteraTotal   = baseData?.kpis?.carteraTotal ?? 1
  const rendimiento    = carteraTotal > 0 ? (interesesAnual / carteraTotal * 100) : 0

  // ── ICOR (reservas sugeridas / cartera vencida) ───────────────
  const buckets = baseData?.buckets ?? {}
  const reservas = (
    (buckets['1-30']  ?? []).reduce((s, e) => s + e.saldo * 0.03, 0) +
    (buckets['31-60'] ?? []).reduce((s, e) => s + e.saldo * 0.10, 0) +
    (buckets['61-90'] ?? []).reduce((s, e) => s + e.saldo * 0.25, 0) +
    (buckets['+90']   ?? []).reduce((s, e) => s + e.saldo * 0.50, 0)
  )
  const carteraVencida = baseData?.kpis?.carteraVencida ?? 0
  const icor = carteraVencida > 0 ? (reservas / carteraVencida * 100) : null

  // ── Concentración top-5 clientes ─────────────────────────────
  const saldoPorCliente = {}
  const contratosArr = baseData?._contratos ?? []
  const saldoPorContrato = baseData?._saldoPorContrato ?? {}
  for (const c of contratosArr) {
    const nombre = c.clientes?.razon_social ?? 'Sin nombre'
    saldoPorCliente[nombre] = (saldoPorCliente[nombre] ?? 0) + (saldoPorContrato[c.id] ?? 0)
  }
  // También agregar créditos
  for (const c of contratosCrd ?? []) {
    const nombre = c.clientes?.razon_social ?? 'Sin nombre'
    saldoPorCliente[nombre] = (saldoPorCliente[nombre] ?? 0) + (saldoPorContrato[c.id] ?? 0)
  }
  const top5 = Object.entries(saldoPorCliente)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([nombre, saldo]) => ({ nombre, saldo, pct: carteraTotal > 0 ? saldo / carteraTotal * 100 : 0 }))
  const concentracionTop5 = top5.reduce((s, c) => s + c.pct, 0)

  // ── Cosecha / Vintage (últimos 8 trimestres) ──────────────────
  const trimestres = Array.from({ length: 8 }, (_, i) => {
    const d = subMonths(hoy, (7 - i) * 3)
    const mes = format(d, 'yyyy-MM')
    const mesHasta = format(addDays(new Date(d.getFullYear(), d.getMonth() + 3, 1), -1), 'yyyy-MM')
    return { label: `T${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`, desde: mes, hasta: mesHasta }
  })

  const todosContratos = [
    ...contratosArr.map(c => ({ fecha: c.fecha_inicio, estatus: c.estatus, monto: c.valor_activo })),
    ...(contratosCrd ?? []).map(c => ({ fecha: c.fecha_inicio, estatus: c.estatus, monto: c.monto_credito })),
  ]

  const vintage = trimestres.map(({ label, desde, hasta }) => {
    const cohort = todosContratos.filter(c => c.fecha >= desde && c.fecha <= hasta)
    const total = cohort.length
    const mora  = cohort.filter(c => ['En mora','Vencido'].includes(c.estatus)).length
    return { label, total, mora, pctMora: total > 0 ? Math.round(mora / total * 100) : 0 }
  }).filter(v => v.total > 0)

  // ── Cartera por ejecutivo ─────────────────────────────────────
  const perfilesMap = Object.fromEntries((perfiles ?? []).map(p => [p.id, p.nombre]))

  const ejecutivoMap = {}
  for (const c of [...contratosArr, ...(contratosCrd ?? [])]) {
    const eid = c.created_by ?? 'sin_asignar'
    const nombre = perfilesMap[eid] ?? 'Sin asignar'
    if (!ejecutivoMap[eid]) ejecutivoMap[eid] = { nombre, contratos: 0, enMora: 0, saldo: 0 }
    ejecutivoMap[eid].contratos++
    if (c.estatus === 'En mora' || c.estatus === 'Vencido') ejecutivoMap[eid].enMora++
    ejecutivoMap[eid].saldo += saldoPorContrato[c.id] ?? 0
  }
  const carteraPorEjecutivo = Object.values(ejecutivoMap).sort((a, b) => b.saldo - a.saldo)

  return {
    flujoProyectado: { d30: flujo30, d60: flujo60, d90: flujo90 },
    rendimiento,
    reservas,
    icor,
    concentracionTop5,
    top5Clientes: top5,
    vintage,
    carteraPorEjecutivo,
  }
}
