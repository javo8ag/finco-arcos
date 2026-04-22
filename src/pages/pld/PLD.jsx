import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, FileText, Users, Plus, CheckCircle, Clock, Eye, X } from 'lucide-react'
import {
  getAlertas, crearAlerta, actualizarAlerta,
  getConsultasListas, registrarConsultaLista,
  getClientesExpedienteVencido, getStatsPLD,
} from '../../lib/pldApi'
import { useAuthStore } from '../../store/authStore'
import { formatDate } from '../../utils/format'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

const LISTAS = ['OFAC', 'ONU', 'SAT_69B', 'CNBV']
const TIPOS_ALERTA = [
  { value: 'OR',  label: 'OR — Operación Relevante',            desc: 'Efectivo ≥ $300K PFAE / $500K PM' },
  { value: 'OI',  label: 'OI — Operación Inusual',              desc: 'Se desvía del perfil transaccional' },
  { value: 'OIP', label: 'OIP — Operación Interna Preocupante', desc: 'Conducta interna sospechosa' },
]

const badgeAlerta = (tipo) => ({
  OR:  'badge-danger',
  OI:  'badge-warning',
  OIP: 'badge-info',
})[tipo] ?? 'badge-gray'

const badgeEstatus = (e) => ({
  'Pendiente':    'badge-warning',
  'En revisión':  'badge-info',
  'Resuelta':     'badge-success',
  'Escalada':     'badge-danger',
})[e] ?? 'badge-gray'

