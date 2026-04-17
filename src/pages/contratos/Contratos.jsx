import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus, Eye, Search, ChevronDown } from 'lucide-react'
import { getContratosArrendamiento, getContratosCredito } from '../../lib/contratosApi'
import { formatCurrency, formatDate, estatusColor } from '../../utils/format'
import { usePortafolioStore } from '../../store/portafolioStore'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Contratos() {
  const navigate = useNavigate()
  const { getFiltroPortafolio } = usePortafolioStore()
  const [arrendamientos, setArrendamientos] = useState([])
  const [creditos, setCreditos]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [busqueda, setBusqueda]             = useState('')
  const [filtroEstatus, setFiltroEstatus]   = useState('')
  const [filtroTipo, setFiltroTipo]         = useState('todos')
  const [menuNuevo, setMenuNuevo]           = useState(false)

  const portafolio = getFiltroPortafolio()

  const cargar = async () => {
    setLoading(true)
    const [arr, crd] = await Promise.all([
      getContratosArrendamiento({ estatus: filtroEstatus || undefined, portafolio }),
      getContratosCredito({ estatus: filtroEstatus || undefined, portafolio }),
    ])
    setArrendamientos(arr ?? [])
    setCreditos(crd ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [filtroEstatus, portafolio])

  // Combinar y etiquetar
  const todos = [
    ...arrendamientos.map(c => ({ ...c, _tipo: 'arrendamiento' })),
    ...creditos.map(c => ({ ...c, _tipo: 'credito', valor_activo: c.monto_credito, renta_mensual: null })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const filtrados = todos.filter(c => {
    if (filtroTipo === 'arrendamiento' && c._tipo !== 'arrendamiento') return false
    if (filtroTipo === 'credito'       && c._tipo !== 'credito')       return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      c.numero_contrato?.toLowerCase().includes(q) ||
      c.clientes?.razon_social?.toLowerCase().includes(q) ||
      c.clientes?.rfc?.toLowerCase().includes(q) ||
      (c._tipo === 'arrendamiento' && `${c.marca} ${c.modelo}`.toLowerCase().includes(q)) ||
      c.proposito?.toLowerCase().includes(q)
    )
  })

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'

  return (
    <div>
      <PageHeader icon={FileText} titulo="Contratos" subtitulo="Arrendamientos financieros y créditos simples">
        {/* Menú desplegable nuevo */}
        <div className="relative">
          <button
            onClick={() => setMenuNuevo(v => !v)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo contrato <ChevronDown size={14} />
          </button>
          {menuNuevo && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-card z-10">
              <Link
                to="/contratos/nuevo-arrendamiento"
                onClick={() => setMenuNuevo(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                🚗 Arrendamiento financiero
              </Link>
              <Link
                to="/contratos/nuevo-credito"
                onClick={() => setMenuNuevo(false)}
                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg border-t border-gray-100"
              >
                💼 Crédito simple
              </Link>
            </div>
          )}
        </div>
      </PageHeader>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="label">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Contrato, cliente, vehículo..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="arrendamiento">Arrendamiento</option>
              <option value="credito">Crédito simple</option>
            </select>
          </div>
          <div>
            <label className="label">Estatus</label>
            <select className="input" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
              <option value="">Todos</option>
              {['Activo', 'En mora', 'Vencido', 'Liquidado', 'Cancelado'].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          {(busqueda || filtroEstatus || filtroTipo !== 'todos') && (
            <button className="btn-secondary text-sm"
              onClick={() => { setBusqueda(''); setFiltroEstatus(''); setFiltroTipo('todos') }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {loading ? <Spinner /> : filtrados.length === 0 ? (
        <EmptyState titulo="No hay contratos" descripcion="Crea tu primer contrato con el botón de arriba." />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={thCls}>Contrato</th>
                  <th className={thCls}>Tipo</th>
                  <th className={thCls}>Cliente</th>
                  <th className={thCls}>Bien / Destino</th>
                  <th className={thCls}>Monto</th>
                  <th className={thCls}>Pago mensual</th>
                  <th className={thCls}>Inicio</th>
                  <th className={thCls}>Estatus</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-primary font-medium">
                      {c.numero_contrato}
                    </td>
                    <td className="px-4 py-3">
                      {c._tipo === 'arrendamiento'
                        ? <span className="badge-info">Arrend.</span>
                        : <span className="badge-gray">Crédito</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{c.clientes?.razon_social}</p>
                      <p className="text-xs text-gray-400">{c.clientes?.rfc}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c._tipo === 'arrendamiento'
                        ? `${c.marca} ${c.modelo} ${c.anio}`
                        : c.proposito}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(c.valor_activo)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                      {c.renta_mensual ? formatCurrency(c.renta_mensual) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(c.fecha_inicio)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={estatusColor(c.estatus)}>{c.estatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(
                          c._tipo === 'arrendamiento'
                            ? `/contratos/${c.id}`
                            : `/contratos/credito/${c.id}`
                        )}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-6">
            <p className="text-xs text-gray-400">{filtrados.length} contratos</p>
            <p className="text-xs text-gray-400">
              {arrendamientos.length} arrendamientos · {creditos.length} créditos
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
