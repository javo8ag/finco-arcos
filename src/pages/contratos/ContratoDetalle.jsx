import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Car, Calendar, TrendingUp, CheckCircle, Clock, AlertCircle, CreditCard, Info } from 'lucide-react'
import { getContratoArrendamientoById, getTablaAmortizacion } from '../../lib/contratosApi'
import { formatCurrency, formatDate, estatusColor } from '../../utils/format'
import { calcularDiasAtraso as diasAtraso } from '../../utils/amortizacion'
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

  // CAT
  const cat = tabla.length > 0
    ? calcularCAT(
        (contrato.valor_activo ?? 0) - (contrato.enganche ?? 0),
        tabla.map(f => f.total_pago)
      )
    : null

  // Depreciación (solo arrendamiento puro)
  const deprecPanel = (() => {
    if (contrato.tipo_arrendamiento !== 'puro') return null
    const inicio = new Date(contrato.fecha_inicio + 'T12:00:00')
    const mesesTranscurridos = Math.max(0,
      (new Date().getFullYear() - inicio.getFullYear()) * 12 +
      (new Date().getMonth() - inicio.getMonth())
    )
    const va = contrato.valor_activo ?? 0
    const tasaFiscal    = 0.25  // SAT: vehículos 25% anual
    const tasaContable  = 0.20  // 20% = vida útil 5 años
    const depFiscalMes  = va * tasaFiscal / 12
    const depContableMes = va * tasaContable / 12
    const depFiscalAcum  = Math.min(va, depFiscalMes * mesesTranscurridos)
    const depContableAcum = Math.min(va, depContableMes * mesesTranscurridos)
    return { mesesTranscurridos, va, depFiscalAcum, depContableAcum, depFiscalMes, depContableMes,
             valorNetoFiscal: va - depFiscalAcum, valorNetoContable: va - depContableAcum }
  })()

  return (
    <div>
      <PageHeader
        titulo={`Contrato ${contrato.numero_contrato}`}
        subtitulo={contrato.clientes?.razon_social}
      >
        <button onClick={() => navigate('/contratos')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Regresar
        </button>
        {contrato.estatus === 'Activo' || contrato.estatus === 'En mora' ? (
          <button onClick={() => navigate(`/pagos/registrar/${id}`)} className="btn-accent flex items-center gap-2">
            <CreditCard size={16} /> Registrar pago
          </button>
        ) : null}
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KPI label="Saldo insoluto" value={formatCurrency(saldoInsoluto)} color="text-primary" />
        <KPI label="Valor del activo" value={formatCurrency(contrato.valor_activo)} />
        <KPI label="Pagos realizados" value={`${pagados} / ${contrato.plazo_meses}`}
          sub={`${tabla.length - pagados} pendientes`} />
        <KPI label="Pagos en atraso" value={atrasados}
          color={atrasados > 0 ? 'text-red-600' : 'text-green-600'}
          sub={atrasados > 0 ? 'Requieren atención' : 'Al corriente'} />
        <KPI label="CAT (anual)" value={cat != null ? `${cat.toFixed(1)}%` : '—'}
          sub="Costo Anual Total" color="text-violet-600" />
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
            <div className="flex justify-between border-t pt-2 mt-1">
              <span className="text-gray-500">Tipo arrendamiento</span>
              <span className={`badge ${contrato.tipo_arrendamiento === 'puro' ? 'badge-info' : 'badge-gray'}`}>
                {contrato.tipo_arrendamiento === 'puro' ? 'Puro' : 'Financiero'}
              </span>
            </div>
            {contrato.tipo_renta === 'variable' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Renta variable</span>
                <span className="text-xs font-medium text-gray-700">
                  {contrato.indice_ajuste} · {contrato.frecuencia_ajuste}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel de depreciación — solo arrendamiento puro */}
      {deprecPanel && (
        <div className="card mb-6 border-l-4 border-blue-400">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-800">Depreciación del activo — Arrendamiento Puro</h2>
            <span className="text-xs text-gray-400 ml-auto">{deprecPanel.mesesTranscurridos} meses transcurridos</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Deprec. fiscal acum. (25% SAT)</p>
              <p className="font-bold text-red-600">{formatCurrency(deprecPanel.depFiscalAcum)}</p>
              <p className="text-xs text-gray-400">{formatCurrency(deprecPanel.depFiscalMes)}/mes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Valor neto fiscal</p>
              <p className="font-bold text-gray-900">{formatCurrency(deprecPanel.valorNetoFiscal)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Deprec. contable acum. (20%)</p>
              <p className="font-bold text-orange-600">{formatCurrency(deprecPanel.depContableAcum)}</p>
              <p className="text-xs text-gray-400">{formatCurrency(deprecPanel.depContableMes)}/mes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Valor neto contable</p>
              <p className="font-bold text-gray-900">{formatCurrency(deprecPanel.valorNetoContable)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 bg-blue-50 rounded-lg px-3 py-2">
            <strong>Tratamiento fiscal:</strong> Finco Arcos deduce la depreciación del activo. El arrendatario deduce la renta mensual completa como gasto operativo (Art. 36 LISR).
          </p>
        </div>
      )}

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
