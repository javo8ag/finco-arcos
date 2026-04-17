import { useEffect, useState } from 'react'
import { BarChart2, Download, FileText, CreditCard, AlertTriangle, BookOpen } from 'lucide-react'
import { getContratosArrendamiento, getContratosCredito, getTablaAmortizacion } from '../../lib/contratosApi'
import { getPagos, getMoratoriosActivos } from '../../lib/pagosApi'
import { getClientes, getClienteById } from '../../lib/clientesApi'
import {
  generarEstadoCuenta,
  generarReciboPago,
  generarReporteCartera,
  generarReporteMoratorios,
} from '../../utils/pdfGenerator'
import { usePortafolioStore } from '../../store/portafolioStore'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, formatDate } from '../../utils/format'

function TarjetaReporte({ icon: Icon, titulo, descripcion, children, color = 'text-primary', bg = 'bg-blue-50' }) {
  return (
    <div className="card">
      <div className="flex items-start gap-4 mb-4">
        <div className={`${bg} p-3 rounded-xl shrink-0`}>
          <Icon size={22} className={color} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{titulo}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{descripcion}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function Reportes() {
  const { getFiltroPortafolio } = usePortafolioStore()
  const [arrendamientos, setArrendamientos] = useState([])
  const [creditos, setCreditos]             = useState([])
  const [pagos, setPagos]                   = useState([])
  const [moratorios, setMoratorios]         = useState([])
  const [contratoIdx, setContratoIdx]       = useState({})
  const [loading, setLoading]               = useState(true)

  // Estado de cuenta
  const [contratoEC, setContratoEC]   = useState('')
  const [tipoEC, setTipoEC]           = useState('arrendamiento')
  const [generandoEC, setGenerandoEC] = useState(false)

  // Recibo de pago
  const [pagoSel, setPagoSel]           = useState('')
  const [generandoRec, setGenerandoRec] = useState(false)

  // Cartera
  const [generandoCart, setGenerandoCart] = useState(false)

  // Moratorios
  const [generandoMor, setGenerandoMor] = useState(false)

  const portafolio = getFiltroPortafolio()

  useEffect(() => {
    setLoading(true)
    const filtros = portafolio ? { portafolio } : {}
    Promise.all([
      getContratosArrendamiento(filtros),
      getContratosCredito(filtros),
      getPagos({ limit: 30 }),
      getMoratoriosActivos(),
    ]).then(([arr, crd, pag, mor]) => {
      setArrendamientos(arr ?? [])
      setCreditos(crd ?? [])
      setPagos(pag ?? [])
      // Filter moratorios to portfolio contracts
      const idx = {}
      ;[...(arr ?? []), ...(crd ?? [])].forEach(c => { idx[c.id] = c })
      setContratoIdx(idx)
      setMoratorios(portafolio ? (mor ?? []).filter(m => idx[m.contrato_id]) : (mor ?? []))
      setContratoEC('')
      setLoading(false)
    })
  }, [portafolio])

  // ── Estado de cuenta ──
  const handleEstadoCuenta = async () => {
    if (!contratoEC) return
    setGenerandoEC(true)
    try {
      const contrato = contratoIdx[contratoEC]
      const tabla    = await getTablaAmortizacion(contratoEC, tipoEC)
      generarEstadoCuenta(contrato, tabla, tipoEC)
    } catch (e) { console.error(e) }
    setGenerandoEC(false)
  }

  // ── Recibo de pago ──
  const handleRecibo = async () => {
    if (!pagoSel) return
    setGenerandoRec(true)
    try {
      const pago     = pagos.find(p => p.id === pagoSel)
      const contrato = contratoIdx[pago.contrato_id]
      const cliente  = contrato?.clientes ?? (await getClienteById(pago.cliente_id))
      const folio    = `REC-${pago.id?.slice(0, 8).toUpperCase()}`
      generarReciboPago(pago, contrato, cliente, folio)
    } catch (e) { console.error(e) }
    setGenerandoRec(false)
  }

  // ── Reporte de cartera ──
  const handleCartera = async () => {
    setGenerandoCart(true)
    try { generarReporteCartera(arrendamientos, creditos) }
    catch (e) { console.error(e) }
    setGenerandoCart(false)
  }

  // ── Reporte de moratorios ──
  const handleMoratorios = async () => {
    setGenerandoMor(true)
    try { generarReporteMoratorios(moratorios, contratoIdx) }
    catch (e) { console.error(e) }
    setGenerandoMor(false)
  }

  if (loading) return <div className="py-20"><Spinner texto="Cargando datos..." /></div>

  const todosContratos = [
    ...arrendamientos.map(c => ({ ...c, _tipo: 'arrendamiento', _label: `[ARR] ${c.numero_contrato} — ${c.clientes?.razon_social}` })),
    ...creditos.map(c => ({ ...c, _tipo: 'credito', _label: `[CRD] ${c.numero_contrato} — ${c.clientes?.razon_social}` })),
  ].sort((a, b) => a.numero_contrato.localeCompare(b.numero_contrato))

  return (
    <div>
      <PageHeader icon={BarChart2} titulo="Reportes" subtitulo="Generación de documentos PDF con membrete Finco Arcos" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Estado de cuenta */}
        <TarjetaReporte
          icon={BookOpen}
          titulo="Estado de cuenta"
          descripcion="Tabla de amortización completa por contrato, con IVA y cargos desglosados."
          color="text-primary" bg="bg-blue-50"
        >
          <div className="space-y-3">
            <div>
              <label className="label">Seleccionar contrato</label>
              <select
                className="input"
                value={contratoEC}
                onChange={e => {
                  const c = todosContratos.find(x => x.id === e.target.value)
                  setContratoEC(e.target.value)
                  if (c) setTipoEC(c._tipo)
                }}
              >
                <option value="">— Seleccionar —</option>
                {todosContratos.map(c => (
                  <option key={c.id} value={c.id}>{c._label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleEstadoCuenta}
              disabled={!contratoEC || generandoEC}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {generandoEC ? 'Generando PDF...' : 'Descargar Estado de Cuenta'}
            </button>
          </div>
        </TarjetaReporte>

        {/* Recibo de pago */}
        <TarjetaReporte
          icon={CreditCard}
          titulo="Recibo de pago"
          descripcion="Comprobante con desglose de prelación (moratorios, intereses, capital)."
          color="text-accent" bg="bg-orange-50"
        >
          <div className="space-y-3">
            <div>
              <label className="label">Seleccionar pago</label>
              <select
                className="input"
                value={pagoSel}
                onChange={e => setPagoSel(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {pagos.map(p => (
                  <option key={p.id} value={p.id}>
                    {formatDate(p.fecha_pago)} — {formatCurrency(p.monto_recibido)} — {p.clientes?.razon_social}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRecibo}
              disabled={!pagoSel || generandoRec}
              className="btn-accent w-full flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {generandoRec ? 'Generando PDF...' : 'Descargar Recibo de Pago'}
            </button>
          </div>
        </TarjetaReporte>

        {/* Reporte de cartera */}
        <TarjetaReporte
          icon={FileText}
          titulo="Reporte de cartera"
          descripcion={`Todos los contratos activos y en mora. ${arrendamientos.length} arrendamientos + ${creditos.length} créditos.`}
          color="text-green-600" bg="bg-green-50"
        >
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 mb-3">
            <div className="text-sm">
              <p className="font-medium text-gray-800">{arrendamientos.length + creditos.length} contratos totales</p>
              <p className="text-gray-400 text-xs">
                {arrendamientos.filter(c => c.estatus === 'Activo').length} activos ·
                {arrendamientos.filter(c => c.estatus === 'En mora').length + creditos.filter(c => c.estatus === 'En mora').length} en mora
              </p>
            </div>
            <span className="font-bold text-primary text-sm">
              {formatCurrency(
                [...arrendamientos, ...creditos]
                  .filter(c => ['Activo','En mora'].includes(c.estatus))
                  .reduce((s, c) => s + (c.valor_activo ?? c.monto_credito ?? 0), 0)
              )}
            </span>
          </div>
          <button
            onClick={handleCartera}
            disabled={generandoCart}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <Download size={16} />
            {generandoCart ? 'Generando PDF...' : 'Descargar Reporte de Cartera'}
          </button>
        </TarjetaReporte>

        {/* Reporte de moratorios */}
        <TarjetaReporte
          icon={AlertTriangle}
          titulo="Reporte de moratorios"
          descripcion="Cartera vencida con moratorios calculados al día de hoy."
          color="text-red-600" bg="bg-red-50"
        >
          <div className="flex items-center justify-between bg-red-50 rounded-lg px-4 py-3 mb-3">
            <div className="text-sm">
              <p className="font-medium text-gray-800">{moratorios.length} contratos con mora</p>
              <p className="text-gray-400 text-xs">Máx. {moratorios.length > 0 ? Math.max(...moratorios.map(m => m.max_dias_atraso ?? 0)) : 0} días de atraso</p>
            </div>
            <span className="font-bold text-red-600 text-sm">
              {formatCurrency(moratorios.reduce((s, m) => s + (m.moratorio_con_iva ?? 0), 0))}
            </span>
          </div>
          <button
            onClick={handleMoratorios}
            disabled={generandoMor || moratorios.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            {generandoMor ? 'Generando PDF...' : 'Descargar Reporte de Moratorios'}
          </button>
        </TarjetaReporte>

      </div>
    </div>
  )
}
