import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  UserPlus, Pencil, ShieldOff, ShieldCheck, X, Save, Users,
  Bell, ChevronRight, ArrowLeft, Trash2, KeyRound, Mail,
  AlertTriangle, ToggleLeft, ToggleRight, Info, Settings,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import {
  listarUsuarios, crearUsuario, actualizarUsuario,
  eliminarUsuario, enviarRecuperacion,
  getConfiguracion, setConfiguracionBatch,
} from '../../lib/usuariosApi'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin_fo',    label: 'Admin Family Office' },
  { value: 'analista',    label: 'Analista' },
  { value: 'cobrador',    label: 'Cobrador' },
  { value: 'lectura',     label: 'Solo lectura' },
]
const PORTAFOLIOS = [
  { value: '',               label: '— General (todos) —' },
  { value: 'Monarca Capital', label: 'Monarca Capital' },
  { value: 'Finco Arcos',    label: 'Finco Arcos' },
]
const ROL_BADGE = {
  super_admin: 'badge-info',
  admin_fo:    'badge-success',
  analista:    'badge-gray',
  cobrador:    'badge-warning',
  lectura:     'badge-gray',
}
const FRECUENCIAS = [
  { value: 'diario',   label: 'Diario'   },
  { value: 'semanal',  label: 'Semanal'  },
  { value: 'mensual',  label: 'Mensual'  },
]

