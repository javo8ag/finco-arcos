import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus, Eye, Search } from 'lucide-react'
import { getContratosArrendamiento } from '../../lib/contratosApi'
import { formatCurrency, formatDate, estatusColor } from '../../utils/format'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Contratos() {
  const navigate = useNavigate()
  const [contratos, setContratos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')

  useEffect(() => {
    getContratosArrendamiento({ estatus: filtroEstatus || undefined })
      .then(data => { setContratos(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filtroEstatus])

  const filtrados = contratos.filter(c => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      c.numero_contrato?.toLowerCase().includes(q) ||
      c.clientes?.razon_social?.toLowerCase().includes(q) ||
      c.clientes?.rfc?.toLowerCase().includes(q) ||
      `${c.marca} ${c.modelo}`.toLowerCase().includes(q)
    )
  })

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'

  return (
    <div>
      <PageHeader icon={FileText} titulo="Contratos" subtitulo="Arrendamientos financieros y créditos simples">
        <Link to="/contratos/nuevo-arrendamiento" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo arrendamiento
        </Link>
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
            <label className="label">Estatus</label>
            <select className="input" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
              <option value="">Todos</option>
              {['Activo','En mora','Vencido','Liquidado','Cancelado'].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          {(busqueda || filtroEstatus) && (
            <button className="btn-secondary text-sm"
              onClick={() => { setBusqueda(''); setFiltroEstatus('') }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner /> : filtrados.length === 0 ? (
        <EmptyState titulo="No hay contratos" descripcion="Crea el primer contrato de arrendamiento.">
          <Link to="/contratos/nuevo-arrendamiento" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Nuevo arrendamiento
          </Link>
        </EmptyState>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={thCls}>Contrato</th>
                  <th className={thCls}>Cliente</th>
                  <th className={thCls}>Vehículo</th>
                  <th className={thCls}>Valor activo</th>
                  <th className={thCls}>Renta mensual</th>
                  <th className={thCls}>Plazo</th>
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
                      <p className="text-sm font-medium text-gray-900">{c.clientes?.razon_social}</p>
                      <p className="text-xs text-gray-400">{c.clientes?.rfc}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {c.marca} {c.modelo} {c.anio}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(c.valor_activo)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                      {formatCurrency(c.renta_mensual)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.plazo_meses} m</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(c.fecha_inicio)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={estatusColor(c.estatus)}>{c.estatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/contratos/${c.id}`)}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalle">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{filtrados.length} contrato{filtrados.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
