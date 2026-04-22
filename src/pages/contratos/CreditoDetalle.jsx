import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CreditCard, TrendingUp, Calendar, CheckCircle, Clock, AlertCircle, Upload } from 'lucide-react'
import ModalHistorialPagos from '../../components/ui/ModalHistorialPagos'
import { getContratoCreditoById, getTablaAmortizacion } from '../../lib/contratosApi'
import { formatCurrency, formatDate, estatusColor } from '../../utils/format'
import { calcularDiasAtraso } from '../../utils/amortizacion'
import { calcularCAT } from '../../utils/cat'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

const estatusPagoIcon = {
  Pagado:   <CheckCircle size={14} className="text-green-500" />,
  Pendiente:<Clock size={14} className="text-gray-400" />,
  Atrasado: <AlertCircle size={14} className="text-red-500" />,
  Parcial:  <AlertCircle size={14} className="text-yellow-500" />,
}

function KPI({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function CreditoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contrato,       setContrato]       = useState(null)
  const [tabla,          setTabla]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [modalHistorial, setModalHistorial] = useState(false)

  useEffect(() => {
    Promise.all([
      getContratoCreditoById(id),
      getTablaAmortizacion(id, 'credito'),
    ]).then(([c, t]) => {
      setContrato(c)
      setTabla(t.map(f => ({
        ...f,
        dias_atraso: f.estatus_pago === 'Pendiente' ? calcularDiasAtraso(f.fecha_pago) : 0,
      })))
      setLoading(false)
    }).catch(() => { setError('No se pudo cargar el contrato.'); setLoading(false) })
  }, [id])

  if (loading) return <Spinner />
  if (error)   return <div className="card text-red-500">{error}</div>
  if (!contrato) return null

  const cat = tabla.length > 0
    ? calcularCAT(
        (contrato.monto_credito ?? 0) - (contrato.enganche ?? 0),
        tabla.map(f => f.total_pago)
      )
    : null

  const pagados    = tabla.filter(f => f.estatus_pago === 'Pagado').length
  const atrasados  = tabla.filter(f => f.dias_atraso > 0 && f.estatus_pago === 'Pendiente').length
  const primerPendiente = tabla.find(f => f.estatus_pago !== 'Pagado')
  const saldoInsoluto = primerPendiente
    ? (primerPendiente.saldo_insoluto + primerPendiente.capital)
    : 0

  return (
    <div>
      <PageHeader
        titulo={`Crédito ${contrato.numero_contrato}`}
        subtitulo={contrato.clientes?.razon_social}
      >
        <button onClick={() => navigate('/contratos')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Regresar
        </button>
        <button onClick={() => setModalHistorial(true)} className="btn-secondary flex items-center gap-2">
          <Upload size={16} /> Cargar historial
        </button>
        {['Activo', 'En mora'].includes(contrato.estatus) && (
          <button
            onClick={() => navigate(`/pagos/registrar-credito/${id}`)}
            className="btn-accent flex items-center gap-2"
          >
            <CreditCard size={16} /> Registrar pago
          </button>
        )}
      </PageHeader>

      {modalHistorial && (
        <ModalHistorialPagos
          contratoId={id}
          contratoTipo="credito"
          contrato={contrato}
          onClose={() => setModalHistorial(false)}
          onDone={() => { setModalHistorial(false); window.location.reload() }}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KPI label="Saldo insoluto" value={formatCurrency(saldoInsoluto)} color="text-primary" />
        <KPI label="Monto del crédito" value={formatCurrency(contrato.monto_credito)} />
        <KPI label="Pagos realizados" value={`${pagados} / ${contrato.plazo_meses}`}
          sub={`${tabla.length - pagados} pendientes`} />
        <KPI label="Pagos en atraso" value={atrasados}
          color={atrasados > 0 ? 'text-red-600' : 'text-green-600'}
          sub={atrasados > 0 ? 'Requieren atención' : 'Al corriente'} />
        <KPI label="CAT (anual)" value={cat != null ? `${cat.toFixed(1)}%` : '—'}
          sub="Costo Anual Total" color="text-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Propósito */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CreditCard size={18} className="text-primary" /> Destino del crédito
          </h2>
          <p className="text-gray-700">{contrato.proposito}</p>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div><p className="text-xs text-gray-400">Cliente</p>
              <p className="font-medium">{contrato.clientes?.razon_social}</p></div>
            <div><p className="text-xs text-gray-400">RFC</p>
              <p className="font-mono">{contrato.clientes?.rfc}</p></div>
            <div><p className="text-xs text-gray-400">Portafolio</p>
              <p className="font-medium">{contrato.portafolio || 'General'}</p></div>
            <div><p className="text-xs text-gray-400">Método</p>
              <p className="font-medium capitalize">{contrato.metodo_amortizacion}</p></div>
          </div>
        </div>

        {/* Condiciones */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" /> Condiciones
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Tasa ordinaria</span>
              <span className="font-medium">{contrato.tasa_ordinaria}% anual</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tasa moratoria</span>
              <span className="font-medium">{contrato.tasa_moratoria}% anual</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Plazo</span>
              <span className="font-medium">{contrato.plazo_meses} meses</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Días de gracia</span>
              <span className="font-medium">{contrato.dias_gracia}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-gray-500">Inicio</span>
              <span className="font-medium">{formatDate(contrato.fecha_inicio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vencimiento</span>
              <span className="font-medium">{formatDate(contrato.fecha_vencimiento)}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-gray-500">Estatus</span>
              <span className={estatusColor(contrato.estatus)}>{contrato.estatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de amortización */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Calendar size={18} className="text-primary" /> Tabla de amortización
          </h2>
          <span className="text-xs text-gray-400">{tabla.length} pagos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['#', 'Fecha', 'Capital', 'Interés', 'IVA', 'Total', 'Saldo', 'Estatus'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tabla.map(f => {
                const atrasado = f.dias_atraso > 0 && f.estatus_pago === 'Pendiente'
                return (
                  <tr key={f.id} className={`hover:bg-gray-50 ${atrasado ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-2.5 text-gray-500">{f.numero_pago}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(f.fecha_pago)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(f.capital)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(f.interes_ordinario)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(f.iva_interes)}</td>
                    <td className="px-4 py-2.5 font-semibold">{formatCurrency(f.total_pago)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{formatCurrency(f.saldo_insoluto)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {estatusPagoIcon[f.estatus_pago] || estatusPagoIcon['Pendiente']}
                        <span className={atrasado ? 'text-red-600 font-medium text-xs' : 'text-xs text-gray-500'}>
                          {atrasado ? `${f.dias_atraso}d atraso` : f.estatus_pago}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-600">TOTALES</td>
                <td className="px-4 py-3 text-xs font-semibold">{formatCurrency(tabla.reduce((s, r) => s + r.capital, 0))}</td>
                <td className="px-4 py-3 text-xs font-semibold">{formatCurrency(tabla.reduce((s, r) => s + r.interes_ordinario, 0))}</td>
                <td className="px-4 py-3 text-xs font-semibold">{formatCurrency(tabla.reduce((s, r) => s + r.iva_interes, 0))}</td>
                <td className="px-4 py-3 text-xs font-bold text-primary">{formatCurrency(tabla.reduce((s, r) => s + r.total_pago, 0))}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
