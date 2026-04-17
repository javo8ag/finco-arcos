import { supabase } from './supabase'
import { createContratoArrendamiento, createContratoCredito } from './contratosApi'
import { calcularRentaMensual } from '../utils/amortizacion'

// ── Columnas de plantilla ──────────────────────────────────────

export const COLS_ARR = [
  'numero_contrato', 'portafolio', 'razon_social', 'rfc', 'tipo_persona',
  'email', 'telefono', 'fecha_inicio', 'valor_activo', 'enganche',
  'valor_residual', 'plazo_meses', 'tasa_ordinaria', 'tasa_moratoria',
  'dias_gracia', 'marca', 'modelo', 'anio', 'niv', 'placas',
  'gps_mensual', 'seguro_mensual', 'gastos_admin', 'cargo_seguridad',
  'pagos_realizados',
]

export const COLS_CRD = [
  'numero_contrato', 'portafolio', 'razon_social', 'rfc', 'tipo_persona',
  'email', 'telefono', 'fecha_inicio', 'monto_credito', 'enganche',
  'plazo_meses', 'tasa_ordinaria', 'tasa_moratoria', 'dias_gracia',
  'metodo_amortizacion', 'proposito', 'pagos_realizados',
]

const EJEMPLO_ARR = [
  ['ARR-2024-0001', 'Monarca Capital', 'Transportes del Norte SA de CV',
   'TRAN890101ABC', 'PM', 'contacto@transportes.com', '8112345678',
   '2024-01-15', '450000', '45000', '22500', '36', '18', '36', '3',
   'Toyota', 'Hilux 4x4', '2024', '3VWFE21C04M000001', 'NLE-123-B',
   '500', '1200', '0', '0', '12'],
  ['ARR-2024-0002', '', 'Juan García López',
   'GALJ850610HDF', 'PFAE', 'juan@ejemplo.com', '5512345678',
   '2024-03-01', '280000', '0', '14000', '24', '20', '40', '0',
   'Nissan', 'NP300 Frontier', '2023', '', 'ABC-456-A',
   '0', '800', '0', '0', '6'],
]

const EJEMPLO_CRD = [
  ['CRD-2024-0001', '', 'Constructora Omega SA de CV',
   'COOM910515ABC', 'PM', 'finanzas@omega.com', '3312345678',
   '2024-02-01', '500000', '0', '24', '24', '48', '3',
   'frances', 'Capital de trabajo', '8'],
  ['CRD-2024-0002', 'Monarca Capital', 'María López Hernández',
   'LOHM780920MDF', 'PFAE', 'maria@ejemplo.com', '5598765432',
   '2024-04-01', '150000', '0', '12', '22', '44', '0',
   'aleman', 'Compra de maquinaria', '3'],
]

const toCsv = (cols, rows) =>
  [cols.join(','), ...rows.map(r => r.join(','))].join('\r\n')

export const plantillaArrendamiento = () => toCsv(COLS_ARR, EJEMPLO_ARR)
export const plantillaCredito = () => toCsv(COLS_CRD, EJEMPLO_CRD)

// ── Validación por fila ────────────────────────────────────────

export const validarArrendamiento = (row) => {
  const errs = []
  if (!row.numero_contrato?.trim()) errs.push('Falta numero_contrato')
  if (!row.razon_social?.trim())    errs.push('Falta razon_social')
  if (!row.rfc?.trim() || row.rfc.trim().length < 12)
    errs.push('RFC inválido (mín 12 caracteres)')
  if (!['PFAE', 'PM'].includes(row.tipo_persona?.trim()))
    errs.push("tipo_persona debe ser 'PFAE' o 'PM'")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.fecha_inicio?.trim()))
    errs.push('fecha_inicio debe ser YYYY-MM-DD')
  if (isNaN(Number(row.valor_activo)) || Number(row.valor_activo) <= 0)
    errs.push('valor_activo debe ser número positivo')
  if (isNaN(Number(row.plazo_meses)) || Number(row.plazo_meses) <= 0)
    errs.push('plazo_meses debe ser número positivo')
  if (isNaN(Number(row.tasa_ordinaria)) || Number(row.tasa_ordinaria) <= 0)
    errs.push('tasa_ordinaria debe ser número positivo')
  if (!row.marca?.trim())  errs.push('Falta marca')
  if (!row.modelo?.trim()) errs.push('Falta modelo')
  if (isNaN(Number(row.anio)) || Number(row.anio) < 2000)
    errs.push('anio inválido')
  const pagos = Number(row.pagos_realizados)
  if (isNaN(pagos) || pagos < 0)
    errs.push('pagos_realizados debe ser 0 o mayor')
  else if (pagos >= Number(row.plazo_meses))
    errs.push('pagos_realizados debe ser menor que plazo_meses')
  return errs
}

