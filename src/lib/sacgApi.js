import { supabase } from './supabase'

// Días hábiles para resolución CONDUSEF: 30 hábiles ≈ 45 naturales
const DIAS_LIMITE = 45

const generarFolio = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `SACG-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
}

const calcularFechaLimite = (fechaRecepcion) => {
  const d = new Date(fechaRecepcion + 'T12:00:00')
  d.setDate(d.getDate() + DIAS_LIMITE)
  return d.toISOString().split('T')[0]
}

// ── CRUD ──────────────────────────────────────────────────────

export const getQuejas = async (filtros = {}) => {
  let q = supabase.from('sacg_quejas').select('*').order('fecha_recepcion', { ascending: false })
  if (filtros.estatus) q = q.eq('estatus', filtros.estatus)
  if (filtros.tipo)    q = q.eq('tipo', filtros.tipo)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const crearQueja = async (queja, userId) => {
  const fechaRecepcion = queja.fecha_recepcion || new Date().toISOString().split('T')[0]
  const { data, error } = await supabase.from('sacg_quejas').insert([{
    ...queja,
    folio:          generarFolio(),
    fecha_recepcion: fechaRecepcion,
    fecha_limite:   calcularFechaLimite(fechaRecepcion),
    creado_por:     userId,
  }]).select().single()
  if (error) throw error
  return data
}

export const actualizarQueja = async (id, cambios, userId) => {
  const { data, error } = await supabase.from('sacg_quejas')
    .update({ ...cambios, responsable: userId })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── Estadísticas ──────────────────────────────────────────────

export const getStatsQuejas = async () => {
  const { data } = await supabase.from('sacg_quejas').select('estatus, fecha_limite, tipo')
  const hoy = new Date().toISOString().split('T')[0]
  const q = data ?? []
  return {
    total:      q.length,
    abiertas:   q.filter(r => r.estatus !== 'Resuelta' && r.estatus !== 'Improcedente').length,
    vencidas:   q.filter(r => r.estatus !== 'Resuelta' && r.estatus !== 'Improcedente' && r.fecha_limite < hoy).length,
    resueltas:  q.filter(r => r.estatus === 'Resuelta').length,
  }
}

// ── Exportar REUNE ────────────────────────────────────────────
// Genera CSV con padrón de clientes en estructura compatible con REUNE

export const exportarREUNE = async () => {
  const [{ data: clientes }, { data: arrContratos }, { data: crdContratos }] = await Promise.all([
    supabase.from('clientes').select('*').eq('activo', true),
    supabase.from('contratos_arrendamiento').select('cliente_id, numero_contrato, valor_activo, fecha_inicio, fecha_vencimiento, estatus').in('estatus', ['Activo','En mora','Vencido','Liquidado']),
    supabase.from('contratos_credito').select('cliente_id, numero_contrato, monto_credito, fecha_inicio, fecha_vencimiento, estatus').in('estatus', ['Activo','En mora','Vencido','Liquidado']),
  ])

  // Mapa cliente_id → contratos
  const contratosPorCliente = {}
  for (const c of [...(arrContratos ?? []), ...(crdContratos ?? [])]) {
    if (!contratosPorCliente[c.cliente_id]) contratosPorCliente[c.cliente_id] = []
    contratosPorCliente[c.cliente_id].push(c)
  }

  const cols = [
    'RFC','CURP','Razon_Social','Tipo_Persona','Direccion_Fiscal',
    'Telefono','Email','Clasificacion_Riesgo','Numero_Contrato',
    'Tipo_Producto','Monto','Fecha_Inicio','Fecha_Vencimiento','Estatus_Producto',
  ]

  const rows = []
  for (const cl of clientes ?? []) {
    const contratos = contratosPorCliente[cl.id] ?? [null]
    for (const ct of contratos) {
      rows.push([
        cl.rfc ?? '',
        cl.curp ?? '',
        cl.razon_social ?? '',
        cl.tipo_persona ?? '',
        (cl.direccion_fiscal ?? '').replace(/,/g, ' '),
        cl.telefono ?? '',
        cl.email ?? '',
        cl.clasificacion_riesgo ?? '',
        ct?.numero_contrato ?? '',
        ct && 'monto_credito' in ct ? 'Credito' : ct ? 'Arrendamiento' : '',
        ct?.valor_activo ?? ct?.monto_credito ?? '',
        ct?.fecha_inicio ?? '',
        ct?.fecha_vencimiento ?? '',
        ct?.estatus ?? '',
      ])
    }
  }

  const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `REUNE_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}
