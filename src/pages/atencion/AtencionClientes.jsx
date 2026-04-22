import { useEffect, useState } from 'react'
import { MessageSquare, Plus, AlertTriangle, CheckCircle, Clock, Download, X } from 'lucide-react'
import { getQuejas, crearQueja, actualizarQueja, getStatsQuejas, exportarREUNE } from '../../lib/sacgApi'
import { useAuthStore } from '../../store/authStore'
import { formatDate } from '../../utils/format'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

const TIPOS  = ['Queja','Aclaración','Consulta','Reclamación']
const CANALES = ['Presencial','Telefónico','Email','Portal','Escrito']
const ESTATUS = ['Recibida','En proceso','Resuelta','Improcedente']

const badgeEstatus = (e) => ({
  Recibida:      'badge-warning',
  'En proceso':  'badge-info',
  Resuelta:      'badge-success',
  Improcedente:  'badge-gray',
})[e] ?? 'badge-gray'

const diasTranscurridos = (fecha) =>
  Math.floor((new Date() - new Date(fecha + 'T12:00:00')) / 86400000)

// ── Modal Nueva Queja ─────────────────────────────────────────
function ModalNuevaQueja({ onClose, onCreated, userId }) {
  const [form, setForm] = useState({
    tipo: 'Queja', canal: 'Email', cliente_nombre: '',
    numero_contrato: '', monto_reclamado: '', descripcion: '',
    fecha_recepcion: new Date().toISOString().split('T')[0],
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      await crearQueja({
        ...form,
        monto_reclamado: form.monto_reclamado ? Number(form.monto_reclamado) : null,
      }, userId)
      onCreated()
      onClose()
    } catch (err) {
      setError('Error al guardar. Verifica los datos.')
    }
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-900">Nueva queja / aclaración</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo *</label>
              <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Canal de recepción</label>
              <select className="input" value={form.canal} onChange={e => set('canal', e.target.value)}>
                {CANALES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Nombre del cliente</label>
            <input className="input" value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)} placeholder="Nombre o razón social" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">No. de contrato</label>
              <input className="input" value={form.numero_contrato} onChange={e => set('numero_contrato', e.target.value)} placeholder="ARR-2024-001" />
            </div>
            <div>
              <label className="label">Monto reclamado (MXN)</label>
              <input type="number" className="input" value={form.monto_reclamado} onChange={e => set('monto_reclamado', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="label">Fecha de recepción</label>
            <input type="date" className="input" value={form.fecha_recepcion} onChange={e => set('fecha_recepcion', e.target.value)} />
          </div>
          <div>
            <label className="label">Descripción *</label>
            <textarea required className="input" rows={4} value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Describe la queja o aclaración del cliente..." />
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

// ── Modal Atender/Resolver ────────────────────────────────────
function ModalAtender({ queja, onClose, onUpdated, userId }) {
  const [estatus, setEstatus] = useState(queja.estatus)
  const [resolucion, setResolucion] = useState(queja.resolucion ?? '')
  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await actualizarQueja(queja.id, {
        estatus,
        resolucion,
        ...(estatus === 'Resuelta' || estatus === 'Improcedente'
          ? { fecha_resolucion: new Date().toISOString().split('T')[0] }
          : {}),
      }, userId)
      onUpdated()
      onClose()
    } catch { /* silencioso */ }
    setGuardando(false)
  }

  const dias = diasTranscurridos(queja.fecha_recepcion)
  const vencida = queja.fecha_limite && new Date().toISOString().split('T')[0] > queja.fecha_limite

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Atender {queja.tipo.toLowerCase()}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Folio: {queja.folio} · {dias} días transcurridos
              {vencida && <span className="text-red-500 ml-1 font-medium">⚠ VENCIDA</span>}
            </p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-500 text-xs mb-1">Descripción</p>
            <p className="text-gray-800">{queja.descripcion}</p>
          </div>
          <div>
            <label className="label">Estatus</label>
            <select className="input" value={estatus} onChange={e => setEstatus(e.target.value)}>
              {ESTATUS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Resolución / respuesta al cliente</label>
            <textarea className="input" rows={4} value={resolucion}
              onChange={e => setResolucion(e.target.value)}
              placeholder="Describe la resolución y acciones tomadas..." />
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

// ── Página principal ──────────────────────────────────────────
export default function AtencionClientes() {
  const { user } = useAuthStore()
  const [quejas, setQuejas]     = useState([])
  const [stats, setStats]       = useState({ total: 0, abiertas: 0, vencidas: 0, resueltas: 0 })
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [quejaActiva, setQuejaActiva] = useState(null)
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [exportando, setExportando]     = useState(false)

  const cargar = async () => {
    setLoading(true)
    const [q, s] = await Promise.all([
      getQuejas({ estatus: filtroEstatus || undefined, tipo: filtroTipo || undefined }),
      getStatsQuejas(),
    ])
    setQuejas(q)
    setStats(s)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [filtroEstatus, filtroTipo])

  const handleExportarREUNE = async () => {
    setExportando(true)
    try { await exportarREUNE() } catch { /* silencioso */ }
    setExportando(false)
  }

  return (
    <div>
      <PageHeader titulo="Atención a Clientes" subtitulo="SACG — Registro de quejas, aclaraciones y consultas">
        <button onClick={handleExportarREUNE} className="btn-secondary flex items-center gap-2" disabled={exportando}>
          <Download size={16} /> {exportando ? 'Generando...' : 'Exportar REUNE'}
        </button>
        <button onClick={() => setModal('nueva')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva queja / aclaración
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total registradas',  value: stats.total,    icon: MessageSquare, color: 'text-gray-700',   bg: 'bg-gray-50' },
          { label: 'Abiertas',           value: stats.abiertas, icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Vencidas (>45 días)',value: stats.vencidas, icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50' },
          { label: 'Resueltas',          value: stats.resueltas,icon: CheckCircle,   color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`card ${s.bg} border-0`}>
              <div className="flex items-center gap-3">
                <Icon size={20} className={s.color} />
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Nota REUNE */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 mb-6">
        <strong>REUNE:</strong> El botón "Exportar REUNE" genera el padrón de clientes y sus productos en formato CSV listo para carga manual en el sistema de CONDUSEF.
        El plazo máximo de respuesta a quejas es <strong>30 días hábiles (~45 días naturales)</strong>.
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <select className="input w-auto" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="input w-auto" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
            <option value="">Todos los estatus</option>
            {ESTATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {loading ? <Spinner /> : quejas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay quejas registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Folio','Tipo','Cliente','Contrato','Días','Límite','Estatus',''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quejas.map(q => {
                  const dias = diasTranscurridos(q.fecha_recepcion)
                  const hoy = new Date().toISOString().split('T')[0]
                  const vencida = q.fecha_limite && q.fecha_limite < hoy && q.estatus !== 'Resuelta' && q.estatus !== 'Improcedente'
                  return (
                    <tr key={q.id} className={`hover:bg-gray-50 ${vencida ? 'bg-red-50' : ''}`}>
                      <td className="py-3 pr-4 font-mono text-xs font-medium text-primary">{q.folio}</td>
                      <td className="py-3 pr-4"><span className="badge badge-gray">{q.tipo}</span></td>
                      <td className="py-3 pr-4 font-medium text-gray-900 max-w-36 truncate">{q.cliente_nombre || '—'}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{q.numero_contrato || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`font-medium ${dias > 45 ? 'text-red-600' : dias > 30 ? 'text-yellow-600' : 'text-gray-700'}`}>
                          {dias}d {vencida && '⚠'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500">{formatDate(q.fecha_limite)}</td>
                      <td className="py-3 pr-4"><span className={`badge ${badgeEstatus(q.estatus)}`}>{q.estatus}</span></td>
                      <td className="py-3">
                        {q.estatus !== 'Resuelta' && q.estatus !== 'Improcedente' && (
                          <button
                            onClick={() => { setQuejaActiva(q); setModal('atender') }}
                            className="text-primary hover:underline text-xs font-medium"
                          >
                            Atender
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === 'nueva' && (
        <ModalNuevaQueja onClose={() => setModal(null)} onCreated={cargar} userId={user?.id} />
      )}
      {modal === 'atender' && quejaActiva && (
        <ModalAtender queja={quejaActiva} onClose={() => { setModal(null); setQuejaActiva(null) }} onUpdated={cargar} userId={user?.id} />
      )}
    </div>
  )
}
