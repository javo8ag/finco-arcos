import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Colores Finco Arcos ────────────────────────────────────────
const AZUL   = [45, 67, 208]   // #2d43d0
const NARANJA= [255, 121, 0]   // #ff7900
const MARINO = [2, 16, 108]    // #02106c
const GRIS   = [96, 96, 96]    // #606060
const GRIS_L = [237, 236, 238] // #edecee

// ── Helpers ────────────────────────────────────────────────────
const fmtMXN = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

const fmtFecha = (d) => {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Mexico_City',
  })
}

const fmtFechaLarga = (d) => {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City',
  })
}

// ── Encabezado membretado ──────────────────────────────────────
function dibujarHeader(doc, titulo, subtitulo = '') {
  const W = doc.internal.pageSize.getWidth()

  // Banda superior azul marino
  doc.setFillColor(...MARINO)
  doc.rect(0, 0, W, 22, 'F')

  // Logo FINCO ARCOS
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FINCO', 14, 14)

  const fincoW = doc.getTextWidth('FINCO')
  doc.setTextColor(...NARANJA)
  doc.text(' ARCOS', 14 + fincoW, 14)

  // Subtítulo en banda
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 210, 255)
  doc.text('Plataforma de Administración de Créditos', 14, 19)

  // Fecha en esquina derecha
  const hoy = new Date().toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Mexico_City',
  })
  doc.setTextColor(200, 210, 255)
  doc.text(`Fecha: ${hoy}`, W - 14, 14, { align: 'right' })

  // Línea naranja decorativa
  doc.setFillColor(...NARANJA)
  doc.rect(0, 22, W, 1.5, 'F')

  // Título del documento
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MARINO)
  doc.text(titulo, 14, 34)

  if (subtitulo) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(subtitulo, 14, 40)
  }

  return subtitulo ? 46 : 40
}

// ── Pie de página ──────────────────────────────────────────────
function dibujarFooter(doc) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const pages = doc.internal.getNumberOfPages()

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFillColor(...MARINO)
    doc.rect(0, H - 12, W, 12, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 210, 255)
    doc.text('Finco Arcos S.A. de C.V. · Querétaro, México · director@pmhj.com.mx', 14, H - 4)
    doc.text(`Pág. ${i} / ${pages}`, W - 14, H - 4, { align: 'right' })
  }
}

// ── Caja de información ────────────────────────────────────────
function cajaInfo(doc, y, campos, columnas = 2) {
  const W   = doc.internal.pageSize.getWidth()
  const colW = (W - 28) / columnas
  let col = 0, fila = 0

  campos.forEach(({ label, value }) => {
    const x = 14 + col * colW
    const yPos = y + fila * 10

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(label, x, yPos)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(String(value ?? '—'), x, yPos + 4.5)

    col++
    if (col >= columnas) { col = 0; fila++ }
  })

  return y + Math.ceil(campos.length / columnas) * 10 + 4
}

