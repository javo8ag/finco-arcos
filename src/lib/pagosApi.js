import { supabase } from './supabase'

// ── Sincronización automática de moratorios ────────────────────
// Llama la función SQL que actualiza estatus de contratos y pagos
export const sincronizarMoratorios = async () => {
  const { data, error } = await supabase.rpc('sincronizar_moratorios')
  if (error) console.warn('sincronizar_moratorios:', error.message)
  return data
}

// Vista de moratorios activos por contrato
export const getMoratoriosActivos = async () => {
  const { data, error } = await supabase
    .from('moratorios_activos')
    .select('*')
    .gt('moratorio_con_iva', 0)
    .order('max_dias_atraso', { ascending: false })
  if (error) throw error
  return data ?? []
}

// Historial de moratorios condonados / registrados
export const getHistorialMoratorios = async (contratoId, contratoTipo) => {
  let q = supabase
    .from('moratorios')
    .select('*')
    .order('created_at', { ascending: false })
  if (contratoId)   q = q.eq('contrato_id', contratoId)
  if (contratoTipo) q = q.eq('contrato_tipo', contratoTipo)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

// Condonar moratorio (requiere motivo, deja auditoría)
export const condonarMoratorio = async (moratorioId, motivo, userId) => {
  const { error } = await supabase
    .from('moratorios')
    .update({ condonado: true, condonado_por: userId, motivo_condonacion: motivo })
    .eq('id', moratorioId)
  if (error) throw error
}

// ── Consultas ──────────────────────────────────────────────────

export const getPagos = async ({ contratoId, contratoTipo, limit = 50 } = {}) => {
  let query = supabase
    .from('pagos')
    .select(`*, clientes(razon_social)`)
    .order('fecha_pago', { ascending: false })
    .limit(limit)

  if (contratoId)   query = query.eq('contrato_id', contratoId)
  if (contratoTipo) query = query.eq('contrato_tipo', contratoTipo)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getPagosPendientes = async () => {
  // Contratos arrendamiento con pagos pendientes/atrasados
  const { data, error } = await supabase
    .from('tabla_amortizacion')
    .select(`
      contrato_id, contrato_tipo, numero_pago, fecha_pago, total_pago,
      saldo_insoluto, estatus_pago,
      contratos_arrendamiento!inner(
        numero_contrato, tasa_moratoria, dias_gracia, estatus,
        clientes(razon_social, rfc)
      )
    `)
    .eq('estatus_pago', 'Pendiente')
    .lte('fecha_pago', new Date().toISOString().split('T')[0])
    .order('fecha_pago')
    .limit(100)

  if (error) throw error
  return data ?? []
}

// ── Aplicar prelación y registrar pago ─────────────────────────

export const registrarPago = async ({
  contratoId, contratoTipo, clienteId,
  fechaPago, montoRecibido, formaPago, referencia, notas,
  userId,
  // prelación calculada en frontend
  aplicadoMoratorios, aplicadoIntereses, aplicadoCargos, aplicadoCapital,
  tipoPago,
  // filas de amortización a actualizar
  filasActualizar,
  // moratorio a registrar (si aplica)
  moratorio,
}) => {
  // 1. Insertar el pago
  const { data: pago, error: errPago } = await supabase
    .from('pagos')
    .insert([{
      contrato_tipo:       contratoTipo,
      contrato_id:         contratoId,
      cliente_id:          clienteId,
      fecha_pago:          fechaPago,
      monto_recibido:      montoRecibido,
      aplicado_moratorios: aplicadoMoratorios,
      aplicado_intereses:  aplicadoIntereses,
      aplicado_cargos:     aplicadoCargos,
      aplicado_capital:    aplicadoCapital,
      tipo_pago:           tipoPago,
      forma_pago:          formaPago,
      referencia,
      notas,
      registrado_por:      userId,
    }])
    .select()
    .single()

  if (errPago) throw errPago

  // 2. Actualizar estatus de filas de amortización
  for (const fila of filasActualizar) {
    const { error } = await supabase
      .from('tabla_amortizacion')
      .update({ estatus_pago: fila.estatus_pago })
      .eq('id', fila.id)
    if (error) throw error
  }

  // 3. Registrar moratorio si aplica
  if (moratorio && moratorio.monto_moratorio > 0) {
    await supabase.from('moratorios').insert([{
      contrato_tipo:   contratoTipo,
      contrato_id:     contratoId,
      fecha_calculo:   fechaPago,
      dias_atraso:     moratorio.dias_atraso,
      saldo_vencido:   moratorio.saldo_vencido,
      tasa_diaria:     moratorio.tasa_diaria,
      monto_moratorio: moratorio.monto_moratorio,
      iva_moratorio:   moratorio.iva_moratorio,
      total_moratorio: moratorio.total_moratorio,
    }])
  }

  return pago
}

// ── Estado de cuenta ───────────────────────────────────────────

export const getEstadoCuenta = async (contratoId, contratoTipo) => {
  const [{ data: tabla }, { data: pagos }] = await Promise.all([
    supabase
      .from('tabla_amortizacion')
      .select('*')
      .eq('contrato_id', contratoId)
      .eq('contrato_tipo', contratoTipo)
      .order('numero_pago'),
    supabase
      .from('pagos')
      .select('*')
      .eq('contrato_id', contratoId)
      .eq('contrato_tipo', contratoTipo)
      .order('fecha_pago'),
  ])

  return { tabla: tabla ?? [], pagos: pagos ?? [] }
}