export const validarCredito = (row) => {
  const errs = []
  if (!row.numero_contrato?.trim()) errs.push('Falta numero_contrato')
  if (!row.razon_social?.trim())    errs.push('Falta razon_social')
  if (!row.rfc?.trim() || row.rfc.trim().length < 12)
    errs.push('RFC inválido (mín 12 caracteres)')
  if (!['PFAE', 'PM'].includes(row.tipo_persona?.trim()))
    errs.push("tipo_persona debe ser 'PFAE' o 'PM'")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.fecha_inicio?.trim()))
    errs.push('fecha_inicio debe ser YYYY-MM-DD')
  if (isNaN(Number(row.monto_credito)) || Number(row.monto_credito) <= 0)
    errs.push('monto_credito debe ser número positivo')
  if (isNaN(Number(row.plazo_meses)) || Number(row.plazo_meses) <= 0)
    errs.push('plazo_meses debe ser número positivo')
  if (isNaN(Number(row.tasa_ordinaria)) || Number(row.tasa_ordinaria) <= 0)
    errs.push('tasa_ordinaria debe ser número positivo')
  if (!['frances', 'aleman'].includes(row.metodo_amortizacion?.trim()))
    errs.push("metodo_amortizacion debe ser 'frances' o 'aleman'")
  const pagos = Number(row.pagos_realizados)
  if (isNaN(pagos) || pagos < 0)
    errs.push('pagos_realizados debe ser 0 o mayor')
  else if (pagos >= Number(row.plazo_meses))
    errs.push('pagos_realizados debe ser menor que plazo_meses')
  return errs
}

// ── Helpers internos ───────────────────────────────────────────

async function upsertCliente(row) {
  const rfc = row.rfc.toUpperCase().trim()

  const { data: existing } = await supabase
    .from('clientes')
    .select('id')
    .eq('rfc', rfc)
    .maybeSingle()

  if (existing) return existing.id

  const { data: nuevo, error } = await supabase
    .from('clientes')
    .insert([{
      razon_social:         row.razon_social.trim(),
      rfc,
      tipo_persona:         row.tipo_persona?.trim() || 'PM',
      email:                row.email?.trim() || null,
      telefono:             row.telefono?.trim() || null,
      portafolio:           row.portafolio?.trim() || null,
      clasificacion_riesgo: 'B',
      limite_credito:       0,
      activo:               true,
    }])
    .select()
    .single()

  if (error) throw error
  return nuevo.id
}

async function marcarPagosRealizados(contratoId, contratoTipo, n) {
  if (!n || n <= 0) return

  const { data: filas } = await supabase
    .from('tabla_amortizacion')
    .select('id')
    .eq('contrato_id', contratoId)
    .eq('contrato_tipo', contratoTipo)
    .order('numero_pago')
    .limit(n)

  if (!filas?.length) return

  await supabase
    .from('tabla_amortizacion')
    .update({ estatus_pago: 'Pagado' })
    .in('id', filas.map(f => f.id))
}

function calcularFechaVencimiento(fechaInicio, plazoMeses) {
  const f = new Date(fechaInicio + 'T12:00:00')
  f.setMonth(f.getMonth() + Number(plazoMeses))
  return f.toISOString().split('T')[0]
}

// ── Importar fila arrendamiento ────────────────────────────────

export async function importarFilaArrendamiento(row, userId) {
  const clienteId = await upsertCliente(row)

  const va    = Number(row.valor_activo)
  const eng   = Number(row.enganche)   || 0
  const vr    = Number(row.valor_residual) || 0
  const plazo = Number(row.plazo_meses)
  const tasa  = Number(row.tasa_ordinaria)

  const contrato = {
    numero_contrato:  row.numero_contrato.trim(),
    cliente_id:       clienteId,
    portafolio:       row.portafolio?.trim() || null,
    marca:            row.marca?.trim(),
    modelo:           row.modelo?.trim(),
    anio:             Number(row.anio),
    niv:              row.niv?.trim() || null,
    placas:           row.placas?.trim() || null,
    valor_activo:     va,
    enganche:         eng,
    valor_residual:   vr,
    plazo_meses:      plazo,
    tasa_ordinaria:   tasa,
    tasa_moratoria:   Number(row.tasa_moratoria)  || 0,
    dias_gracia:      Number(row.dias_gracia)      || 0,
    gps_mensual:      Number(row.gps_mensual)      || 0,
    seguro_mensual:   Number(row.seguro_mensual)   || 0,
    gastos_admin:     Number(row.gastos_admin)     || 0,
    cargo_seguridad:  Number(row.cargo_seguridad)  || 0,
    fecha_inicio:     row.fecha_inicio.trim(),
    fecha_vencimiento: calcularFechaVencimiento(row.fecha_inicio, plazo),
    renta_mensual:    calcularRentaMensual(va, eng, vr, plazo, tasa),
  }

  const result = await createContratoArrendamiento(contrato, userId)
  await marcarPagosRealizados(result.id, 'arrendamiento', Number(row.pagos_realizados) || 0)
  return result
}

// ── Importar fila crédito ──────────────────────────────────────

export async function importarFilaCredito(row, userId) {
  const clienteId = await upsertCliente(row)

  const plazo = Number(row.plazo_meses)

  const contrato = {
    numero_contrato:     row.numero_contrato.trim(),
    cliente_id:          clienteId,
    portafolio:          row.portafolio?.trim() || null,
    proposito:           row.proposito?.trim() || 'Capital de trabajo',
    monto_credito:       Number(row.monto_credito),
    enganche:            Number(row.enganche)      || 0,
    plazo_meses:         plazo,
    tasa_ordinaria:      Number(row.tasa_ordinaria),
    tasa_moratoria:      Number(row.tasa_moratoria) || 0,
    dias_gracia:         Number(row.dias_gracia)    || 0,
    metodo_amortizacion: row.metodo_amortizacion?.trim() || 'frances',
    fecha_inicio:        row.fecha_inicio.trim(),
    fecha_vencimiento:   calcularFechaVencimiento(row.fecha_inicio, plazo),
  }

  const result = await createContratoCredito(contrato, userId)
  await marcarPagosRealizados(result.id, 'credito', Number(row.pagos_realizados) || 0)
  return result
}