// ══════════════════════════════════════════════════════════════
// 1. ESTADO DE CUENTA
// ══════════════════════════════════════════════════════════════
export const generarEstadoCuenta = (contrato, tabla, tipo = 'arrendamiento') => {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const W    = doc.internal.pageSize.getWidth()
  const cliente = contrato.clientes ?? {}
  const esArr   = tipo === 'arrendamiento'

  let y = dibujarHeader(
    doc,
    'Estado de Cuenta',
    `Contrato ${contrato.numero_contrato} · ${cliente.razon_social ?? ''}`
  )

  // ── Datos del cliente ──
  doc.setFillColor(...GRIS_L)
  doc.rect(14, y, W - 28, 6, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MARINO)
  doc.text('DATOS DEL CLIENTE', 16, y + 4.2)
  y += 8

  y = cajaInfo(doc, y, [
    { label: 'Razón Social / Nombre', value: cliente.razon_social },
    { label: 'RFC', value: cliente.rfc },
    { label: 'Tipo', value: cliente.tipo_persona },
    { label: 'Teléfono', value: cliente.telefono || '—' },
  ], 2)

  y += 3

  // ── Datos del contrato ──
  doc.setFillColor(...GRIS_L)
  doc.rect(14, y, W - 28, 6, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MARINO)
  doc.text('DATOS DEL CONTRATO', 16, y + 4.2)
  y += 8

  const camposContrato = esArr ? [
    { label: 'Número de Contrato', value: contrato.numero_contrato },
    { label: 'Bien Arrendado', value: `${contrato.marca} ${contrato.modelo} ${contrato.anio}` },
    { label: 'NIV', value: contrato.niv || '—' },
    { label: 'Valor del Activo', value: fmtMXN(contrato.valor_activo) },
    { label: 'Enganche', value: fmtMXN(contrato.enganche) },
    { label: 'Valor Residual', value: fmtMXN(contrato.valor_residual) },
    { label: 'Tasa Ordinaria Anual', value: `${contrato.tasa_ordinaria}%` },
    { label: 'Plazo', value: `${contrato.plazo_meses} meses` },
    { label: 'Renta Mensual', value: fmtMXN(contrato.renta_mensual) },
    { label: 'Fecha de Inicio', value: fmtFecha(contrato.fecha_inicio) },
    { label: 'Fecha de Vencimiento', value: fmtFecha(contrato.fecha_vencimiento) },
    { label: 'Estatus', value: contrato.estatus },
  ] : [
    { label: 'Número de Contrato', value: contrato.numero_contrato },
    { label: 'Propósito', value: contrato.proposito },
    { label: 'Monto del Crédito', value: fmtMXN(contrato.monto_credito) },
    { label: 'Método', value: contrato.metodo_amortizacion === 'frances' ? 'Francés' : 'Alemán' },
    { label: 'Tasa Ordinaria Anual', value: `${contrato.tasa_ordinaria}%` },
    { label: 'Plazo', value: `${contrato.plazo_meses} meses` },
    { label: 'Fecha de Inicio', value: fmtFecha(contrato.fecha_inicio) },
    { label: 'Fecha de Vencimiento', value: fmtFecha(contrato.fecha_vencimiento) },
    { label: 'Estatus', value: contrato.estatus },
  ]

  y = cajaInfo(doc, y, camposContrato, 3)
  y += 5

  // ── Tabla de amortización ──
  doc.setFillColor(...GRIS_L)
  doc.rect(14, y, W - 28, 6, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MARINO)
  doc.text('TABLA DE AMORTIZACIÓN', 16, y + 4.2)
  y += 8

  const cols = esArr
    ? ['#', 'Fecha', 'Capital', 'Interés', 'IVA', 'Cargos', 'Total', 'Saldo', 'Estatus']
    : ['#', 'Fecha', 'Capital', 'Interés', 'IVA', 'Total', 'Saldo', 'Estatus']

  const rows = tabla.map(f => esArr
    ? [f.numero_pago, fmtFecha(f.fecha_pago), fmtMXN(f.capital), fmtMXN(f.interes_ordinario),
       fmtMXN(f.iva_interes), fmtMXN(f.cargos_adicionales), fmtMXN(f.total_pago),
       fmtMXN(f.saldo_insoluto), f.estatus_pago]
    : [f.numero_pago, fmtFecha(f.fecha_pago), fmtMXN(f.capital), fmtMXN(f.interes_ordinario),
       fmtMXN(f.iva_interes), fmtMXN(f.total_pago), fmtMXN(f.saldo_insoluto), f.estatus_pago]
  )

  // Fila de totales
  const totCapital  = tabla.reduce((s, r) => s + r.capital, 0)
  const totInteres  = tabla.reduce((s, r) => s + r.interes_ordinario, 0)
  const totIva      = tabla.reduce((s, r) => s + r.iva_interes, 0)
  const totCargos   = tabla.reduce((s, r) => s + (r.cargos_adicionales ?? 0), 0)
  const totTotal    = tabla.reduce((s, r) => s + r.total_pago, 0)

  const totRow = esArr
    ? ['', 'TOTALES', fmtMXN(totCapital), fmtMXN(totInteres), fmtMXN(totIva),
       fmtMXN(totCargos), fmtMXN(totTotal), '', '']
    : ['', 'TOTALES', fmtMXN(totCapital), fmtMXN(totInteres), fmtMXN(totIva),
       fmtMXN(totTotal), '', '']

  autoTable(doc, {
    startY: y,
    head: [cols],
    body: rows,
    foot: [totRow],
    margin: { left: 14, right: 14 },
    headStyles:   { fillColor: MARINO, textColor: 255, fontSize: 7, fontStyle: 'bold' },
    footStyles:   { fillColor: AZUL, textColor: 255, fontSize: 7, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 7, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === cols.length - 1) {
        const val = data.cell.raw
        if (val === 'Pagado')   { doc.setTextColor(34, 197, 94); doc.text('Pagado', data.cell.x + 1, data.cell.y + 4) }
        if (val === 'Atrasado') { doc.setTextColor(239, 68, 68); doc.text('Atrasado', data.cell.x + 1, data.cell.y + 4) }
        doc.setTextColor(30, 30, 30)
      }
    },
    showFoot: 'lastPage',
  })

  dibujarFooter(doc)
  doc.save(`Estado_Cuenta_${contrato.numero_contrato}.pdf`)
}

