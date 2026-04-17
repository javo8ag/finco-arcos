import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Car, Calendar, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { getContratoArrendamientoById, getTablaAmortizacion } from '../../lib/contratosApi'
import { formatCurrency, formatDate, estatusColor } from '../../utils/format'
import { calcularDiasAtraso as diasAtraso } from '../../utils/amortizacion'
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

export default function ContratoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contrato, setContrato] = useState(null)
  const [tabla, setTabla]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    Promise.all([
      getContratoArrendamientoById(id),
      getTablaAmortizacion(id, 'arrendamiento'),
    ]).then(([c, t]) => {
      setContrato(c)
      // Marcar pagos atrasados
      const hoy = new Date()
      const tablaActualizada = t.map(f => ({
        ...f,
        dias_atraso: f.estatus_pago === 'Pendiente'
          ? diasAtraso(f.fecha_pago)
          : 0,
      }))
      setTabla(tablaActualizada)
      setLoading(false)
    }).catch(() => {
      setError('No se pudo cargar el contrato.')
      setLoading(false)
    })
  }, [id])

  if (loading) return <Spinner />
  if (error)   return <div className="card text-red-500">{error}</div>
  if (!contrato) return null

  const pagados   = tabla.filter(f => f.estatus_pago === 'Pagado').length
  const atrasados = tabla.filter(f => f.dias_atraso > 0 && f.estatus_pago === 'Pendiente').length
  const saldoInsoluto = tabla.find(f => f.estatus_pago !== 'Pagado')?.saldo_insoluto ?? 0

  return (
    <div>
      <PageHeader
        titulo={`Contrato ${contrato.numero_contrato}`}
        subtitulo={contrato.clientes?.razon_social}
      >
        <button onClick={() => navigate('/contratos')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Regresar
        </button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Saldo insoluto" value={formatCurrency(saldoInsoluto)} color="text-primary" />
        <KPI label="Valor del activo" value={formatCurrency(contrato.valor_activo)} />
        <KPI label="Pagos realizados" value={`${pagados} / ${contrato.plazo_meses}`}
          sub={`${tabla.length - pagados} pendientes`} />
        <KPI label="Pagos en atraso" value={atrasados}
          color={atrasados > 0 ? 'text-red-600' : 'text-green-600'}
          sub={atrasados > 0 ? 'Requieren atención' : 'Al corriente'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Datos del contrato */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Car size={18} className="text-primary" /> Bien arrendado
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-gray-400">Vehículo</p>
              <p className="font-medium">{contrato.marca} {contrato.modelo} {contrato.anio}</p></div>
            {contrato.niv && <div><p className="text-xs text-gray-400">NIV</p>
              <p className="font-mono text-xs">{contrato.niv}</p></div>}
            {contrato.placas && <div><p className="text-xs text-gray-400">Placas</p>
              <p className="font-medium">{contrato.placas}</p></div>}
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
              <span className="text-gray-500">Plazo</span>
              <span className="font-medium">{contrato.plazo_meses} meses</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Renta mensual</span>
              <span className="font-semibold text-primary">{formatCurrency(contrato.renta_mensual)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Valor residual</span>
              <span className="font-medium">{formatCurrency(contrato.valor_residual)}</span>
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
                {['#', 'Fecha', 'Capital', 'Interés', 'IVA', 'Cargos', 'Total', 'Saldo', 'Estatus'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tabla.map(f => {
                const atrasado = f.dias_atraso > 0 && f.estatus_pago === 'Pendiente'
                return (
                  <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${atrasado ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-2.5 text-gray-500">{f.numero_pago}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(f.fecha_pago)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(f.capital)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(f.interes_ordinario)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(f.iva_interes)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(f.cargos_adicionales)}</td>
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
                <td className="px-4 py-3 text-xs font-semibold">{formatCurrency(tabla.reduce((s, r) => s + r.cargos_adicionales, 0))}</td>
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
