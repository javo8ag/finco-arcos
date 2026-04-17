import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Plus, Search, Eye, Edit, ChevronUp, ChevronDown } from 'lucide-react'
import { getClientes } from '../../lib/clientesApi'
import { formatCurrency } from '../../utils/format'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const riesgoColor = { A: 'badge-success', B: 'badge-info', C: 'badge-warning', D: 'badge-danger' }

export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState('')
  const [sortCol, setSortCol]     = useState('razon_social')
  const [sortDir, setSortDir]     = useState('asc')

  const cargar = async () => {
    setLoading(true)
    try {
      const data = await getClientes({ busqueda, tipo_persona: filtroTipo, clasificacion_riesgo: filtroRiesgo })
      setClientes(data)
    } catch {
      // silencioso — el usuario ve la tabla vacía
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [busqueda, filtroTipo, filtroRiesgo])

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = [...clientes].sort((a, b) => {
    const va = a[sortCol] ?? ''
    const vb = b[sortCol] ?? ''
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
  })

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return null
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700'

  return (
    <div>
      <PageHeader icon={Users} titulo="Clientes" subtitulo="Expedientes de personas físicas y morales">
        <Link to="/clientes/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo cliente
        </Link>
      </PageHeader>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="label">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Nombre, RFC..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Tipo de persona</label>
            <select className="input" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="PFAE">Persona Física (PFAE)</option>
              <option value="PM">Persona Moral</option>
            </select>
          </div>
          <div>
            <label className="label">Riesgo</label>
            <select className="input" value={filtroRiesgo} onChange={e => setFiltroRiesgo(e.target.value)}>
              <option value="">Todos</option>
              <option value="A">A — Excelente</option>
              <option value="B">B — Bueno</option>
              <option value="C">C — Regular</option>
              <option value="D">D — Alto riesgo</option>
            </select>
          </div>
          {(busqueda || filtroTipo || filtroRiesgo) && (
            <button
              className="btn-secondary text-sm"
              onClick={() => { setBusqueda(''); setFiltroTipo(''); setFiltroRiesgo('') }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {loading ? <Spinner /> : sorted.length === 0 ? (
        <EmptyState
          titulo="No se encontraron clientes"
          descripcion="Agrega tu primer cliente con el botón de arriba."
        >
          <Link to="/clientes/nuevo" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Nuevo cliente
          </Link>
        </EmptyState>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={thCls} onClick={() => toggleSort('razon_social')}>
                    <span className="flex items-center gap-1">Nombre / Razón social <SortIcon col="razon_social" /></span>
                  </th>
                  <th className={thCls} onClick={() => toggleSort('rfc')}>
                    <span className="flex items-center gap-1">RFC <SortIcon col="rfc" /></span>
                  </th>
                  <th className={thCls}>Tipo</th>
                  <th className={thCls} onClick={() => toggleSort('clasificacion_riesgo')}>
                    <span className="flex items-center gap-1">Riesgo <SortIcon col="clasificacion_riesgo" /></span>
                  </th>
                  <th className={thCls} onClick={() => toggleSort('limite_credito')}>
                    <span className="flex items-center gap-1">Límite crédito <SortIcon col="limite_credito" /></span>
                  </th>
                  <th className={thCls}>Portafolio</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{c.razon_social}</p>
                      {c.nombre_comercial && (
                        <p className="text-xs text-gray-400">{c.nombre_comercial}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{c.rfc}</td>
                    <td className="px-4 py-3">
                      <span className="badge-gray">{c.tipo_persona}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={riesgoColor[c.clasificacion_riesgo]}>{c.clasificacion_riesgo}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(c.limite_credito)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.portafolio || 'General'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => navigate(`/clientes/${c.id}`)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/clientes/${c.id}/editar`)}
                          className="p-1.5 text-gray-400 hover:text-accent hover:bg-orange-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{sorted.length} cliente{sorted.length !== 1 ? 's' : ''} encontrado{sorted.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