// ══════════════════════════════════════════════════════════════
// 2. RECIBO DE PAGO
// ══════════════════════════════════════════════════════════════
export const generarReciboPago = (pago, contrato, cliente, folio) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const W   = doc.internal.pageSize.getWidth()

  let y = dibujarHeader(doc, 'Recibo de Pago', `Folio: ${folio ?? pago.id?.slice(0, 8).toUpperCase()}`)

  // Marco decorativo
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.5)
  doc.rect(14, y - 2, W - 28, 130, 'S')

  y += 4

  // Importe en grande
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AZUL)
  doc.text(fmtMXN(pago.monto_recibido), W / 2, y + 10, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)
  doc.text('MONTO RECIBIDO', W / 2, y + 17, { align: 'center' })

  y += 26

  // Línea divisora
  doc.setDrawColor(...GRIS_L)
  doc.setLineWidth(0.3)
  doc.line(14, y, W - 14, y)
  y += 6

  // Datos del pago
  y = cajaInfo(doc, y, [
    { label: 'Fecha de Pago', value: fmtFechaLarga(pago.fecha_pago) },
    { label: 'Forma de Pago', value: pago.forma_pago },
    { label: 'Referencia / Folio', value: pago.referencia || '—' },
    { label: 'Tipo de Pago', value: pago.tipo_pago },
    { label: 'Contrato', value: contrato?.numero_contrato },
    { label: 'Cliente', value: cliente?.razon_social },
    { label: 'RFC', value: cliente?.rfc },
    { label: 'Estatus', value: 'PAGADO' },
  ], 2)

  y += 4
  doc.setDrawColor(...GRIS_L)
  doc.line(14, y, W - 14, y)
  y += 6

  // Desglose (prelación)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MARINO)
  doc.text('DESGLOSE DEL PAGO', 16, y)
  y += 6

  const items = [
    { label: '① Moratorios (interés de mora + IVA)', value: pago.aplicado_moratorios ?? 0 },
    { label: '② Intereses ordinarios + IVA 16%',    value: pago.aplicado_intereses  ?? 0 },
    { label: '③ Cargos adicionales',                 value: pago.aplicado_cargos     ?? 0 },
    { label: '④ Capital',                            value: pago.aplicado_capital    ?? 0 },
  ]

  items.forEach(item => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.text(item.label, 18, y)
    doc.setFont('helvetica', 'bold')
    doc.text(fmtMXN(item.value), W - 18, y, { align: 'right' })
    y += 7
  })

  // Total
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.4)
  doc.line(14, y, W - 14, y)
  y += 5
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MARINO)
  doc.text('TOTAL RECIBIDO', 18, y)
  doc.setTextColor(...AZUL)
  doc.text(fmtMXN(pago.monto_recibido), W - 18, y, { align: 'right' })

  y += 15

  // Notas
  if (pago.notas) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...GRIS)
    doc.text(`Notas: ${pago.notas}`, 18, y)
    y += 8
  }

  // Sello / Firma
  y += 10
  doc.setDrawColor(...GRIS_L)
  doc.setLineWidth(0.3)
  doc.line(W / 2 - 30, y, W / 2 + 30, y)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)
  doc.text('Firma autorizada', W / 2, y + 5, { align: 'center' })
  doc.text('Finco Arcos S.A. de C.V.', W / 2, y + 10, { align: 'center' })

  dibujarFooter(doc)
  doc.save(`Recibo_${folio ?? pago.id?.slice(0, 8)}.pdf`)
}

