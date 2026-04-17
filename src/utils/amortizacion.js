// Motor de cálculo de amortización — Finco Arcos
// Aplica para arrendamiento financiero (método francés con valor residual)

const IVA = 0.16

/**
 * Calcula la renta mensual para arrendamiento financiero
 * @param {number} valorActivo - Valor del bien
 * @param {number} enganche    - Enganche / renta anticipada
 * @param {number} valorResidual - Opción de compra al final
 * @param {number} plazoMeses
 * @param {number} tasaAnual  - Tasa ordinaria anual (%) ej. 18.5
 */
export const calcularRentaMensual = (valorActivo, enganche, valorResidual, plazoMeses, tasaAnual) => {
  const monto = valorActivo - enganche
  const i = tasaAnual / 100 / 12
  const n = plazoMeses
  const vr = valorResidual || 0

  if (i === 0) return (monto - vr) / n

  // PMT con valor residual (balloon)
  const factor = Math.pow(1 + i, n)
  const pmt = (monto * i * factor - vr * i) / (factor - 1)
  return Math.round(pmt * 100) / 100
}

/**
 * Genera la tabla de amortización completa
 * @param {object} contrato - datos del contrato
 * @returns {Array} filas de amortización
 */
export const generarTablaAmortizacion = (contrato) => {
  const {
    valor_activo, enganche = 0, valor_residual = 0,
    plazo_meses, tasa_ordinaria, fecha_inicio,
    gps_mensual = 0, seguro_mensual = 0,
    gastos_admin = 0, cargo_seguridad = 0,
  } = contrato

  const i = tasa_ordinaria / 100 / 12
  const cargosAdicionales = Number(gps_mensual) + Number(seguro_mensual) +
                            Number(gastos_admin) + Number(cargo_seguridad)

  const renta = calcularRentaMensual(
    Number(valor_activo), Number(enganche),
    Number(valor_residual), Number(plazo_meses), Number(tasa_ordinaria)
  )

  let saldo = Number(valor_activo) - Number(enganche)
  const tabla = []
  const inicio = new Date(fecha_inicio + 'T12:00:00')

  for (let n = 1; n <= plazo_meses; n++) {
    const fechaPago = new Date(inicio)
    fechaPago.setMonth(inicio.getMonth() + n)

    const interes = round2(saldo * i)
    const ivaInteres = round2(interes * IVA)

    let capital
    if (n === plazo_meses) {
      // Último pago: liquida saldo exacto
      capital = round2(saldo)
    } else {
      capital = round2(renta - interes)
    }

    const totalPago = round2(capital + interes + ivaInteres + cargosAdicionales)
    saldo = round2(saldo - capital)

    tabla.push({
      numero_pago:        n,
      fecha_pago:         fechaPago.toISOString().split('T')[0],
      capital:            capital,
      interes_ordinario:  interes,
      iva_interes:        ivaInteres,
      cargos_adicionales: round2(cargosAdicionales),
      total_pago:         totalPago,
      saldo_insoluto:     Math.max(0, saldo),
      estatus_pago:       'Pendiente',
    })
  }

  return tabla
}

/**
 * Genera tabla de amortización para crédito simple (método francés o alemán)
 */
export const generarTablaCredito = (contrato) => {
  const {
    monto_credito, enganche = 0, plazo_meses,
    tasa_ordinaria, fecha_inicio,
    metodo_amortizacion = 'frances',
  } = contrato

  const capital_financiado = Number(monto_credito) - Number(enganche)
  const i = tasa_ordinaria / 100 / 12
  const n = plazo_meses
  const inicio = new Date(fecha_inicio + 'T12:00:00')

  let saldo = capital_financiado
  const tabla = []

  // Pago fijo francés
  const rentaFrancesa = i === 0
    ? capital_financiado / n
    : round2(capital_financiado * i * Math.pow(1 + i, n) / (Math.pow(1 + i, n) - 1))

  for (let k = 1; k <= n; k++) {
    const fechaPago = new Date(inicio)
    fechaPago.setMonth(inicio.getMonth() + k)

    const interes   = round2(saldo * i)
    const ivaInteres = round2(interes * IVA)

    let capitalPago
    if (metodo_amortizacion === 'aleman') {
      capitalPago = round2(capital_financiado / n)
    } else {
      capitalPago = k === n ? round2(saldo) : round2(rentaFrancesa - interes)
    }

    const totalPago = round2(capitalPago + interes + ivaInteres)
    saldo = round2(saldo - capitalPago)

    tabla.push({
      numero_pago:        k,
      fecha_pago:         fechaPago.toISOString().split('T')[0],
      capital:            capitalPago,
      interes_ordinario:  interes,
      iva_interes:        ivaInteres,
      cargos_adicionales: 0,
      total_pago:         totalPago,
      saldo_insoluto:     Math.max(0, saldo),
      estatus_pago:       'Pendiente',
    })
  }

  return tabla
}

// Calcula días de atraso entre fecha_pago y hoy
export const calcularDiasAtraso = (fechaPago) => {
  const hoy  = new Date()
  const pago = new Date(fechaPago + 'T12:00:00')
  const diff = Math.floor((hoy - pago) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

// Calcula moratorio
export const calcularMoratorio = (saldoVencido, tasaOrdinaria, diasAtraso) => {
  const tasaMoratoria = Math.min(tasaOrdinaria * 2, tasaOrdinaria * 2) // máx 2x ordinaria
  const tasaDiaria = tasaMoratoria / 100 / 365
  const moratorio  = round2(saldoVencido * tasaDiaria * diasAtraso)
  const iva        = round2(moratorio * IVA)
  return { moratorio, iva, total: round2(moratorio + iva) }
}

const round2 = (n) => Math.round(n * 100) / 100
