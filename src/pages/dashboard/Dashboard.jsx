import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  FileText, CheckCircle, Clock, Users, Percent, Calendar,
} from 'lucide-react'
import { getDashboardData, getKPIsExtendidos } from '../../lib/dashboardApi'
import { formatCurrency, formatDate, formatPercent } from '../../utils/format'
import { usePortafolioStore } from '../../store/portafolioStore'
import Spinner from '../../components/ui/Spinner'

// ── Componentes pequeños ───────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, color = 'text-primary', bg = 'bg-blue-50', trend }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`${bg} p-3 rounded-xl shrink-0`}>
        <Icon size={22} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={`text-xl font-bold ${color} truncate`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const formatMillones = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

const TooltipMXN = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-card px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{formatCurrency(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Dashboard principal ────────────────────────────────────────

export default function Dashboard() {
  const navigate   = useNavigate()
  const { getFiltroPortafolio, getPortafolioInfo } = usePortafolioStore()
  const [data, setData]         = useState(null)
  const [ext, setExt]           = useState(null)
  const [loading, setLoading]   = useState(true)

  const portafolio     = getFiltroPortafolio()
  const portafolioInfo = getPortafolioInfo()

  useEffect(() => {
    setLoading(true)
    setExt(null)
    getDashboardData(portafolio)
      .then(d => {
        setData(d)
        // KPIs extendidos en segundo plano (no bloquean la carga inicial)
        getKPIsExtendidos(portafolio, d).then(setExt).catch(() => {})
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [portafolio])

  if (loading) return <div className="py-20"><Spinner texto="Cargando dashboard..." /></div>
  if (!data)   return <div className="card text-red-500">Error al cargar el dashboard.</div>

  const { kpis, proximosVencer, buckets, colocacionMensual, cobrosMensuales, cartPorEstatus, pagosRecientes } = data

  const flujoData = ext ? [
    { periodo: 'Próx 30 días', monto: ext.flujoProyectado.d30 },
    { periodo: '31 – 60 días', monto: ext.flujoProyectado.d60 },
    { periodo: '61 – 90 días', monto: ext.flujoProyectado.d90 },
  ] : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Resumen ejecutivo de la cartera — actualizado ahora</p>
        </div>
        {portafolioInfo?.id && (
          <span
            className="mt-1 shrink-0 text-xs font-semibold px-3 py-1 rounded-full text-white"
            style={{ background: portafolioInfo.color }}
          >
            {portafolioInfo.nombre}
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Cartera total colocada"
          value={formatCurrency(kpis.carteraTotal)}
          sub={`${kpis.totalActivos} contratos activos`}
          icon={DollarSign} color="text-primary" bg="bg-blue-50"
        />
        <KPICard
          label="Cartera vencida (+30d)"
          value={formatCurrency(kpis.carteraVencida)}
          sub={`${kpis.totalEnMora} en mora`}
          icon={AlertTriangle}
          color={kpis.carteraVencida > 0 ? 'text-red-600' : 'text-green-600'}
          bg={kpis.carteraVencida > 0 ? 'bg-red-50' : 'bg-green-50'}
        />
        <KPICard
          label="Índice de morosidad"
          value={formatPercent(kpis.indMorosidad)}
          sub={kpis.indMorosidad < 5 ? 'Cartera sana' : 'Requiere atención'}
          icon={TrendingDown}
          color={kpis.indMorosidad < 5 ? 'text-green-600' : kpis.indMorosidad < 15 ? 'text-yellow-600' : 'text-red-600'}
          bg={kpis.indMorosidad < 5 ? 'bg-green-50' : 'bg-yellow-50'}
        />
        <KPICard
          label="Cobrado este mes"
          value={formatCurrency(kpis.cobradoMes)}
          sub={`${kpis.totalLiquidados} contratos liquidados`}
          icon={TrendingUp} color="text-accent" bg="bg-orange-50"
        />
      </div>

      {/* KPIs extendidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Rendimiento de cartera (anual)"
          value={ext ? `${ext.rendimiento.toFixed(1)}%` : '—'}
          sub="Intereses cobrados / cartera"
          icon={Percent} color="text-emerald-600" bg="bg-emerald-50"
        />
        <KPICard
          label="ICOR (cobertura de reservas)"
          value={ext?.icor != null ? `${ext.icor.toFixed(0)}%` : ext ? 'N/A' : '—'}
          sub={ext?.icor != null ? (ext.icor >= 100 ? 'Cobertura suficiente' : 'Cobertura insuficiente') : 'Sin cartera vencida'}
          icon={FileText}
          color={ext?.icor == null ? 'text-green-600' : ext.icor >= 100 ? 'text-green-600' : 'text-red-600'}
          bg={ext?.icor == null ? 'bg-green-50' : ext.icor >= 100 ? 'bg-green-50' : 'bg-red-50'}
        />
        <KPICard
          label="Flujo esperado próx 30 días"
          value={ext ? formatCurrency(ext.flujoProyectado.d30) : '—'}
          sub="Pagos pendientes programados"
          icon={Calendar} color="text-violet-600" bg="bg-violet-50"
        />
        <KPICard
          label="Concentración top 5 clientes"
          value={ext ? `${ext.concentracionTop5.toFixed(1)}%` : '—'}
          sub={ext?.concentracionTop5 > 50 ? 'Alta concentración' : 'Concentración aceptable'}
          icon={Users}
          color={ext?.concentracionTop5 > 50 ? 'text-orange-600' : 'text-blue-600'}
          bg={ext?.concentracionTop5 > 50 ? 'bg-orange-50' : 'bg-blue-50'}
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colocación mensual */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Colocación mensual (últimos 12 meses)</h2>
          {colocacionMensual.every(m => m.colocacion === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
              Sin datos de colocación aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={colocacionMensual} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tickFormatter={formatMillones} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<TooltipMXN />} />
                <Bar dataKey="colocacion" name="Colocación" fill="#2d43d0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Dona: cartera por estatus */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Contratos por estatus</h2>
          {cartPorEstatus.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
              Sin contratos aún
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={cartPorEstatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {cartPorEstatus.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} contratos`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {cartPorEstatus.map(e => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.fill }} />
                    {e.name} ({e.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cobros mensuales */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Cobros recibidos (últimos 6 meses)</h2>
        {cobrosMensuales.every(m => m.cobrado === 0) ? (
          <div className="flex items-center justify-center h-32 text-gray-300 text-sm">
            Sin pagos registrados aún
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cobrosMensuales} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tickFormatter={formatMillones} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip content={<TooltipMXN />} />
              <Bar dataKey="cobrado" name="Cobrado" fill="#ff7900" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tablas de alerta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Próximos a vencer */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={16} className="text-accent" />
            <h2 className="text-base font-semibold text-gray-800">Próximos a vencer (30 días)</h2>
          </div>
          {proximosVencer.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-6 text-gray-400 text-sm">
              <CheckCircle size={16} className="text-green-400" /> Sin contratos próximos a vencer
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Contrato', 'Cliente', 'Vencimiento'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {proximosVencer.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/contratos/${c.id}`)}>
                    <td className="px-4 py-2.5 font-mono text-primary text-xs">{c.numero_contrato}</td>
                    <td className="px-4 py-2.5 text-gray-700 truncate max-w-32">{c.clientes?.razon_social}</td>
                    <td className="px-4 py-2.5 text-orange-600 font-medium whitespace-nowrap">
                      {formatDate(c.fecha_vencimiento)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Buckets de mora */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-base font-semibold text-gray-800">Cartera en mora por antigüedad</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Bucket', 'Contratos', 'Saldo expuesto'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { key: '1-30',  label: '1 – 30 días',  color: 'text-yellow-600' },
                { key: '31-60', label: '31 – 60 días', color: 'text-orange-600' },
                { key: '61-90', label: '61 – 90 días', color: 'text-red-500' },
                { key: '+90',   label: '+90 días',     color: 'text-red-700 font-bold' },
              ].map(b => (
                <tr key={b.key}>
                  <td className={`px-4 py-3 font-medium ${b.color}`}>{b.label}</td>
                  <td className="px-4 py-3 text-gray-700">{buckets[b.key].length}</td>
                  <td className="px-4 py-3 font-semibold">
                    {formatCurrency(buckets[b.key].reduce((s, e) => s + e.saldo, 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Últimos pagos */}
      {pagosRecientes.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Últimos pagos registrados</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Fecha', 'Cliente', 'Monto', 'Tipo', 'Forma'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagosRecientes.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(p.fecha_pago)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{p.clientes?.razon_social ?? '—'}</td>
                  <td className="px-4 py-2.5 font-semibold text-primary">{formatCurrency(p.monto_recibido)}</td>
                  <td className="px-4 py-2.5"><span className="badge-info">{p.tipo_pago}</span></td>
                  <td className="px-4 py-2.5 text-gray-500">{p.forma_pago}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Flujo proyectado + Top 5 clientes */}
      {ext && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flujo proyectado 30/60/90 días */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Flujo de cobranza proyectado</h2>
            {flujoData.every(d => d.monto === 0) ? (
              <div className="flex items-center justify-center h-36 text-gray-300 text-sm">Sin pagos pendientes próximos 90 días</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={flujoData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tickFormatter={formatMillones} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip content={<TooltipMXN />} />
                  <Bar dataKey="monto" name="Cobros esperados" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top 5 clientes por concentración */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Concentración — Top 5 clientes</h2>
            {ext.top5Clientes.length === 0 ? (
              <div className="flex items-center justify-center h-36 text-gray-300 text-sm">Sin datos</div>
            ) : (
              <div className="space-y-3">
                {ext.top5Clientes.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate max-w-48">{c.nombre}</span>
                      <span className="font-semibold text-gray-900 shrink-0 ml-2">{c.pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(c.pct, 100)}%`, background: '#2d43d0' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(c.saldo)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cosecha / Vintage + Cartera por ejecutivo */}
      {ext && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vintage */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Cosecha / Vintage</h2>
            <p className="text-xs text-gray-400 mb-4">% de mora por trimestre de originación</p>
            {ext.vintage.length === 0 ? (
              <div className="flex items-center justify-center h-36 text-gray-300 text-sm">Sin datos de cosecha</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ext.vintage} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis unit="%" tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[0, 100]} />
                  <Tooltip formatter={(v, n) => n === 'pctMora' ? [`${v}%`, '% mora'] : [v, 'Contratos']} />
                  <Bar dataKey="total" name="Contratos" fill="#e0e7ff" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pctMora" name="% mora" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Cartera por ejecutivo */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <h2 className="text-base font-semibold text-gray-800">Cartera por ejecutivo</h2>
            </div>
            {ext.carteraPorEjecutivo.length === 0 ? (
              <div className="px-5 py-6 text-gray-400 text-sm">Sin datos</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Ejecutivo', 'Contratos', 'En mora', 'Saldo'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ext.carteraPorEjecutivo.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{e.nombre}</td>
                      <td className="px-4 py-2.5 text-gray-600">{e.contratos}</td>
                      <td className="px-4 py-2.5">
                        {e.enMora > 0
                          ? <span className="badge badge-danger">{e.enMora}</span>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-primary">{formatCurrency(e.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
