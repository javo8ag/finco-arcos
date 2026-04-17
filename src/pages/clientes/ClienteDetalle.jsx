import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit, User, Phone, Mail, MapPin, FileText, AlertTriangle } from 'lucide-react'
import { getClienteById } from '../../lib/clientesApi'
import { formatCurrency, formatDate, estatusColor } from '../../utils/format'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

const riesgoColor = { A: 'badge-success', B: 'badge-info', C: 'badge-warning', D: 'badge-danger' }
const riesgoLabel = { A: 'A — Excelente', B: 'B — Bueno', C: 'C — Regular', D: 'D — Alto riesgo' }

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    getClienteById(id)
      .then(data => { setCliente(data); setLoading(false) })
      .catch(() => { setError('No se pudo cargar el expediente.'); setLoading(false) })
  }, [id])

  if (loading) return <Spinner />
  if (error)   return <div className="card text-red-500">{error}</div>
  if (!cliente) return null

  return (
    <div>
      <PageHeader
        titulo={cliente.razon_social}
        subtitulo={`${cliente.tipo_persona} · RFC: ${cliente.rfc}`}
      >
        <button onClick={() => navigate('/clientes')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Regresar
        </button>
        <Link to={`/clientes/${id}/editar`} className="btn-primary flex items-center gap-2">
          <Edit size={16} /> Editar
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Datos generales */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={18} className="text-primary" /> Datos generales
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="RFC" value={cliente.rfc} />
              {cliente.curp && <InfoRow label="CURP" value={cliente.curp} />}
              {cliente.nombre_comercial && <InfoRow label="Nombre comercial" value={cliente.nombre_comercial} />}
              {cliente.representante_legal && <InfoRow label="Representante legal" value={cliente.representante_legal} />}
              <InfoRow label="Tipo de persona" value={cliente.tipo_persona === 'PFAE' ? 'Persona Física con Actividad Empresarial' : 'Persona Moral'} />
              <InfoRow label="Portafolio" value={cliente.portafolio || 'General'} />
            </div>
            {cliente.direccion_fiscal && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-0.5">Dirección fiscal</p>
                <p className="text-sm text-gray-800 flex items-start gap-1.5">
                  <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  {cliente.direccion_fiscal}
                </p>
              </div>
            )}
          </div>

          {/* Contacto */}
          {(cliente.telefono || cliente.email) && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Contacto</h2>
              <div className="flex flex-wrap gap-6">
                {cliente.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone size={15} className="text-primary" /> {cliente.telefono}
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail size={15} className="text-primary" /> {cliente.email}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contratos (placeholder) */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-primary" /> Contratos
            </h2>
            <p className="text-gray-400 text-sm text-center py-6">
              Los contratos de este cliente aparecerán aquí.
            </p>
          </div>

          {/* Notas */}
          {cliente.notas && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-800 mb-2">Notas internas</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{cliente.notas}</p>
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Riesgo y crédito */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Crédito y riesgo</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Clasificación</p>
                <span className={riesgoColor[cliente.clasificacion_riesgo]}>
                  {riesgoLabel[cliente.clasificacion_riesgo]}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Límite de crédito aprobado</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(cliente.limite_credito)}
                </p>
              </div>
              {cliente.origen_recursos && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Origen de recursos</p>
                  <p className="text-sm text-gray-700">{cliente.origen_recursos}</p>
                </div>
              )}
              {cliente.pep_flag && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={15} className="text-yellow-600 shrink-0" />
                  <p className="text-xs text-yellow-700 font-medium">Persona Políticamente Expuesta</p>
                </div>
              )}
            </div>
          </div>

          {/* Metadatos */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Información del registro</h2>
            <div className="space-y-3">
              <InfoRow label="Alta en el sistema" value={formatDate(cliente.created_at?.split('T')[0])} />
              <InfoRow label="Última actualización" value={formatDate(cliente.updated_at?.split('T')[0])} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
