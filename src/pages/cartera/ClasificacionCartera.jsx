import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Layers, Download, Info } from 'lucide-react'
import { getClasificacionCartera, ETAPAS, TASAS_RESERVA } from '../../lib/ifrs9Api'
import { usePortafolioStore } from '../../store/portafolioStore'
import { formatCurrency } from '../../utils/format'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

const fmtM = (v) => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`

const etapaBadge = (e) => ['', 'badge-success', 'badge-warning', 'badge-danger'][e] ?? 'badge-gray'

function exportCSV(clasificados) {
  const cols = ['Contrato','Tipo','Cliente','RFC','Saldo','Días atraso','Etapa','Reserva sugerida']
  const rows = clasificados.map(c => [
    c.numero_contrato, c.tipo, c.cliente, c.rfc,
    c.saldo.toFixed(2), c.diasAtraso, `Etapa ${c.etapa}`, c.reserva.toFixed(2),
  ])
  const csv = [cols, ...rows].map(r => r.join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `clasificacion_cartera_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

export default function ClasificacionCartera() {
  const { getFiltroPortafolio } = usePortafolioStore()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [filtroEtapa, setFiltroEtapa] = useState(0)
  const [busqueda, setBusqueda] = useState('')

  const portafolio = getFiltroPortafolio()

  useEffect(() => {
    setLoading(true)
    getClasificacionCartera(portafolio)
      .then(setData)
      .finally(() => setLoading(false))
  }, [portafolio])

  if (loading) return <div className="py-20"><Spinner texto="Clasificando cartera..." /></div>
  if (!data)   return <div className="card text-red-500">Error al cargar clasificación.</div>

  const { clasificados, summary, totalSaldo, totalReserva } = data

  const filtrados = clasificados.filter(c =>
    (filtroEtapa === 0 || c.etapa === filtroEtapa) &&
    (busqueda === '' ||
      c.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.numero_contrato.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.rfc.toLowerCase().includes(busqueda.toLowerCase()))
  )

  const pieData = ETAPAS.map(e => ({
    name: e.label, value: summary[e.id].saldo, fill: e.color,
  })).filter(d => d.value > 0)

  const barData = ETAPAS.map(e => ({
    etapa: e.label, saldo: summary[e.id].saldo, reserva: summary[e.id].reserva,
  }))

  return (
    <div>
      <PageHeader titulo="Clasificación de Cartera" subtitulo="IFRS 9 simplificado — Etapas de deterioro y reservas preventivas">
        <button onClick={() => exportCSV(clasificados)} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Exportar CSV
        </button>
      </PageHeader>

      {/* Nota metodológica */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 mb-6">
        <Info size={16} className="mt-0.5 shrink-0" />
        <div>
          <strong>Metodología simplificada.</strong> Etapa 1: 0 días en mora → reserva {(TASAS_RESERVA.etapa1*100).toFixed(0)}%.
          Etapa 2: 1-89 días → reserva {(TASAS_RESERVA.etapa2*100).toFixed(0)}%.
          Etapa 3: 90+ días → reserva {(TASAS_RESERVA.etapa3*100).toFixed(0)}%.
          Las tasas son orientativas; para reporte formal CNBV se requiere metodología de pérdida esperada.
        </div>
      </div>

      {/* KPI cards por etapa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {ETAPAS.map(e => (
          <button key={e.id} onClick={() => setFiltroEtapa(filtroEtapa === e.id ? 0 : e.id)}
            className={`card text-left transition-all border-2 ${filtroEtapa === e.id ? 'border-primary' : 'border-transparent'} hover:border-gray-300`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: e.color }} />
              <span className="text-xs font-semibold text-gray-600">{e.label}</span>
            </div>
            <p className="text-xs text-gray-400 mb-1">{e.desc} · {e.dias}</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(summary[e.id].saldo)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{summary[e.id].count} contratos</p>
            <p className="text-xs font-medium text-gray-700 mt-1">
              Reserva: <span className="font-bold">{formatCurrency(summary[e.id].reserva)}</span>
            </p>
          </button>
        ))}
        <div className="card bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Total cartera clasificada</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSaldo)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{clasificados.length} contratos</p>
          <p className="text-xs font-medium text-gray-700 mt-1">
            Reserva total: <span className="font-bold text-orange-600">{formatCurrency(totalReserva)}</span>
          </p>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Distribución de saldo por etapa</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">Sin datos</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(v), 'Saldo']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-5 mt-2">
                {ETAPAS.filter(e => summary[e.id].saldo > 0).map(e => (
                  <div key={e.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                    {e.label} ({totalSaldo > 0 ? (summary[e.id].saldo / totalSaldo * 100).toFixed(1) : 0}%)
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Saldo vs. Reserva sugerida por etapa</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="etapa" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tickFormatter={fmtM} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip formatter={(v, n) => [formatCurrency(v), n === 'saldo' ? 'Saldo' : 'Reserva']} />
              <Bar dataKey="saldo"   name="saldo"   fill="#2d43d0" radius={[3,3,0,0]} />
              <Bar dataKey="reserva" name="reserva" fill="#ff7900" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de contratos clasificados */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-800 flex-1">
            Detalle por contrato
            {filtroEtapa > 0 && <span className="text-primary ml-2">· Etapa {filtroEtapa}</span>}
          </h2>
          <input
            className="input w-full sm:w-64"
            placeholder="Buscar contrato, cliente, RFC..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {filtroEtapa > 0 && (
            <button onClick={() => setFiltroEtapa(0)} className="btn-secondary text-xs">
              Limpiar filtro
            </button>
          )}
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Layers size={36} className="mx-auto mb-2 opacity-30" />
            <p>Sin contratos en esta selección</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Contrato','Tipo','Cliente','Saldo insoluto','Días atraso','Etapa','Reserva sugerida'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(c => {
                  const etapaInfo = ETAPAS[c.etapa - 1]
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-mono text-xs text-primary font-medium">{c.numero_contrato}</td>
                      <td className="py-3 pr-4">
                        <span className="badge badge-gray capitalize">{c.tipo === 'arrendamiento' ? 'Arr.' : 'Crd.'}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900 truncate max-w-40">{c.cliente}</p>
                        <p className="text-xs text-gray-400 font-mono">{c.rfc}</p>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900">{formatCurrency(c.saldo)}</td>
                      <td className="py-3 pr-4">
                        <span className={`font-medium ${c.diasAtraso === 0 ? 'text-green-600' : c.diasAtraso < 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {c.diasAtraso === 0 ? '—' : `${c.diasAtraso}d`}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${etapaBadge(c.etapa)}`}>{etapaInfo?.label}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{etapaInfo?.desc}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-orange-600">{formatCurrency(c.reserva)}</p>
                        <p className="text-xs text-gray-400">{(TASAS_RESERVA[`etapa${c.etapa}`]*100).toFixed(0)}% del saldo</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr className="bg-gray-50">
                  <td colSpan={3} className="py-3 pr-4 text-xs font-semibold text-gray-600">
                    {filtrados.length} contratos
                  </td>
                  <td className="py-3 pr-4 font-bold text-gray-900">
                    {formatCurrency(filtrados.reduce((s, c) => s + c.saldo, 0))}
                  </td>
                  <td />
                  <td />
                  <td className="py-3 pr-4 font-bold text-orange-600">
                    {formatCurrency(filtrados.reduce((s, c) => s + c.reserva, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
