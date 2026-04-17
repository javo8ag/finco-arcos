import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { UserPlus, Pencil, ShieldOff, ShieldCheck, X, Save, Users } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { listarUsuarios, crearUsuario, actualizarUsuario } from '../../lib/usuariosApi'
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
]

const ROL_BADGE = {
  super_admin: 'badge-info',
  admin_fo:    'badge-success',
  analista:    'badge-gray',
  cobrador:    'badge-warning',
  lectura:     'badge-gray',
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{titulo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
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
            <p className="text-xs text-gray-400 mt-1">El usuario deberá cambiarla desde "Mi cuenta" al ingresar.</p>
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

      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
          <Save size={15} />
          {guardando ? 'Guardando...' : esNuevo ? 'Crear usuario' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

export default function Configuracion() {
  const { profile } = useAuthStore()
  const [usuarios, setUsuarios]     = useState([])
  const [cargando, setCargando]     = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [editando, setEditando]     = useState(null)

  const esSuperAdmin = profile?.rol === 'super_admin'

  useEffect(() => {
    if (esSuperAdmin) cargar()
  }, [esSuperAdmin])

  const cargar = async () => {
    setCargando(true)
    try {
      setUsuarios(await listarUsuarios())
    } catch {
      setError('No se pudieron cargar los usuarios.')
    }
    setCargando(false)
  }

  const handleCrear = async (data) => {
    setGuardando(true)
    setError('')
    try {
      await crearUsuario(data)
      await cargar()
      setModalNuevo(false)
    } catch (e) {
      setError(e?.message?.includes('already been registered')
        ? 'Ya existe un usuario con ese correo.'
        : e?.message || 'Error al crear el usuario.')
    }
    setGuardando(false)
  }

  const handleEditar = async (data) => {
    setGuardando(true)
    setError('')
    try {
      await actualizarUsuario(editando.id, { ...data, activo: editando.activo })
      await cargar()
      setEditando(null)
    } catch (e) {
      setError(e?.message || 'Error al actualizar.')
    }
    setGuardando(false)
  }

  const handleToggleActivo = async (u) => {
    setError('')
    try {
      await actualizarUsuario(u.id, {
        nombre: u.nombre, rol: u.rol, portafolio: u.portafolio, activo: !u.activo,
      })
      await cargar()
    } catch (e) {
      setError(e?.message || 'Error al actualizar.')
    }
  }

  if (!esSuperAdmin) {
    return (
      <div>
        <PageHeader titulo="Configuración" subtitulo="Gestión de usuarios y accesos" />
        <div className="card text-center py-16 text-gray-400">
          <ShieldOff size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Solo el Super Admin puede acceder a esta sección.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Configuración" subtitulo="Gestión de usuarios y accesos">
        <button
          onClick={() => setModalNuevo(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </PageHeader>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">
          {error}
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Users size={18} className="text-primary" />
          <h2 className="font-semibold text-gray-800">Usuarios del sistema</h2>
          <span className="ml-auto text-xs text-gray-400">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</span>
        </div>

        {cargando ? (
          <Spinner />
        ) : (
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
                      {u.activo !== false ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge badge-danger">Inactivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditando(u)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActivo(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.activo !== false
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={u.activo !== false ? 'Desactivar' : 'Activar'}
                        >
                          {u.activo !== false ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
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

      {/* Modal nuevo usuario */}
      {modalNuevo && (
        <Modal titulo="Nuevo usuario" onClose={() => { setModalNuevo(false); setError('') }}>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <FormUsuario
            esNuevo
            defaultValues={{ rol: 'analista', portafolio: '' }}
            onGuardar={handleCrear}
            guardando={guardando}
          />
        </Modal>
      )}

      {/* Modal editar usuario */}
      {editando && (
        <Modal titulo={`Editar: ${editando.nombre || editando.email}`} onClose={() => { setEditando(null); setError('') }}>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <FormUsuario
            esNuevo={false}
            defaultValues={{ nombre: editando.nombre, rol: editando.rol, portafolio: editando.portafolio || '' }}
            onGuardar={handleEditar}
            guardando={guardando}
          />
        </Modal>
      )}
    </div>
  )
}
