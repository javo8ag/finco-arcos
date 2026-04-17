import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw, CheckCircle, TrendingDown } from 'lucide-react'
import { getMoratoriosActivos, sincronizarMoratorios, getHistorialMoratorios, condonarMoratorio } from '../../lib/pagosApi'
import { getContratosArrendamiento, getContratosCredito } from '../../lib/contratosApi'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'
import { usePortafolioStore } from '../../store/portafolioStore'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

export default function Moratorios() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getFiltroPortafolio } = usePortafolioStore()

  const [moratorios, setMoratorios]   = useState([])
  const [historial, setHistorial]     = useState([])
  const [contratos, setContratos]     = useState({})
  const [loading, setLoading]         = useState(true)
  const [sinc, setSinc]               = useState(null)
  const [sincronizando, setSincronizando] = useState(false)

  // Modal de condonación
  const [modalCondonar, setModalCondonar] = useState(null)
  const [motivoCondonar, setMotivoCondonar] = useState('')
  const [condonando, setCondonando]        = useState(false)

  const portafolio = getFiltroPortafolio()

  const cargar = async () => {
    setLoading(true)
    try {
      // Sincronizar primero
      const resultado = await sincronizarMoratorios()
      setSinc(resultado)

      const [m, h, arr, crd] = await Promise.all([
        getMoratoriosActivos(),
        getHistorialMoratorios(),
        getContratosArrendamiento(portafolio ? { portafolio } : {}),
        getContratosCredito(portafolio ? { portafolio } : {}),
      ])

      // Indexar contratos por id para lookup rápido
      const idx = {}
      ;[...arr, ...crd].forEach(c => { idx[c.id] = c })
      setContratos(idx)
      // Filter moratorios to only those whose contract is in this portfolio
      const morFiltrados = portafolio
        ? m.filter(x => idx[x.contrato_id])
        : m
      setMoratorios(morFiltrados)
      setHistorial(h)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [portafolio])

  const handleSincronizar = async () => {
    setSincronizando(true)
    await cargar()
    setSincronizando(false)
  }

  const handleCondonar = async () => {
    if (!motivoCondonar.trim()) return
    setCondonando(true)
    try {
      await condonarMoratorio(modalCondonar.id, motivoCondonar, user?.id)
      setModalCondonar(null)
      setMotivoCondonar('')
      await cargar()
    } catch { /* silencioso */ }
    setCondonando(false)
  }

  const totalMoratorio = moratorios.reduce((s, m) => s + (m.moratorio_con_iva ?? 0), 0)

  if (loading) return <div className="py-20"><Spinner texto="Sincronizando moratorios..." /></div>

  return (
    <div>
      <PageHeader
        icon={AlertTriangle}
        titulo="Moratorios"
        subtitulo="Intereses de mora calculados automáticamente"
      >
        <button
          onClick={handleSincronizar}
          disabled={sincronizando}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={16} className={sincronizando ? 'animate-spin' : ''} />
          {sincronizando ? 'Sincronizando...' : 'Actualizar'}
        </button>
      </PageHeader>

      {/* Resultado de sincronización */}
      {sinc && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 mb-6 flex items-center gap-2">
          <CheckCircle size={15} className="shrink-0" />
          Sincronizado: {sinc.pagos_atrasados ?? 0} pagos marcados atrasados,
          {' '}{sinc.arr_en_mora ?? 0} arrendamientos y {sinc.crd_en_mora ?? 0} créditos pasaron a "En mora"
        </div>
      )}

      {/* KPI total */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card border-l-4 border-l-red-500 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total moratorios activos (con IVA)</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalMoratorio)}</p>
            </div>
            <TrendingDown size={28} className="text-red-400" />
          </div>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Contratos con mora activa</p>
          <p className="text-2xl font-bold text-gray-800">{moratorios.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Máximo días de atraso</p>
          <p className="text-2xl font-bold text-orange-600">
            {moratorios.length > 0 ? Math.max(...moratorios.map(m => m.max_dias_atraso ?? 0)) : 0} días
          </p>
        </div>
      </div>

      {/* Tabla de moratorios activos */}
      <div className="card p-0 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Moratorios activos por contrato</h2>
          <p className="text-xs text-gray-400 mt-0.5">Se cobra al momento de recibir el pago (prelación automática)</p>
        </div>

        {moratorios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400">
            <CheckCircle size={40} className="text-green-400 mb-3" />
            <p className="font-medium">No hay moratorios activos</p>
            <p className="text-sm">Todos los contratos están al corriente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Contrato', 'Tipo', 'Pagos atrasados', 'Primer vencimiento', 'Días atraso', 'Monto vencido', 'Moratorio + IVA', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {moratorios.map((m, i) => {
                  const contrato = contratos[m.contrato_id]
                  const diasColor =
                    m.max_dias_atraso <= 30  ? 'text-yellow-600'
                    : m.max_dias_atraso <= 60 ? 'text-orange-600'
                    : 'text-red-600 font-bold'

                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-mono text-primary font-medium text-xs">
                          {contrato?.numero_contrato ?? m.contrato_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-400">{contrato?.clientes?.razon_social}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={m.contrato_tipo === 'arrendamiento' ? 'badge-info' : 'badge-gray'}>
                          {m.contrato_tipo === 'arrendamiento' ? 'Arrend.' : 'Crédito'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-600">{m.pagos_atrasados}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(m.primer_vencimiento)}
                      </td>
                      <td className={`px-4 py-3 ${diasColor}`}>{m.max_dias_atraso} días</td>
                      <td className="px-4 py-3">{formatCurrency(m.monto_vencido)}</td>
                      <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(m.moratorio_con_iva)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(
                            m.contrato_tipo === 'arrendamiento'
                              ? `/pagos/registrar/${m.contrato_id}`
                              : `/pagos/registrar-credito/${m.contrato_id}`
                          )}
                          className="btn-accent text-xs px-3 py-1.5 whitespace-nowrap"
                        >
                          Registrar pago
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-xs font-semibold text-gray-600">TOTAL MORATORIOS</td>
                  <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(totalMoratorio)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Historial de moratorios cobrados/condonados */}
      {historial.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Historial de moratorios</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Fecha', 'Días atraso', 'Moratorio', 'IVA', 'Total', 'Estatus'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historial.slice(0, 20).map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(h.fecha_calculo)}</td>
                    <td className="px-4 py-3">{h.dias_atraso} días</td>
                    <td className="px-4 py-3">{formatCurrency(h.monto_moratorio)}</td>
                    <td className="px-4 py-3">{formatCurrency(h.iva_moratorio)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(h.total_moratorio)}</td>
                    <td className="px-4 py-3">
                      {h.condonado
                        ? <span className="badge-warning">Condonado</span>
                        : <span className="badge-success">Cobrado</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal condonación */}
      {modalCondonar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Condonar moratorio</h3>
            <p className="text-sm text-gray-500 mb-4">
              Monto a condonar: <strong>{formatCurrency(modalCondonar.total_moratorio)}</strong>
              <br />Esta acción queda registrada en la auditoría del sistema.
            </p>
            <label className="label">Motivo de condonación *</label>
            <textarea
              className="input mb-4" rows={3}
              placeholder="Ej. Cliente con historial positivo, acuerdo comercial..."
              value={motivoCondonar}
              onChange={e => setMotivoCondonar(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setModalCondonar(null); setMotivoCondonar('') }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCondonar}
                disabled={!motivoCondonar.trim() || condonando}
                className="btn-accent"
              >
                {condonando ? 'Condonando...' : 'Confirmar condonación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
