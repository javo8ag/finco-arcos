import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { getPagos, getPagosPendientes } from '../../lib/pagosApi'
import { formatCurrency, formatDate } from '../../utils/format'
import { calcularMoratorioFila } from '../../utils/prelacion'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

function SemáforoRow({ fila }) {
  const navigate = useNavigate()
  const dias = fila.dias_atraso ?? 0
  const color =
    dias === 0  ? 'border-l-green-400'
    : dias <= 30 ? 'border-l-yellow-400'
    : dias <= 60 ? 'border-l-orange-400'
    : 'border-l-red-500'

  const contrato = fila.contratos_arrendamiento
  const moratorio = calcularMoratorioFila(fila, contrato?.tasa_moratoria ?? 0)

  return (
    <tr className={`hover:bg-gray-50 border-l-4 ${color} transition-colors`}>
      <td className="px-4 py-3">
        <p className="text-sm font-mono font-medium text-primary">{contrato?.numero_contrato}</p>
        <p className="text-xs text-gray-400">{contrato?.clientes?.razon_social}</p>
      </td>
      <td className="px-4 py-3 text-sm">{fila.numero_pago}</td>
      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(fila.fecha_pago)}</td>
      <td className="px-4 py-3 text-sm font-medium">{formatCurrency(fila.total_pago)}</td>
      <td className="px-4 py-3">
        {dias === 0 ? (
          <span className="badge-success">Al corriente</span>
        ) : dias <= 30 ? (
          <span className="badge-warning">{dias}d atraso</span>
        ) : (
          <span className="badge-danger">{dias}d atraso</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-red-600 font-medium">
        {moratorio.total_moratorio > 0 ? formatCurrency(moratorio.total_moratorio) : '—'}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => navigate(`/pagos/registrar/${fila.contrato_id}`)}
          className="btn-primary text-xs px-3 py-1.5"
        >
          Registrar pago
        </button>
      </td>
    </tr>
  )
}

export default function Pagos() {
  const [pendientes, setPendientes] = useState([])
  const [recientes, setRecientes]   = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([getPagosPendientes(), getPagos({ limit: 10 })])
      .then(([p, r]) => {
        // Calcular días de atraso
        const hoy = new Date()
        const conDias = p.map(f => ({
          ...f,
          dias_atraso: Math.max(0, Math.floor((hoy - new Date(f.fecha_pago + 'T12:00:00')) / 86400000)),
        })).sort((a, b) => b.dias_atraso - a.dias_atraso)
        setPendientes(conDias)
        setRecientes(r)
      })
      .finally(() => setLoading(false))
  }, [])

  const bucket = (min, max) => pendientes.filter(f => f.dias_atraso >= min && (max == null || f.dias_atraso <= max))

  if (loading) return <div className="py-10"><Spinner /></div>

  return (
    <div>
      <PageHeader icon={CreditCard} titulo="Cobranza" subtitulo="Pagos pendientes y registro de cobros" />

      {/* Semáforo KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Al corriente',   count: bucket(0, 0).length,   color: 'border-green-400',  bg: 'bg-green-50',  text: 'text-green-700',  icon: <CheckCircle size={20} className="text-green-500" /> },
          { label: '1 – 30 días',    count: bucket(1, 30).length,  color: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Clock size={20} className="text-yellow-500" /> },
          { label: '31 – 60 días',   count: bucket(31, 60).length, color: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', icon: <AlertTriangle size={20} className="text-orange-500" /> },
          { label: '+60 días',       count: bucket(61).length,     color: 'border-red-500',    bg: 'bg-red-50',    text: 'text-red-700',   icon: <AlertTriangle size={20} className="text-red-500" /> },
        ].map(k => (
          <div key={k.label} className={`card border-l-4 ${k.color} ${k.bg} py-4`}>
            <div className="flex items-center justify-between mb-1">
              {k.icon}
              <span className={`text-3xl font-bold ${k.text}`}>{k.count}</span>
            </div>
            <p className="text-sm text-gray-600">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabla de pagos pendientes / vencidos */}
      <div className="card p-0 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Pagos vencidos y próximos</h2>
          <span className="text-xs text-gray-400">{pendientes.length} registros</span>
        </div>
        {pendientes.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Todo al corriente</p>
            <p className="text-gray-400 text-sm">No hay pagos vencidos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Contrato / Cliente', 'Pago #', 'Fecha', 'Importe', 'Atraso', 'Moratorio', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendientes.map((f, i) => <SemáforoRow key={i} fila={f} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Últimos pagos registrados */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Últimos pagos registrados</h2>
        </div>
        {recientes.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">Aún no hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Fecha', 'Cliente', 'Monto', 'Tipo', 'Forma', 'Capital', 'Intereses', 'Moratorios'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recientes.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(p.fecha_pago)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.clientes?.razon_social ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(p.monto_recibido)}</td>
                    <td className="px-4 py-3"><span className="badge-info">{p.tipo_pago}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.forma_pago}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(p.aplicado_capital)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(p.aplicado_intereses)}</td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      {p.aplicado_moratorios > 0 ? formatCurrency(p.aplicado_moratorios) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
