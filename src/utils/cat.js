/**
 * Cálculo del CAT (Costo Anual Total) — BANXICO
 * Método: bisección para encontrar la TIR mensual de los flujos,
 * luego se anualiza: CAT = (1 + r_mensual)^12 - 1
 *
 * @param {number} capitalInicial  Monto neto recibido (valor_activo - enganche)
 * @param {number[]} flujos        Array de pagos totales mensuales (total_pago de tabla_amortizacion)
 * @returns {number} CAT en porcentaje (ej. 28.4 = 28.4%)
 */
export function calcularCAT(capitalInicial, flujos) {
  if (!capitalInicial || capitalInicial <= 0 || !flujos?.length) return null

  const npv = (r) => {
    let v = -capitalInicial
    for (let t = 0; t < flujos.length; t++) {
      v += flujos[t] / Math.pow(1 + r, t + 1)
    }
    return v
  }

  // Bisección entre 0.01% y 1000% mensual
  let lo = 0.0001, hi = 10
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2
    if (npv(mid) > 0) lo = mid
    else hi = mid
    if (hi - lo < 1e-9) break
  }

  const rMensual = (lo + hi) / 2
  return (Math.pow(1 + rMensual, 12) - 1) * 100
}

/**
 * CAT simplificado cuando no hay tabla de amortización disponible.
 * Aproximación: tasa_anual + IVA sobre intereses (16%) + cargos anualizados.
 * Útil solo para estimación rápida.
 */
export function calcularCATSimplificado(tasaOrdinaria, cargosAnuales, capital) {
  if (!tasaOrdinaria) return null
  const interesConIVA = (tasaOrdinaria / 100) * 1.16
  const cargos = capital > 0 ? (cargosAnuales / capital) : 0
  return (interesConIVA + cargos) * 100
}
