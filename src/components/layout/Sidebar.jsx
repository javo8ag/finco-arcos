import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  BarChart2, Settings, LogOut, AlertTriangle, ChevronDown, Layers, Upload, UserCircle, Shield, BarChart3, MessageSquare, Landmark, Truck,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { usePortafolioStore, PORTAFOLIOS } from '../../store/portafolioStore'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes',      icon: Users,           label: 'Clientes' },
  { to: '/contratos',     icon: FileText,        label: 'Contratos' },
  { to: '/pagos',         icon: CreditCard,      label: 'Cobranza' },
  { to: '/moratorios',    icon: AlertTriangle,   label: 'Moratorios' },
  { to: '/reportes',      icon: BarChart2,       label: 'Reportes' },
  { to: '/clasificacion', icon: BarChart3,       label: 'IFRS 9' },
  { to: '/atencion',      icon: MessageSquare,   label: 'Atención' },
  { to: '/fondeo',         icon: Landmark,        label: 'Fondeo' },
  { to: '/activos',        icon: Truck,           label: 'Activos' },
  { to: '/pld',           icon: Shield,          label: 'PLD / FT' },
  { to: '/importacion',   icon: Upload,          label: 'Importación' },
  { to: '/configuracion', icon: Settings,        label: 'Configuración' },
]

function SelectorPortafolio({ profile }) {
  const { portafolioActivo, setPortafolio, getPortafolioInfo } = usePortafolioStore()
  const [abierto, setAbierto] = useState(false)
  const info = getPortafolioInfo()

  // admin_fo ve solo su portafolio, no puede cambiar
  if (profile?.rol === 'admin_fo') {
    return (
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-xs text-blue-300 opacity-60 mb-1">Portafolio</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#ff7900' }} />
          <span className="text-white text-sm font-medium">{profile.portafolio}</span>
        </div>
      </div>
    )
  }

  // super_admin puede cambiar de portafolio
  return (
    <div className="px-4 py-3 border-b border-white/10 relative">
      <p className="text-xs text-blue-300 opacity-60 mb-1.5">Vista activa</p>
      <button
        onClick={() => setAbierto(v => !v)}
        className="flex items-center justify-between w-full gap-2 bg-white/10 hover:bg-white/15 rounded-lg px-3 py-2 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: info.color }} />
          <span className="text-white text-sm font-medium truncate">{info.nombre}</span>
        </div>
        <ChevronDown size={14} className={`text-blue-300 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="absolute left-4 right-4 mt-1 bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100">
          {PORTAFOLIOS.map(p => (
            <button
              key={p.id ?? 'consolidado'}
              onClick={() => { setPortafolio(p.id); setAbierto(false) }}
              className={clsx(
                'flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0',
                portafolioActivo === p.id && 'bg-blue-50'
              )}
            >
              <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: p.color }} />
              <div>
                <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                <p className="text-xs text-gray-400">{p.descripcion}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { signOut, profile } = useAuthStore()
  const { getPortafolioInfo } = usePortafolioStore()
  const info = getPortafolioInfo()

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

      {/* Selector de portafolio */}
      <SelectorPortafolio profile={profile} />

      {/* Perfil */}
      {profile && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium shrink-0">
              {profile.nombre?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{profile.nombre || 'Usuario'}</p>
              <p className="text-blue-300 text-xs truncate opacity-70 capitalize">{profile.rol?.replace('_', ' ')}</p>
            </div>
            <Link to="/mi-cuenta" title="Mi cuenta" className="text-blue-300 hover:text-white transition-colors shrink-0">
              <UserCircle size={18} />
            </Link>
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

      {/* Indicador portafolio activo */}
      {info.id && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-white/5 flex items-center gap-2">
          <Layers size={14} className="text-blue-300" />
          <p className="text-xs text-blue-300">Filtrando: <span className="font-semibold text-white">{info.nombre}</span></p>
        </div>
      )}

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