function Modal({ titulo, onClose, children, maxW = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{titulo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Sección Usuarios ──────────────────────────────────────────
function SeccionUsuarios() {
  const [usuarios, setUsuarios]     = useState([])
  const [cargando, setCargando]     = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [editando, setEditando]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try { setUsuarios(await listarUsuarios()) } catch { setError('No se pudieron cargar los usuarios.') }
    setCargando(false)
  }

  const handleCrear = async (data) => {
    setGuardando(true); setError('')
    try {
      await crearUsuario(data)
      await cargar()
      setModalNuevo(false)
    } catch (e) {
      setError(e?.message?.includes('already been registered')
        ? 'Ya existe un usuario con ese correo.' : e?.message || 'Error al crear el usuario.')
    }
    setGuardando(false)
  }

  const handleEditar = async (data) => {
    setGuardando(true); setError('')
    try {
      await actualizarUsuario(editando.id, { ...data, activo: editando.activo })
      await cargar(); setEditando(null)
    } catch (e) { setError(e?.message || 'Error al actualizar.') }
    setGuardando(false)
  }

  const handleToggleActivo = async (u) => {
    setError('')
    try {
      await actualizarUsuario(u.id, { nombre: u.nombre, rol: u.rol, portafolio: u.portafolio, activo: !u.activo })
      await cargar()
    } catch (e) { setError(e?.message || 'Error al actualizar.') }
  }

  const handleRecuperacion = async (u) => {
    setError('')
    try {
      await enviarRecuperacion(u.email)
      alert(`Correo de restablecimiento enviado a ${u.email}`)
    } catch (e) { setError(e?.message || 'Error al enviar correo.') }
  }

  const handleEliminar = async (u) => {
    setError('')
    try {
      await eliminarUsuario(u.id)
      await cargar(); setConfirmDel(null)
    } catch (e) { setError(e?.message || 'Error al eliminar.') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Usuarios del sistema</h2>
          <p className="text-sm text-gray-400">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModalNuevo(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>Al crear un usuario, Supabase envía un correo de confirmación automáticamente. Para que llegue, debes tener SMTP configurado en <strong>Supabase → Project Settings → Auth → SMTP</strong>. Mientras tanto, el usuario puede iniciar sesión con la contraseña temporal que asignes.</span>
      </div>

      <div className="card">
        {cargando ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Nombre', 'Correo', 'Rol', 'Portafolio', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.nombre || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ROL_BADGE[u.rol] || 'badge-gray'}`}>
                        {ROLES.find(r => r.value === u.rol)?.label || u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.portafolio || 'General'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.activo !== false ? 'badge-success' : 'badge-danger'}`}>
                        {u.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditando(u)} title="Editar"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-blue-50 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleRecuperacion(u)} title="Enviar correo de recuperación"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => handleToggleActivo(u)} title={u.activo !== false ? 'Desactivar' : 'Activar'}
                          className={`p-1.5 rounded-lg transition-colors ${u.activo !== false ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}>
                          {u.activo !== false ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                        </button>
                        <button onClick={() => setConfirmDel(u)} title="Eliminar usuario"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nuevo */}
      {modalNuevo && (
        <Modal titulo="Nuevo usuario" onClose={() => { setModalNuevo(false); setError('') }}>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <FormUsuario esNuevo defaultValues={{ rol: 'analista', portafolio: '' }}
            onGuardar={handleCrear} guardando={guardando} />
        </Modal>
      )}

      {/* Modal editar */}
      {editando && (
        <Modal titulo={`Editar: ${editando.nombre || editando.email}`}
          onClose={() => { setEditando(null); setError('') }}>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <FormUsuario esNuevo={false}
            defaultValues={{ nombre: editando.nombre, rol: editando.rol, portafolio: editando.portafolio || '' }}
            onGuardar={handleEditar} guardando={guardando} />
        </Modal>
      )}

      {/* Confirmar eliminación */}
      {confirmDel && (
        <Modal titulo="Eliminar usuario" onClose={() => setConfirmDel(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-700">Esta acción es irreversible</p>
                <p className="text-red-600 mt-1">
                  Se eliminará <strong>{confirmDel.nombre || confirmDel.email}</strong> de Supabase Auth y de la base de datos. El usuario no podrá volver a iniciar sesión.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleEliminar(confirmDel)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
                Sí, eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FormUsuario({ defaultValues, onGuardar, guardando, esNuevo }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues })
  return (
    <form onSubmit={handleSubmit(onGuardar)} className="space-y-4">
      <div>
        <label className="label">Nombre completo *</label>
        <input {...register('nombre', { required: 'Requerido' })} className="input" placeholder="Ana García López" />
        {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
      </div>
      {esNuevo && (
        <>
          <div>
            <label className="label">Correo electrónico *</label>
            <input type="email" {...register('email', { required: 'Requerido' })} className="input" placeholder="ana@fincoarcos.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Contraseña temporal *</label>
            <input type="password" {...register('password', { required: 'Requerido', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} className="input" placeholder="Mínimo 8 caracteres" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            <p className="text-xs text-gray-400 mt-1">El usuario puede cambiarla desde "Mi cuenta". Se enviará correo de confirmación si tienes SMTP configurado.</p>
          </div>
        </>
      )}
      <div>
        <label className="label">Rol *</label>
        <select {...register('rol', { required: 'Requerido' })} className="input">
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Portafolio asignado</label>
        <select {...register('portafolio')} className="input">
          {PORTAFOLIOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <p className="text-xs text-gray-400 mt-1">Solo relevante para rol Admin Family Office.</p>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
          <Save size={15} /> {guardando ? 'Guardando...' : esNuevo ? 'Crear usuario' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

// ── Sección Notificaciones ────────────────────────────────────
function SeccionNotificaciones() {
  const { user } = useAuthStore()
  const [config, setConfig]       = useState(null)
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmOn, setConfirmOn] = useState(false)
  const [msg, setMsg]             = useState('')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try { setConfig(await getConfiguracion()) } catch {}
    setCargando(false)
  }

  const correoActivo = config?.correos_activos === 'true'

  const toggleCorreos = async (activar) => {
    if (activar) { setConfirmOn(true); return }
    await guardarClave('correos_activos', 'false')
  }

  const confirmarActivar = async () => {
    await guardarClave('correos_activos', 'true')
    setConfirmOn(false)
  }

  const guardarClave = async (clave, valor) => {
    setGuardando(true)
    try {
      await setConfiguracionBatch({ [clave]: valor }, user?.id)
      await cargar()
    } catch (e) { setMsg(e.message) }
    setGuardando(false)
  }

  const guardarCobranza = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    setGuardando(true)
    try {
      await setConfiguracionBatch({
        cobranza_frecuencia: fd.get('frecuencia'),
        cobranza_dia:        fd.get('dia'),
        cobranza_asunto:     fd.get('asunto'),
        cobranza_mensaje:    fd.get('mensaje'),
      }, user?.id)
      setMsg('Configuración guardada.')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) { setMsg(e.message) }
    setGuardando(false)
  }

  if (cargando) return <Spinner />

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Notificaciones y correos</h2>
        <p className="text-sm text-gray-400">Configura el envío automático de correos de cobranza a clientes</p>
      </div>

      {/* SMTP notice */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4 space-y-2">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-orange-500" />
          <p className="text-sm font-semibold text-orange-700">Requisito previo — Configurar SMTP</p>
        </div>
        <p className="text-xs text-orange-600">
          Para que los correos lleguen a los clientes necesitas configurar un proveedor SMTP en Supabase. Recomendamos <strong>Resend.com</strong> (gratis hasta 3,000 correos/mes).
        </p>
        <ol className="text-xs text-orange-600 space-y-0.5 list-decimal list-inside">
          <li>Crea cuenta en resend.com → obtén tu API Key</li>
          <li>En Supabase: <strong>Project Settings → Auth → SMTP Settings</strong></li>
          <li>Configura: Host <code>smtp.resend.com</code>, Port <code>465</code>, User <code>resend</code>, Pass = tu API Key</li>
          <li>Activa el toggle de abajo</li>
        </ol>
      </div>

      {/* Master toggle */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">Envío de correos</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {correoActivo
                ? '🟢 Activo — los correos de cobranza se enviarán según la configuración'
                : '🔴 Inactivo — no se enviará ningún correo a clientes'}
            </p>
          </div>
          <button onClick={() => toggleCorreos(!correoActivo)} disabled={guardando}
            className="transition-colors">
            {correoActivo
              ? <ToggleRight size={44} className="text-green-500" />
              : <ToggleLeft  size={44} className="text-gray-300" />}
          </button>
        </div>
      </div>

      {/* Config cobranza */}
      {correoActivo && (
        <div className="card space-y-4">
          <p className="font-semibold text-gray-800">Configuración de cobranza</p>
          <form onSubmit={guardarCobranza} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Frecuencia de envío</label>
                <select name="frecuencia" defaultValue={config?.cobranza_frecuencia || 'mensual'} className="input">
                  {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Día de envío (del mes o semana)</label>
                <input name="dia" type="number" min="1" max="31"
                  defaultValue={config?.cobranza_dia || '1'} className="input"
                  placeholder="1-31 para mensual, 1-7 para semanal" />
              </div>
            </div>

            <div>
              <label className="label">Asunto del correo</label>
              <input name="asunto" defaultValue={config?.cobranza_asunto} className="input"
                placeholder="Recordatorio de pago — {{numero_contrato}}" />
              <p className="text-xs text-gray-400 mt-1">Variables: <code>{'{{numero_contrato}}'}</code> <code>{'{{nombre}}'}</code> <code>{'{{monto}}'}</code> <code>{'{{fecha_vencimiento}}'}</code></p>
            </div>

            <div>
              <label className="label">Cuerpo del mensaje</label>
              <textarea name="mensaje" rows={5} defaultValue={config?.cobranza_mensaje} className="input"
                placeholder="Estimado {{nombre}}, su pago de {{monto}} vence el {{fecha_vencimiento}}..." />
              <p className="text-xs text-gray-400 mt-1">Usa las mismas variables arriba. El sistema las sustituye por los datos reales de cada cliente.</p>
            </div>

            {msg && <p className="text-sm text-green-600">{msg}</p>}

            <div className="flex justify-end">
              <button type="submit" disabled={guardando} className="btn-primary flex items-center gap-2">
                <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </form>

          {/* Preview */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">VISTA PREVIA DEL CORREO</p>
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-sm space-y-2">
              <p className="text-xs text-gray-400"><strong>Para:</strong> cliente@ejemplo.com</p>
              <p className="text-xs text-gray-400"><strong>Asunto:</strong> {(config?.cobranza_asunto || '').replace('{{numero_contrato}}', 'ARR-2024-001')}</p>
              <hr className="border-gray-200" />
              <p className="text-xs text-gray-600 whitespace-pre-wrap">
                {(config?.cobranza_mensaje || '')
                  .replace('{{nombre}}', 'Juan García')
                  .replace('{{periodo}}', '12')
                  .replace('{{monto}}', '$12,450.00')
                  .replace('{{fecha_vencimiento}}', '2026-05-01')
                  .replace('{{numero_contrato}}', 'ARR-2024-001')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación activar */}
      {confirmOn && (
        <Modal titulo="Activar envío de correos" onClose={() => setConfirmOn(false)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
              <div className="text-sm text-orange-700 space-y-1">
                <p className="font-semibold">Confirma antes de activar</p>
                <p>Al activar, el sistema comenzará a enviar correos a los clientes según la configuración guardada.</p>
                <p>Asegúrate de haber configurado el SMTP y revisado el mensaje antes de continuar.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOn(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={confirmarActivar} className="btn-primary flex-1">Sí, activar envío</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Pantalla de aterrizaje ─────────────────────────────────────
const SECCIONES = [
  {
    id: 'usuarios',
    icon: Users,
    titulo: 'Usuarios',
    desc: 'Crear, editar, activar/desactivar y eliminar cuentas de acceso al sistema',
    color: '#2d43d0',
  },
  {
    id: 'notificaciones',
    icon: Bell,
    titulo: 'Notificaciones',
    desc: 'Configurar envío automático de correos de cobranza y recordatorios a clientes',
    color: '#ff7900',
  },
]

export default function Configuracion() {
  const { profile } = useAuthStore()
  const [seccion, setSeccion] = useState(null)
  const esSuperAdmin = profile?.rol === 'super_admin'

  if (!esSuperAdmin) {
    return (
      <div>
        <PageHeader titulo="Configuración" subtitulo="Administración del sistema" />
        <div className="card text-center py-16 text-gray-400">
          <ShieldOff size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Solo el Super Admin puede acceder a esta sección.</p>
          <p className="text-xs mt-2 text-gray-300">
            Rol actual: <code className="bg-gray-100 px-1 rounded text-gray-500">{profile?.rol ?? 'sin perfil'}</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Configuración" subtitulo={seccion ? SECCIONES.find(s => s.id === seccion)?.titulo : 'Administración del sistema'}>
        {seccion && (
          <button onClick={() => setSeccion(null)} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Volver
          </button>
        )}
      </PageHeader>

      {!seccion ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
          {SECCIONES.map(s => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setSeccion(s.id)}
                className="card text-left hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${s.color}15` }}>
                    <Icon size={22} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 group-hover:text-primary transition-colors">{s.titulo}</p>
                    <p className="text-sm text-gray-400 mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </button>
            )
          })}
        </div>
      ) : seccion === 'usuarios' ? (
        <SeccionUsuarios />
      ) : (
        <SeccionNotificaciones />
      )}
    </div>
  )
}
