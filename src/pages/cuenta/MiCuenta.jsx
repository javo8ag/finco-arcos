import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { User, Lock, Mail, Save, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { actualizarMiPerfil, cambiarPassword, cambiarEmail } from '../../lib/usuariosApi'
import PageHeader from '../../components/ui/PageHeader'

const ROLES_LABEL = {
  super_admin: 'Super Admin',
  admin_fo:    'Admin Family Office',
  analista:    'Analista',
  cobrador:    'Cobrador',
  lectura:     'Solo lectura',
}

function SeccionCard({ icon: Icon, titulo, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
        <Icon size={18} className="text-primary" />
        <h2 className="font-semibold text-gray-800">{titulo}</h2>
      </div>
      {children}
    </div>
  )
}

function Exito({ msg }) {
  return (
    <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm mt-3">
      <CheckCircle size={15} /> {msg}
    </div>
  )
}

function ErrorMsg({ msg }) {
  return (
    <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm mt-3">
      {msg}
    </div>
  )
}

// ── Datos del perfil ───────────────────────────────────────────
function FormPerfil({ profile, user, onActualizar }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { nombre: profile?.nombre || '' },
  })
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState(false)
  const [error, setError]         = useState('')

  const onSubmit = async (data) => {
    setGuardando(true)
    setExito(false)
    setError('')
    try {
      const updated = await actualizarMiPerfil(user.id, data)
      onActualizar(updated)
      setExito(true)
    } catch (e) {
      setError(e?.message || 'Error al guardar.')
    }
    setGuardando(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nombre completo</label>
          <input {...register('nombre', { required: 'Requerido' })} className="input" />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
        </div>
        <div>
          <label className="label">Correo electrónico</label>
          <input value={user?.email || ''} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
          <p className="text-xs text-gray-400 mt-1">Para cambiar el correo usa la sección de abajo.</p>
        </div>
        <div>
          <label className="label">Rol</label>
          <input value={ROLES_LABEL[profile?.rol] || profile?.rol || ''} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
        </div>
        <div>
          <label className="label">Portafolio</label>
          <input value={profile?.portafolio || 'General'} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
          <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      {exito && <Exito msg="Datos actualizados correctamente." />}
      {error && <ErrorMsg msg={error} />}
    </form>
  )
}

// ── Cambiar email ──────────────────────────────────────────────
function FormEmail() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState(false)
  const [error, setError]         = useState('')

  const onSubmit = async ({ email }) => {
    setGuardando(true)
    setExito(false)
    setError('')
    try {
      await cambiarEmail(email)
      setExito(true)
      reset()
    } catch (e) {
      setError(e?.message || 'Error al cambiar el correo.')
    }
    setGuardando(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="max-w-sm">
        <label className="label">Nuevo correo electrónico</label>
        <input
          type="email"
          {...register('email', { required: 'Requerido' })}
          className="input"
          placeholder="nuevo@correo.com"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        <p className="text-xs text-gray-400 mt-1">Recibirás un correo de confirmación en la nueva dirección.</p>
      </div>
      <div className="flex justify-end max-w-sm">
        <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
          <Save size={15} /> {guardando ? 'Enviando...' : 'Cambiar correo'}
        </button>
      </div>
      {exito && <Exito msg="Correo de confirmación enviado. Revisa tu nueva bandeja de entrada." />}
      {error && <ErrorMsg msg={error} />}
    </form>
  )
}

// ── Cambiar contraseña ─────────────────────────────────────────
function FormPassword() {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm()
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState(false)
  const [error, setError]         = useState('')

  const onSubmit = async ({ password }) => {
    setGuardando(true)
    setExito(false)
    setError('')
    try {
      await cambiarPassword(password)
      setExito(true)
      reset()
    } catch (e) {
      setError(e?.message || 'Error al cambiar la contraseña.')
    }
    setGuardando(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
        <div>
          <label className="label">Nueva contraseña</label>
          <input
            type="password"
            {...register('password', {
              required: 'Requerido',
              minLength: { value: 8, message: 'Mínimo 8 caracteres' },
            })}
            className="input"
            placeholder="Mínimo 8 caracteres"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Confirmar contraseña</label>
          <input
            type="password"
            {...register('confirmar', {
              required: 'Requerido',
              validate: v => v === watch('password') || 'Las contraseñas no coinciden',
            })}
            className="input"
            placeholder="Repite la contraseña"
          />
          {errors.confirmar && <p className="text-red-500 text-xs mt-1">{errors.confirmar.message}</p>}
        </div>
      </div>
      <div className="flex justify-end max-w-lg">
        <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
          <Lock size={15} /> {guardando ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </div>
      {exito && <Exito msg="Contraseña actualizada correctamente." />}
      {error && <ErrorMsg msg={error} />}
    </form>
  )
}

// ── Página principal ───────────────────────────────────────────
export default function MiCuenta() {
  const { user, profile, setProfile } = useAuthStore()

  return (
    <div>
      <PageHeader
        titulo="Mi cuenta"
        subtitulo="Administra tus datos personales y seguridad"
      />

      <div className="space-y-6">
        <SeccionCard icon={User} titulo="Datos del perfil">
          <FormPerfil
            profile={profile}
            user={user}
            onActualizar={(updated) => setProfile(updated)}
          />
        </SeccionCard>

        <SeccionCard icon={Mail} titulo="Cambiar correo electrónico">
          <FormEmail />
        </SeccionCard>

        <SeccionCard icon={Lock} titulo="Cambiar contraseña">
          <FormPassword />
        </SeccionCard>
      </div>
    </div>
  )
}
