// Formatos estándar para México

export const formatCurrency = (amount) => {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr + 'T12:00:00')
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(date)
}

export const formatDateLong = (dateStr) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr + 'T12:00:00')
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(date)
}

export const formatPercent = (value) => {
  if (value == null) return '0.00%'
  return `${Number(value).toFixed(2)}%`
}

export const formatRFC = (rfc) => {
  if (!rfc) return '—'
  return rfc.toUpperCase()
}

// Valida RFC mexicano básico (persona física y moral)
export const validarRFC = (rfc) => {
  if (!rfc) return false
  const rfcPF = /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/
  const rfcPM = /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/
  return rfcPF.test(rfc.toUpperCase()) || rfcPM.test(rfc.toUpperCase())
}

export const estatusColor = (estatus) => {
  const map = {
    'Activo':     'badge-success',
    'En mora':    'badge-warning',
    'Vencido':    'badge-danger',
    'Liquidado':  'badge-info',
    'Cancelado':  'badge-gray',
  }
  return map[estatus] || 'badge-gray'
}

export const diasAtrasoColor = (dias) => {
  if (!dias || dias <= 0) return 'badge-success'
  if (dias <= 30)  return 'badge-warning'
  if (dias <= 60)  return 'badge-danger'
  return 'badge-danger'
}
