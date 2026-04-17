import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  BarChart2, Settings, LogOut, AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes',   icon: Users,            label: 'Clientes' },
  { to: '/contratos',  icon: FileText,         label: 'Contratos' },
  { to: '/pagos',       icon: CreditCard,       label: 'Cobranza' },
  { to: '/moratorios',  icon: AlertTriangle,    label: 'Moratorios' },
  { to: '/reportes',    icon: BarChart2,        label: 'Reportes' },
  { to: '/configuracion', icon: Settings,      label: 'Configuración' },
]

export default function Sidebar() {
  const { signOut, profile } = useAuthStore()

  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ background: '#02106c' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>
          <span className="text-white">FINCO</span>
          <span style={{ color: '#ff7900' }}> ARCOS</span>
        </span>
        <p className="text-xs text-blue-200 mt-0.5 opacity-70">Plataforma de Créditos</p>
      </div>

      {/* Perfil */}
      {profile && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
              {profile.nombre?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile.nombre || 'Usuario'}</p>
              <p className="text-blue-300 text-xs truncate opacity-70">{profile.rol || 'Admin'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Cerrar sesión */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
