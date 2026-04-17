// Cálculo de prelación de pagos — Finco Arcos
// Orden: 1) Moratorios  2) Intereses + IVA  3) Cargos  4) Capital

const IVA = 0.16

/**
 * Calcula cuánto moratorio se ha generado en una fila vencida
 */
export const calcularMoratorioFila = (fila, tasaMoratoria) => {
  const hoy  = new Date()
  const venc = new Date(fila.fecha_pago + 'T12:00:00')
  if (hoy <= venc) return { dias: 0, monto: 0, iva: 0, total: 0 }

  const dias        = Math.floor((hoy - venc) / 86400000)
  const tasaDiaria  = tasaMoratoria / 100 / 365
  const saldoVencido = fila.capital + fila.interes_ordinario  // base: capital + interés del período
  const monto       = round2(saldoVencido * tasaDiaria * dias)
  const iva         = round2(monto * IVA)

  return {
    dias,
    saldo_vencido:   saldoVencido,
    tasa_diaria:     tasaDiaria,
    monto_moratorio: monto,
    iva_moratorio:   iva,
    total_moratorio: round2(monto + iva),
  }
}

/**
 * Aplica prelación sobre un monto recibido contra filas pendientes
 * @param {number}   montoRecibido
 * @param {Array}    filasPendientes  - tabla_amortizacion ordenada por numero_pago ASC
 * @param {number}   tasaMoratoria    - tasa moratoria anual %
 * @returns {object} resumen de prelación y filas a actualizar
 */
export const aplicarPrelacion = (montoRecibido, filasPendientes, tasaMoratoria) => {
  let restante = montoRecibido

  let totalMoratorios = 0
  let totalIntereses   = 0
  let totalCargos      = 0
  let totalCapital     = 0

  const moratoriosPorFila = []
  const filasActualizar   = []

  // Paso 1: calcular moratorios de todas las filas vencidas
  for (const fila of filasPendientes) {
    const m = calcularMoratorioFila(fila, tasaMoratoria)
    moratoriosPorFila.push(m)
    totalMoratorios += m.total_moratorio
  }

  // Paso 2: aplicar prelación fila por fila (oldest first)
  for (let i = 0; i < filasPendientes.length; i++) {
    if (restante <= 0) break
    const fila = filasPendientes[i]
    const mor  = moratoriosPorFila[i]

    // 1. Moratorios de esta fila
    if (mor.total_moratorio > 0 && restante > 0) {
      const aplicado = Math.min(restante, mor.total_moratorio)
      restante -= aplicado
    }

    // 2. Intereses ordinarios + IVA
    const interesTotal = round2(fila.interes_ordinario + fila.iva_interes)
    if (restante >= interesTotal) {
      totalIntereses += interesTotal
      restante -= interesTotal
    } else if (restante > 0) {
      totalIntereses += restante
      restante = 0
      filasActualizar.push({ id: fila.id, estatus_pago: 'Parcial' })
      continue
    }

    // 3. Cargos adicionales
    if (fila.cargos_adicionales > 0 && restante > 0) {
      const aplicado = Math.min(restante, fila.cargos_adicionales)
      totalCargos += aplicado
      restante -= aplicado
    }

    // 4. Capital
    if (restante >= fila.capital) {
      totalCapital += fila.capital
      restante -= fila.capital
      filasActualizar.push({ id: fila.id, estatus_pago: 'Pagado' })
    } else if (restante > 0) {
      totalCapital += restante
      restante = 0
      filasActualizar.push({ id: fila.id, estatus_pago: 'Parcial' })
    } else {
      filasActualizar.push({ id: fila.id, estatus_pago: 'Parcial' })
    }
  }

  // Tipo de pago
  const pagosTotalesRequeridos = filasPendientes.length
  const pagosLiquidados = filasActualizar.filter(f => f.estatus_pago === 'Pagado').length
  const tipoPago =
    pagosLiquidados === 0            ? 'Parcial'
    : pagosLiquidados > 1            ? 'Anticipado'
    : montoRecibido < filasPendientes[0]?.total_pago ? 'Parcial'
    : 'Normal'

  // Moratorio del primer período vencido (para registrar)
  const primerMoratorio = moratoriosPorFila.find(m => m.total_moratorio > 0) ?? null

  return {
    aplicado_moratorios: round2(totalMoratorios),
    aplicado_intereses:  round2(totalIntereses),
    aplicado_cargos:     round2(totalCargos),
    aplicado_capital:    round2(totalCapital),
    restante:            round2(restante),
    tipo_pago:           tipoPago,
    filasActualizar,
    moratorio:           primerMoratorio ? {
      ...primerMoratorio,
      dias_atraso:     primerMoratorio.dias,
    } : null,
    totalMoratorios:     round2(totalMoratorios),
  }
}

const round2 = n => Math.round(n * 100) / 100
