import { supabase } from './supabase'
import Papa from 'papaparse'

const round2 = (n) => Math.round(n * 100) / 100

// Normaliza headers: quita acentos, espacios → _, minúsculas
const normKey = (k) =>
  k.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

const parseNum = (v) =>
  parseFloat(String(v ?? '0').replace(/[$,\s]/g, '')) || 0

const parseDate = (v) =>
  v?.trim() ? v.trim().replace(/\//g, '-') : null

const diffDays = (a, b) => {
  if (!a || !b) return 0
  return Math.max(0, Math.round(
    (new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000
  ))
}

// ── Parser ────────────────────────────────────────────────────

export function parseCSVHistorial(csvText) {
  const { data, errors } = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: normKey,
  })
  if (errors.length && !data.length)
    throw new Error('No se pudo parsear el CSV. Verifica el formato.')
  return data
}

export function generarPlantillaHistorial() {
  const cols = 'numero_pago,fecha_pago,saldo,capital,interes,iva,total_a_pagar,pago,fecha_real_de_pago'
  const ej   = '1,2023-04-05,1255104.00,15420.50,25102.08,4016.33,44538.91,44538.91,2023-04-05'
  return cols + '\r\n' + ej
}

// ── Motor de cálculo ──────────────────────────────────────────

export function calcularHistorial(filasCSV, contrato) {
  const tasa   = parseFloat(contrato.tasa_moratoria ?? 0)
  const gracia = parseInt(contrato.dias_gracia      ?? 0)
  const hoy    = new Date().toISOString().split('T')[0]

  return filasCSV.map((row, idx) => {
    // Nombres de columna flexibles
    const numeroPago   = parseInt(
      row.numero_pago || row.no || row.num || row.periodo || String(idx + 1)
    )
    const fechaProg    = parseDate(row.fecha_pago || row.fecha_de_pago || row.fecha)
    const fechaReal    = parseDate(
      row.fecha_real_de_pago || row.fecha_real || row.fecha_pago_real || row.fecha_de_pago_real
    )
    const pagoRecibido = parseNum(row.pago || row.monto_pagado || row.pago_realizado)
    const capital      = parseNum(row.capital)
    const interes      = parseNum(row.interes || row.interes_ordinario || row.interes_ord)
    const iva          = parseNum(row.iva || row.iva_interes)
    const saldo        = parseNum(row.saldo || row.saldo_inicial || row.saldo_insoluto)

    const fueRealizado = pagoRecibido > 0

    // Moratorio por días de atraso sobre saldo (antes del pago)
    let diasAtraso = 0, moratorioBase = 0, ivaMoretorio = 0
    if (fueRealizado && fechaReal && fechaProg) {
      const diasBruto = diffDays(fechaReal, fechaProg)
      diasAtraso = Math.max(0, diasBruto - gracia)
      if (diasAtraso > 0 && tasa > 0) {
        moratorioBase = round2(saldo * (tasa / 100) / 365 * diasAtraso)
        ivaMoretorio  = round2(moratorioBase * 0.16)
      }
    }
    const moratorioTotal = round2(moratorioBase + ivaMoretorio)

    // Prelación: moratorio+IVA → interés+IVA → capital
    let restante     = pagoRecibido
    const appMora    = round2(Math.min(restante, moratorioTotal))
    restante         = round2(restante - appMora)
    const appInteres = round2(Math.min(restante, round2(interes + iva)))
    restante         = round2(restante - appInteres)
    const appCapital = round2(Math.min(restante, capital))
    restante         = round2(restante - appCapital)

    // Estatus resultante
    let estatus
    if (!fueRealizado) {
      estatus = fechaProg && fechaProg < hoy ? 'Atrasado' : 'Pendiente'
    } else if (appCapital >= capital - 0.01 && appMora >= moratorioTotal - 0.01) {
      estatus = 'Pagado'
    } else {
      estatus = 'Parcial'
    }

    return {
      numeroPago, fechaProgramada: fechaProg, fechaReal,
      saldo, capital, interes, iva,
      pagoRecibido, diasAtraso,
      moratorioBase, ivaMoretorio, moratorioTotal,
      appMora, appInteres, appCapital, sobrante: restante,
      estatus,
    }
  })
}

// ── Guardar en DB ─────────────────────────────────────────────

export async function confirmarHistorial(contratoId, contratoTipo, filasCalc) {
  const { data: tablaDB, error } = await supabase
    .from('tabla_amortizacion')
    .select('id, numero_pago')
    .eq('contrato_id', contratoId)
    .eq('contrato_tipo', contratoTipo)
    .order('numero_pago')
  if (error) throw error

  const mapByNum = Object.fromEntries((tablaDB ?? []).map(r => [r.numero_pago, r.id]))

  let actualizados = 0
  for (const f of filasCalc) {
    const dbId = mapByNum[f.numeroPago]
    if (!dbId) continue
    const { error: e } = await supabase.from('tabla_amortizacion').update({
      estatus_pago:      f.estatus,
      fecha_pago_real:   f.fechaReal  ?? null,
      moratorio_dias:    f.diasAtraso,
      moratorio_cobrado: f.moratorioBase,
      iva_moratorio:     f.ivaMoretorio,
      monto_pagado:      f.pagoRecibido,
    }).eq('id', dbId)
    if (!e) actualizados++
  }

  // Sincronizar estatus del contrato
  const hayMora = filasCalc.some(f => f.estatus === 'Atrasado' || f.estatus === 'Parcial')
  const tabla   = contratoTipo === 'credito' ? 'contratos_credito' : 'contratos_arrendamiento'
  await supabase.from(tabla)
    .update({ estatus: hayMora ? 'En mora' : 'Activo' })
    .eq('id', contratoId)

  return actualizados
}