// ══════════════════════════════════════════════════════════════
// 3. REPORTE DE CARTERA
// ══════════════════════════════════════════════════════════════
export const generarReporteCartera = (arrendamientos, creditos, fecha) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const W   = doc.internal.pageSize.getWidth()

  let y = dibujarHeader(doc, 'Reporte de Cartera', `Generado el ${fmtFechaLarga(fecha ?? new Date().toISOString().split('T')[0])}`)

  const todos = [
    ...arrendamientos.map(c => ({ ...c, _tipo: 'Arrend.', _monto: c.valor_activo })),
    ...creditos.map(c => ({ ...c, _tipo: 'Crédito', _monto: c.monto_credito })),
  ]

  // KPIs resumen
  const totalCartera = todos.filter(c => c.estatus === 'Activo' || c.estatus === 'En mora')
    .reduce((s, c) => s + (c._monto ?? 0), 0)
  const totalActivos = todos.filter(c => c.estatus === 'Activo').length
  const totalMora    = todos.filter(c => c.estatus === 'En mora').length

  y = cajaInfo(doc, y, [
    { label: 'Total contratos', value: todos.length },
    { label: 'Activos', value: totalActivos },
    { label: 'En mora', value: totalMora },
    { label: 'Cartera total', value: fmtMXN(totalCartera) },
  ], 4)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Contrato', 'Tipo', 'Cliente', 'RFC', 'Monto', 'Tasa', 'Plazo', 'Inicio', 'Vencimiento', 'Estatus']],
    body: todos.map(c => [
      c.numero_contrato,
      c._tipo,
      c.clientes?.razon_social ?? '—',
      c.clientes?.rfc ?? '—',
      fmtMXN(c._monto),
      `${c.tasa_ordinaria}%`,
      `${c.plazo_meses}m`,
      fmtFecha(c.fecha_inicio),
      fmtFecha(c.fecha_vencimiento),
      c.estatus,
    ]),
    margin: { left: 14, right: 14 },
    headStyles:   { fillColor: MARINO, textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 7, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 9) {
        const v = data.cell.raw
        const color = v === 'Activo' ? [34,197,94] : v === 'En mora' ? [234,179,8] : v === 'Vencido' ? [239,68,68] : [96,96,96]
        doc.setTextColor(...color)
        doc.text(v, data.cell.x + 1, data.cell.y + 4)
        doc.setTextColor(30, 30, 30)
      }
    },
  })

  dibujarFooter(doc)
  doc.save(`Reporte_Cartera_Finco_Arcos.pdf`)
}

// ══════════════════════════════════════════════════════════════
// 4. REPORTE DE MORATORIOS
// ══════════════════════════════════════════════════════════════
export const generarReporteMoratorios = (moratorios, contratos) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

  let y = dibujarHeader(doc, 'Reporte de Moratorios',
    `Generado el ${fmtFechaLarga(new Date().toISOString().split('T')[0])}`)

  const totalMor = moratorios.reduce((s, m) => s + (m.moratorio_con_iva ?? 0), 0)

  y = cajaInfo(doc, y, [
    { label: 'Contratos con mora', value: moratorios.length },
    { label: 'Total moratorio (con IVA)', value: fmtMXN(totalMor) },
  ], 2)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Contrato', 'Tipo', 'Cliente', 'Pagos atrasados', 'Primer vencimiento', 'Días atraso', 'Monto vencido', 'Moratorio + IVA']],
    body: moratorios.map(m => {
      const c = contratos[m.contrato_id]
      return [
        c?.numero_contrato ?? m.contrato_id.slice(0,8),
        m.contrato_tipo === 'arrendamiento' ? 'Arrend.' : 'Crédito',
        c?.clientes?.razon_social ?? '—',
        m.pagos_atrasados,
        fmtFecha(m.primer_vencimiento),
        `${m.max_dias_atraso} días`,
        fmtMXN(m.monto_vencido),
        fmtMXN(m.moratorio_con_iva),
      ]
    }),
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: MARINO, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [255, 248, 248] },
  })

  dibujarFooter(doc)
  doc.save('Reporte_Moratorios_Finco_Arcos.pdf')
}
