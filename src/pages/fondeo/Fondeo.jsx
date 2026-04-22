import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Landmark, Plus, AlertTriangle, TrendingUp, X, ChevronDown, ChevronRight } from 'lucide-react'
import {
  getFondeos, crearFondeo, actualizarFondeo,
  getTablaFondeo, marcarPagoFondeo, getDashboardFondeo,
} from '../../lib/fondeoApi'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

const TIPOS = [
  { value: 'institucional',   label: 'Institucional (FIRA, NAFINSA, banca)' },
  { value: 'friends_family',  label: 'Friends & Family' },
  { value: 'propio',          label: 'Capital propio' },
  { value: 'fondo_inversion', label: 'Fondo de inversión' },
]
const METODOS = ['frances','aleman','bullet']
const TIPO_COLORS = { institucional: '#2d43d0', friends_family: '#ff7900', propio: '#22c55e', fondo_inversion: '#8b5cf6' }

const diasParaVencer = (fecha) =>
  Math.ceil((new Date(fecha + 'T12:00:00') - new Date()) / 86400000)

const fmtM = (v) => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`

// ── Modal Nuevo Fondeo ────────────────────────────────────────
function ModalNuevoFondeo({ onClose, onCreated, userId }) {
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    nombre_fondeador: '', tipo: 'institucional', monto_total: '',
    tasa_anual: '', plazo_meses: '12', fecha_inicio: hoy,
    metodo: 'frances', moneda: 'MXN', notas: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const fechaVenc = (() => {
    if (!form.fecha_inicio || !form.plazo_meses) return ''
    const d = new Date(form.fecha_inicio + 'T12:00:00')
    d.setMonth(d.getMonth() + Number(form.plazo_meses))
    return d.toISOString().split('T')[0]
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      await crearFondeo({
        ...form,
        monto_total:  Number(form.monto_total),
        tasa_anual:   Number(form.tasa_anual),
        plazo_meses:  Number(form.plazo_meses),
        fecha_vencimiento: fechaVenc,
      }, userId)
      onCreated()
      onClose()
    } catch (err) {
      setError(err.code === '23505' ? 'Ya existe un fondeo con ese nombre y fecha.' : 'Error al guardar.')
    }
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-900">Nuevo fondeo / línea de crédito</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="label">Nombre del fondeador / inversionista *</label>
            <input required className="input" value={form.nombre_fondeador} onChange={e => set('nombre_fondeador', e.target.value)} placeholder="Nombre o institución" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo de fondeo</label>
              <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Método de amortización</label>
              <select className="input" value={form.metodo} onChange={e => set('metodo', e.target.value)}>
                <option value="frances">Francés (cuota fija)</option>
                <option value="aleman">Alemán (capital fijo)</option>
                <option value="bullet">Bullet (intereses + capital al final)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto total (MXN) *</label>
              <input required type="number" step="1000" className="input" value={form.monto_total} onChange={e => set('monto_total', e.target.value)} placeholder="1000000" />
            </div>
            <div>
              <label className="label">Tasa anual (%) *</label>
              <input required type="number" step="0.01" className="input" value={form.tasa_anual} onChange={e => set('tasa_anual', e.target.value)} placeholder="12.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Plazo (meses) *</label>
              <select className="input" value={form.plazo_meses} onChange={e => set('plazo_meses', e.target.value)}>
                {[3,6,12,18,24,36,48,60].map(p => <option key={p} value={p}>{p} meses</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha de inicio</label>
              <input type="date" className="input" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} />
            </div>
          </div>

          {fechaVenc && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Vencimiento estimado: <strong>{formatDate(fechaVenc)}</strong>
            </p>
          )}

          <div>
            <label className="label">Notas / condiciones adicionales</label>
            <textarea className="input" rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Garantías, condiciones especiales..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Creando...' : 'Crear fondeo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Card de fondeo ────────────────────────────────────────────
function FondeoCard({ fondeo, onVerTabla }) {
  const dias = diasParaVencer(fondeo.fecha_vencimiento)
  const pctUsado = fondeo.monto_total > 0 ? Math.min(100, (1 - fondeo.saldo / fondeo.monto_total) * 100) : 0
  const alerta = dias <= 60 && fondeo.estatus === 'Activo'

  return (
    <div className={`card border-l-4 ${alerta ? 'border-orange-400' : 'border-primary'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{fondeo.nombre_fondeador}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="badge badge-gray capitalize text-xs">
              {TIPOS.find(t => t.value === fondeo.tipo)?.label.split(' ')[0] ?? fondeo.tipo}
            </span>
            <span className="badge badge-gray text-xs capitalize">{fondeo.metodo}</span>
            {alerta && (
              <span className={`badge text-xs ${dias <= 30 ? 'badge-danger' : 'badge-warning'}`}>
                Vence en {dias}d
              </span>
            )}
          </div>
        </div>
        <button onClick={() => onVerTabla(fondeo)} className="btn-secondary text-xs shrink-0">
          Ver tabla
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
        <div>
          <p className="text-xs text-gray-400">Monto total</p>
          <p className="font-bold text-gray-900">{formatCurrency(fondeo.monto_total)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Saldo pendiente</p>
          <p className="font-bold text-primary">{formatCurrency(fondeo.saldo)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Tasa / Vencimiento</p>
          <p className="font-medium">{fondeo.tasa_anual}% · {formatDate(fondeo.fecha_vencimiento)}</p>
        </div>
      </div>

      {/* Barra de amortización */}
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pctUsado}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{pctUsado.toFixed(0)}% amortizado</p>
    </div>
  )
}

