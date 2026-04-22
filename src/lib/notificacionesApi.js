import { supabase } from './supabase'

export const getNotificaciones = async () => {
  const hoy   = new Date().toISOString().split('T')[0]
  const en7   = new Date(); en7.setDate(en7.getDate() + 7)
  const en7s  = en7.toISOString().split('T')[0]
  const hace1y = new Date(); hace1y.setFullYear(hace1y.getFullYear() - 1)
  const hace1yS = hace1y.toISOString().split('T')[0]

  const [
    { data: pagosVencidos },
    { data: fondeosPorVencer },
    { data: alertasPLD },
    { data: expedientes },
  ] = await Promise.all([
    supabase.from('tabla_amortizacion')
      .select('id, contrato_id, fecha_pago, total_pago, contrato_tipo')
      .eq('estatus_pago', 'Atrasado')
      .order('fecha_pago')
      .limit(20),
    supabase.from('tabla_amortizacion_fondeo')
      .select('id, fondeo_id, fecha_pago, total_pago')
      .eq('estatus_pago', 'Pendiente')
      .lte('fecha_pago', en7s)
      .gte('fecha_pago', hoy)
      .order('fecha_pago')
      .limit(10),
    supabase.from('pld_alertas')
      .select('id, tipo, cliente_nombre, monto, created_at')
      .eq('estatus', 'Pendiente')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('clientes')
      .select('id, nombre_razon_social, fecha_actualizacion_expediente')
      .lt('fecha_actualizacion_expediente', hace1yS)
      .limit(10),
  ])

  const notifs = []

  for (const p of pagosVencidos ?? []) {
    notifs.push({
      id:       `pago-${p.id}`,
      tipo:     'pago_vencido',
      titulo:   'Pago vencido',
      detalle:  `Contrato · ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(p.total_pago)}`,
      fecha:    p.fecha_pago,
      severity: 'danger',
      link:     p.contrato_tipo === 'credito' ? `/contratos/credito/${p.contrato_id}` : `/contratos/${p.contrato_id}`,
    })
  }

  for (const f of fondeosPorVencer ?? []) {
    notifs.push({
      id:       `fondeo-${f.id}`,
      tipo:     'pago_fondeo',
      titulo:   'Pago de fondeo próximo',
      detalle:  `Vence ${f.fecha_pago} · ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(f.total_pago)}`,
      fecha:    f.fecha_pago,
      severity: 'warning',
      link:     '/fondeo',
    })
  }

  for (const a of alertasPLD ?? []) {
    notifs.push({
      id:       `pld-${a.id}`,
      tipo:     'alerta_pld',
      titulo:   `Alerta PLD ${a.tipo}`,
      detalle:  `${a.cliente_nombre} · ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(a.monto ?? 0)}`,
      fecha:    a.created_at?.split('T')[0],
      severity: 'danger',
      link:     '/pld',
    })
  }

  for (const e of expedientes ?? []) {
    notifs.push({
      id:       `exp-${e.id}`,
      tipo:     'expediente_vencido',
      titulo:   'Expediente vencido (+12 meses)',
      detalle:  e.nombre_razon_social,
      fecha:    e.fecha_actualizacion_expediente,
      severity: 'warning',
      link:     `/clientes/${e.id}`,
    })
  }

  notifs.sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  return notifs
}