// ── Modal Nueva Alerta ────────────────────────────────────────
function ModalNuevaAlerta({ onClose, onCreated, userId }) {
  const [form, setForm] = useState({ tipo: 'OI', cliente_nombre: '', contrato_numero: '', monto: '', forma_pago: '', descripcion: '' })
  const [guardando, setGuardando] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await crearAlerta({
        ...form,
        monto: form.monto ? Number(form.monto) : null,
        origen: 'manual',
        creado_por: userId,
      })
      onCreated()
      onClose()
    } catch { /* silencioso */ }
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="font-semibold text-gray-900">Nueva alerta PLD</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Tipo de alerta *</label>
            <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS_ALERTA.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cliente / nombre</label>
              <input className="input" value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)} placeholder="Nombre o razón social" />
            </div>
            <div>
              <label className="label">No. contrato</label>
              <input className="input" value={form.contrato_numero} onChange={e => set('contrato_numero', e.target.value)} placeholder="ARR-2024-0001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto involucrado (MXN)</label>
              <input type="number" className="input" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Forma de pago</label>
              <select className="input" value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {['Efectivo','SPEI','Cheque'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Descripción de la alerta *</label>
            <textarea className="input" rows={3} required value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Describe la operación o conducta que genera la alerta..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Crear alerta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Resolver Alerta ─────────────────────────────────────
function ModalResolver({ alerta, onClose, onUpdated, userId }) {
  const [estatus, setEstatus] = useState(alerta.estatus)
  const [resolucion, setResolucion] = useState(alerta.resolucion ?? '')
  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await actualizarAlerta(alerta.id, {
        estatus,
        resolucion,
        atendido_por: userId,
        ...(estatus === 'Resuelta' ? { fecha_resolucion: new Date().toISOString().split('T')[0] } : {}),
      })
      onUpdated()
      onClose()
    } catch { /* silencioso */ }
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Atender alerta</h3>
            <p className="text-xs text-gray-500 mt-0.5">{alerta.cliente_nombre} · <span className={`badge ${badgeAlerta(alerta.tipo)}`}>{alerta.tipo}</span></p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Estatus</label>
            <select className="input" value={estatus} onChange={e => setEstatus(e.target.value)}>
              {['Pendiente','En revisión','Resuelta','Escalada'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Justificación / resolución</label>
            <textarea className="input" rows={4} value={resolucion}
              onChange={e => setResolucion(e.target.value)}
              placeholder="Describe el análisis y decisión tomada..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Consulta Lista Negra ────────────────────────────────
function ModalConsulta({ onClose, onCreated, userId }) {
  const [form, setForm] = useState({ cliente_nombre: '', lista: 'OFAC', resultado: 'Sin coincidencia', observaciones: '' })
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await registrarConsultaLista({ ...form, consultado_por: userId })
      onCreated()
      onClose()
    } catch { /* silencioso */ }
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="font-semibold text-gray-900">Registrar consulta a lista negra</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nombre / razón social consultada *</label>
            <input required className="input" value={form.cliente_nombre}
              onChange={e => set('cliente_nombre', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Lista consultada</label>
              <select className="input" value={form.lista} onChange={e => set('lista', e.target.value)}>
                {LISTAS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Resultado</label>
              <select className="input" value={form.resultado} onChange={e => set('resultado', e.target.value)}>
                {['Sin coincidencia','Coincidencia encontrada','Error en consulta'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Observaciones</label>
            <textarea className="input" rows={3} value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function PLD() {
  const { user } = useAuthStore()
  const [tab, setTab]           = useState('alertas')
  const [alertas, setAlertas]   = useState([])
  const [consultas, setConsultas] = useState([])
  const [expedientes, setExpedientes] = useState([])
  const [stats, setStats]       = useState({ pendientes: 0, OR: 0, OI: 0, OIP: 0 })
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null) // 'nueva' | 'resolver' | 'consulta'
  const [alertaActiva, setAlertaActiva] = useState(null)
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')

  const cargar = async () => {
    setLoading(true)
    const [a, c, e, s] = await Promise.all([
      getAlertas({ tipo: filtroTipo || undefined, estatus: filtroEstatus || undefined }),
      getConsultasListas(),
      getClientesExpedienteVencido(),
      getStatsPLD(),
    ])
    setAlertas(a)
    setConsultas(c)
    setExpedientes(e)
    setStats(s)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [filtroTipo, filtroEstatus])

  const abrirResolver = (alerta) => { setAlertaActiva(alerta); setModal('resolver') }

  return (
    <div>
      <PageHeader titulo="PLD / FT" subtitulo="Prevención de Lavado de Dinero y Financiamiento al Terrorismo">
        <button onClick={() => setModal('nueva')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva alerta
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pendientes', value: stats.pendientes, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Op. Relevantes (OR)', value: stats.OR, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Op. Inusuales (OI)', value: stats.OI, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Op. Int. Preocupantes (OIP)', value: stats.OIP, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className={`card ${s.bg} border-0`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {[
          { key: 'alertas',    label: 'Alertas',              icon: AlertTriangle },
          { key: 'consultas',  label: 'Consultas a listas',   icon: FileText },
          { key: 'expedientes',label: 'Expedientes vencidos', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={15} /> {label}
            {key === 'expedientes' && expedientes.length > 0 && (
              <span className="badge badge-warning ml-1">{expedientes.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* ── TAB: Alertas ── */}
          {tab === 'alertas' && (
            <div className="card">
              <div className="flex gap-3 mb-4">
                <select className="input w-auto" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                  <option value="">Todos los tipos</option>
                  {['OR','OI','OIP'].map(t => <option key={t}>{t}</option>)}
                </select>
                <select className="input w-auto" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
                  <option value="">Todos los estatus</option>
                  {['Pendiente','En revisión','Resuelta','Escalada'].map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={() => setModal('nueva')} className="btn-primary ml-auto flex items-center gap-2">
                  <Plus size={15} /> Nueva alerta manual
                </button>
              </div>

              {alertas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Shield size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No hay alertas registradas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Tipo','Cliente','Contrato','Monto','Origen','Estatus','Fecha',''].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {alertas.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4"><span className={`badge ${badgeAlerta(a.tipo)}`}>{a.tipo}</span></td>
                          <td className="py-3 pr-4 font-medium text-gray-900">{a.cliente_nombre || '—'}</td>
                          <td className="py-3 pr-4 text-gray-500">{a.contrato_numero || '—'}</td>
                          <td className="py-3 pr-4">{a.monto ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(a.monto) : '—'}</td>
                          <td className="py-3 pr-4">
                            <span className={`badge ${a.origen === 'automatico' ? 'badge-info' : 'badge-gray'}`}>
                              {a.origen === 'automatico' ? 'Auto' : 'Manual'}
                            </span>
                          </td>
                          <td className="py-3 pr-4"><span className={`badge ${badgeEstatus(a.estatus)}`}>{a.estatus}</span></td>
                          <td className="py-3 pr-4 text-gray-400 text-xs">{formatDate(a.created_at)}</td>
                          <td className="py-3">
                            <button onClick={() => abrirResolver(a)}
                              className="text-primary hover:underline text-xs font-medium flex items-center gap-1">
                              <Eye size={13} /> Atender
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Consultas a listas ── */}
          {tab === 'consultas' && (
            <div className="card">
              <div className="flex justify-end mb-4">
                <button onClick={() => setModal('consulta')} className="btn-primary flex items-center gap-2">
                  <Plus size={15} /> Registrar consulta
                </button>
              </div>

              {consultas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No hay consultas registradas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Nombre consultado','Lista','Resultado','Observaciones','Fecha'].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {consultas.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-medium text-gray-900">{c.cliente_nombre}</td>
                          <td className="py-3 pr-4"><span className="badge badge-info">{c.lista}</span></td>
                          <td className="py-3 pr-4">
                            <span className={`badge ${c.resultado === 'Sin coincidencia' ? 'badge-success' : c.resultado === 'Coincidencia encontrada' ? 'badge-danger' : 'badge-warning'}`}>
                              {c.resultado}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-500 max-w-xs truncate">{c.observaciones || '—'}</td>
                          <td className="py-3 pr-4 text-gray-400 text-xs">{formatDate(c.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Expedientes vencidos ── */}
          {tab === 'expedientes' && (
            <div className="card">
              <p className="text-sm text-gray-500 mb-4">
                Clientes cuyo expediente KYC no ha sido actualizado en los últimos 12 meses o nunca han sido actualizados.
              </p>
              {expedientes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle size={40} className="mx-auto mb-3 opacity-30 text-green-400" />
                  <p>Todos los expedientes están al día</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Cliente','RFC','Tipo','Última actualización'].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {expedientes.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-medium text-gray-900">{c.razon_social}</td>
                          <td className="py-3 pr-4 font-mono text-xs">{c.rfc}</td>
                          <td className="py-3 pr-4"><span className="badge badge-gray">{c.tipo_persona}</span></td>
                          <td className="py-3 pr-4">
                            {c.fecha_actualizacion_expediente
                              ? <span className="badge badge-warning">{formatDate(c.fecha_actualizacion_expediente)}</span>
                              : <span className="badge badge-danger">Nunca actualizado</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modales */}
      {modal === 'nueva' && (
        <ModalNuevaAlerta onClose={() => setModal(null)} onCreated={cargar} userId={user?.id} />
      )}
      {modal === 'resolver' && alertaActiva && (
        <ModalResolver alerta={alertaActiva} onClose={() => { setModal(null); setAlertaActiva(null) }} onUpdated={cargar} userId={user?.id} />
      )}
      {modal === 'consulta' && (
        <ModalConsulta onClose={() => setModal(null)} onCreated={cargar} userId={user?.id} />
      )}
    </div>
  )
}
