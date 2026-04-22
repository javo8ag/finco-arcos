import { supabase } from './supabase'

export const getActivos = async (portafolio = null) => {
  let q = supabase.from('activos_finco').select('*').order('created_at', { ascending: false })
  if (portafolio) q = q.eq('portafolio', portafolio)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const getActivoById = async (id) => {
  const { data, error } = await supabase.from('activos_finco').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const crearActivo = async (activo, userId) => {
  const { data, error } = await supabase
    .from('activos_finco').insert([{ ...activo, created_by: userId }]).select().single()
  if (error) throw error
  return data
}

export const actualizarActivo = async (id, cambios) => {
  const { data, error } = await supabase
    .from('activos_finco').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const getContratoDeActivo = async (activoId) => {
  const { data } = await supabase
    .from('contratos_arrendamiento')
    .select('id, numero_contrato, estatus, cliente_id')
    .eq('activo_id', activoId)
    .in('estatus', ['Activo', 'En mora'])
    .maybeSingle()
  return data
}

export const calcularDepreciacion = (activo) => {
  const hoy = new Date()
  const inicio = new Date(activo.fecha_adquisicion + 'T12:00:00')
  const mesesTranscurridos = Math.max(0,
    (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth())
  )
  const aniosTranscurridos = mesesTranscurridos / 12

  const fiscalAnual   = activo.costo_adquisicion * (activo.tasa_deprec_fiscal ?? 0.25)
  const contableAnual = activo.costo_adquisicion * (activo.tasa_deprec_contable ?? 0.20)

  const deprecFiscalAcum   = Math.min(activo.costo_adquisicion, fiscalAnual   * aniosTranscurridos)
  const deprecContableAcum = Math.min(activo.costo_adquisicion, contableAnual * aniosTranscurridos)

  const vidaUtilFiscal   = activo.tasa_deprec_fiscal   > 0 ? Math.ceil(1 / activo.tasa_deprec_fiscal)   : 0
  const vidaUtilContable = activo.tasa_deprec_contable > 0 ? Math.ceil(1 / activo.tasa_deprec_contable) : 0

  return {
    mesesTranscurridos,
    aniosTranscurridos: +aniosTranscurridos.toFixed(2),
    deprecFiscalAnual:   +fiscalAnual.toFixed(2),
    deprecContableAnual: +contableAnual.toFixed(2),
    deprecFiscalAcum:    +deprecFiscalAcum.toFixed(2),
    deprecContableAcum:  +deprecContableAcum.toFixed(2),
    valorLibrosFiscal:   +(activo.costo_adquisicion - deprecFiscalAcum).toFixed(2),
    valorLibrosContable: +(activo.costo_adquisicion - deprecContableAcum).toFixed(2),
    pctDeprecFiscal:     +(deprecFiscalAcum   / activo.costo_adquisicion * 100).toFixed(1),
    pctDeprecContable:   +(deprecContableAcum / activo.costo_adquisicion * 100).toFixed(1),
    vidaUtilFiscal,
    vidaUtilContable,
    totalmenteDepreciadoFiscal:   deprecFiscalAcum   >= activo.costo_adquisicion,
    totalmenteDepreciadoContable: deprecContableAcum >= activo.costo_adquisicion,
  }
}

export const getStatsActivos = async (portafolio = null) => {
  const activos = await getActivos(portafolio)
  const stats = { total: activos.length, disponibles: 0, enArrendamiento: 0, enRecuperacion: 0, dadosDeBaja: 0,
    costoTotal: 0, valorLibrosContable: 0, deprecAcum: 0 }
  for (const a of activos) {
    if (a.estatus === 'disponible')        stats.disponibles++
    if (a.estatus === 'en_arrendamiento')  stats.enArrendamiento++
    if (a.estatus === 'en_recuperacion')   stats.enRecuperacion++
    if (a.estatus === 'dado_de_baja')      stats.dadosDeBaja++
    stats.costoTotal += a.costo_adquisicion ?? 0
    const d = calcularDepreciacion(a)
    stats.valorLibrosContable += d.valorLibrosContable
    stats.deprecAcum          += d.deprecContableAcum
  }
  return { ...stats, activos }
}