// ── Modal Tabla Fondeo ────────────────────────────────────────
function ModalTablaFondeo({ fondeo, onClose }) {
  const [tabla, setTabla]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTablaFondeo(fondeo.id).then(setTabla).finally(() => setLoading(false))
  }, [fondeo.id])

  const handleMarcar = async (filaId, estatus) => {
    await marcarPagoFondeo(filaId, estatus)
    const updated = await getTablaFondeo(fondeo.id)
    setTabla(updated)
  }

  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">{fondeo.nombre_fondeador}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(fondeo.monto_total)} · {fondeo.tasa_anual}% anual · {fondeo.plazo_meses} meses · {fondeo.metodo}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? <div className="py-10"><Spinner /></div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['#','Fecha','Capital','Interés','Total','Saldo','Estatus',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tabla.map(f => {
                  const vencida = f.estatus_pago !== 'Pagado' && f.fecha_pago < hoy
                  return (
                    <tr key={f.id} className={`hover:bg-gray-50 ${vencida ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-2.5 text-gray-500">{f.numero_pago}</td>
                      <td className="px-4 py-2.5">{formatDate(f.fecha_pago)}</td>
                      <td className="px-4 py-2.5">{formatCurrency(f.capital)}</td>
                      <td className="px-4 py-2.5 text-accent">{formatCurrency(f.interes)}</td>
                      <td className="px-4 py-2.5 font-semibold text-primary">{formatCurrency(f.total_pago)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{formatCurrency(f.saldo_insoluto)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`badge ${f.estatus_pago === 'Pagado' ? 'badge-success' : vencida ? 'badge-danger' : 'badge-warning'}`}>
                          {f.estatus_pago}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {f.estatus_pago !== 'Pagado' && (
                          <button onClick={() => handleMarcar(f.id, 'Pagado')}
                            className="text-xs text-green-600 hover:underline font-medium">
                            Marcar pagado
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function Fondeo() {
  const { user } = useAuthStore()
  const [tab, setTab]       = useState('fondeos')
  const [fondeos, setFondeos] = useState([])
  const [dash, setDash]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)
  const [fondeoActivo, setFondeoActivo] = useState(null)

  const cargar = async () => {
    setLoading(true)
    const [f, d] = await Promise.all([getFondeos(), getDashboardFondeo()])
    setFondeos(f)
    setDash(d)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const TIPO_PIE_COLORS = ['#2d43d0','#ff7900','#22c55e','#8b5cf6']

  return (
    <div>
      <PageHeader titulo="Fondeo" subtitulo="Gestión de líneas de crédito y cartera pasiva de Finco Arcos">
        <button onClick={() => setModal('nuevo')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo fondeo
        </button>
      </PageHeader>

      {/* KPIs */}
      {dash && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Fondeo vigente (saldo)', value: formatCurrency(dash.fondeoTotal), color: 'text-primary', bg: 'bg-blue-50' },
            { label: 'Cartera colocada activa', value: formatCurrency(dash.carteraTotal), color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Ratio apalancamiento', value: dash.apalancamiento != null ? `${dash.apalancamiento.toFixed(2)}x` : '—',
              color: dash.apalancamiento > 5 ? 'text-red-600' : 'text-emerald-600', bg: dash.apalancamiento > 5 ? 'bg-red-50' : 'bg-emerald-50',
            },
            { label: 'Fondeos próx. a vencer (<60d)', value: dash.proximosVencimiento.length,
              color: dash.proximosVencimiento.length > 0 ? 'text-orange-600' : 'text-gray-600',
              bg: dash.proximosVencimiento.length > 0 ? 'bg-orange-50' : 'bg-gray-50',
            },
          ].map(k => (
            <div key={k.label} className={`card ${k.bg} border-0`}>
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alertas de vencimiento */}
      {dash?.proximosVencimiento.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <p className="text-sm font-semibold text-orange-800">Fondeos próximos a vencer</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dash.proximosVencimiento.map(f => {
              const dias = diasParaVencer(f.fecha_vencimiento)
              return (
                <span key={f.id} className={`text-xs px-3 py-1 rounded-full font-medium ${dias <= 30 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  {f.nombre_fondeador} — {dias}d ({formatDate(f.fecha_vencimiento)})
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {[
          { key: 'fondeos',   label: 'Fondeos activos' },
          { key: 'calendario',label: 'Próximos pagos' },
          { key: 'dashboard', label: 'Apalancamiento' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="py-16"><Spinner /></div> : (
        <>
          {/* ── TAB: Fondeos ── */}
          {tab === 'fondeos' && (
            fondeos.length === 0 ? (
              <div className="card text-center py-16 text-gray-400">
                <Landmark size={40} className="mx-auto mb-3 opacity-30" />
                <p>No hay fondeos registrados</p>
                <button onClick={() => setModal('nuevo')} className="btn-primary mt-4">Agregar primer fondeo</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fondeos.filter(f => f.estatus === 'Activo').map(f => (
                  <FondeoCard key={f.id}
                    fondeo={{ ...f, saldo: dash?.fondeos.find(d => d.id === f.id)?.saldo ?? 0 }}
                    onVerTabla={fnd => { setFondeoActivo(fnd); setModal('tabla') }}
                  />
                ))}
                {fondeos.filter(f => f.estatus !== 'Activo').length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Histórico</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fondeos.filter(f => f.estatus !== 'Activo').map(f => (
                        <FondeoCard key={f.id} fondeo={{ ...f, saldo: 0 }}
                          onVerTabla={fnd => { setFondeoActivo(fnd); setModal('tabla') }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* ── TAB: Próximos pagos ── */}
          {tab === 'calendario' && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Pagos de fondeo — próximos 30 días</h2>
              {!dash?.proximosPagos.length ? (
                <div className="text-center py-10 text-gray-400">Sin pagos de fondeo en los próximos 30 días</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Fondeador','Fecha','Capital','Interés','Total'].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dash.proximosPagos.map(p => {
                      const fnd = fondeos.find(f => f.id === p.fondeo_id)
                      return (
                        <tr key={p.fondeo_id + p.numero_pago} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-medium text-gray-900">{fnd?.nombre_fondeador ?? '—'}</td>
                          <td className="py-3 pr-4">{formatDate(p.fecha_pago)}</td>
                          <td className="py-3 pr-4">{formatCurrency(p.capital)}</td>
                          <td className="py-3 pr-4 text-accent">{formatCurrency(p.interes)}</td>
                          <td className="py-3 pr-4 font-bold text-primary">{formatCurrency(p.total_pago)}</td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 border-gray-200 font-bold bg-gray-50">
                      <td colSpan={4} className="py-3 pr-4 text-gray-700">Total a pagar (30 días)</td>
                      <td className="py-3 text-primary">
                        {formatCurrency(dash.proximosPagos.reduce((s, p) => s + p.total_pago, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB: Apalancamiento ── */}
          {tab === 'dashboard' && dash && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie por tipo */}
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Saldo fondeo por tipo</h2>
                {dash.distribucionTipo.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-300 text-sm">Sin fondeos activos</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={dash.distribucionTipo} dataKey="saldo" nameKey="tipo" cx="50%" cy="50%"
                          innerRadius={45} outerRadius={75} paddingAngle={3}>
                          {dash.distribucionTipo.map((_, i) => (
                            <Cell key={i} fill={TIPO_PIE_COLORS[i % TIPO_PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [formatCurrency(v), 'Saldo']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                      {dash.distribucionTipo.map((d, i) => (
                        <div key={d.tipo} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: TIPO_PIE_COLORS[i % TIPO_PIE_COLORS.length] }} />
                          {d.tipo} ({d.pct}%)
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Cartera vs Fondeo */}
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">Apalancamiento</h2>
                <p className="text-xs text-gray-400 mb-4">Cartera colocada vs. fondeo utilizado</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={[{ name: 'Posición actual', cartera: dash.carteraTotal, fondeo: dash.fondeoTotal }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tickFormatter={fmtM} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip formatter={(v, n) => [formatCurrency(v), n === 'cartera' ? 'Cartera' : 'Fondeo']} />
                    <Bar dataKey="cartera" name="cartera" fill="#22c55e" radius={[4,4,0,0]} />
                    <Bar dataKey="fondeo"  name="fondeo"  fill="#2d43d0" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ratio cartera / fondeo</span>
                    <span className={`font-bold ${dash.apalancamiento > 5 ? 'text-red-600' : 'text-green-600'}`}>
                      {dash.apalancamiento != null ? `${dash.apalancamiento.toFixed(2)}x` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">Capital libre (cartera − fondeo)</span>
                    <span className="font-semibold">{formatCurrency(Math.max(0, dash.carteraTotal - dash.fondeoTotal))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {modal === 'nuevo' && (
        <ModalNuevoFondeo onClose={() => setModal(null)} onCreated={cargar} userId={user?.id} />
      )}
      {modal === 'tabla' && fondeoActivo && (
        <ModalTablaFondeo fondeo={fondeoActivo} onClose={() => { setModal(null); setFondeoActivo(null) }} />
      )}
    </div>
  )
}
