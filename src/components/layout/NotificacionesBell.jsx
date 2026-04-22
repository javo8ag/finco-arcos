import { useState, useEffect, useRef } from 'react'
import { Bell, X, AlertTriangle, Clock, Shield, FileWarning } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getNotificaciones } from '../../lib/notificacionesApi'

const ICONS = {
  pago_vencido:      { icon: AlertTriangle, bg: 'bg-red-100',    text: 'text-red-600' },
  pago_fondeo:       { icon: Clock,         bg: 'bg-orange-100', text: 'text-orange-600' },
  alerta_pld:        { icon: Shield,        bg: 'bg-red-100',    text: 'text-red-600' },
  expediente_vencido:{ icon: FileWarning,   bg: 'bg-yellow-100', text: 'text-yellow-600' },
}

export default function NotificacionesBell() {
  const [open,   setOpen]   = useState(false)
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const cargar = async () => {
    setLoading(true)
    try { setNotifs(await getNotificaciones()) } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const danger  = notifs.filter(n => n.severity === 'danger').length
  const warning = notifs.filter(n => n.severity === 'warning').length
  const badge   = danger + warning

  const handleClick = (notif) => {
    setOpen(false)
    navigate(notif.link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); if (!open) cargar() }}
        className="relative p-2 rounded-lg text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
        title="Notificaciones"
      >
        <Bell size={18} />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Notificaciones</p>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</div>
            ) : notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Sin alertas pendientes</div>
            ) : (
              notifs.map(n => {
                const cfg = ICONS[n.tipo] ?? ICONS.expediente_vencido
                const Icon = cfg.icon
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                  >
                    <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={14} className={cfg.text} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{n.titulo}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{n.detalle}</p>
                      {n.fecha && <p className="text-[10px] text-gray-400 mt-1">{n.fecha}</p>}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {notifs.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                {danger > 0 && <span className="text-red-600 font-medium">{danger} urgentes</span>}
                {danger > 0 && warning > 0 && ' · '}
                {warning > 0 && <span className="text-orange-500 font-medium">{warning} advertencias</span>}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
