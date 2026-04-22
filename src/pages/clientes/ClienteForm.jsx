import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save } from 'lucide-react'
import { createCliente, updateCliente, getClienteById } from '../../lib/clientesApi'
import { validarRFC } from '../../utils/format'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

const ACTIVIDADES_ECONOMICAS = [
  '11 — Agricultura, ganadería, silvicultura y pesca',
  '21 — Minería',
  '22 — Energía eléctrica y agua',
  '23 — Construcción',
  '31-33 — Industrias manufactureras',
  '43 — Comercio al por mayor',
  '46 — Comercio al por menor',
  '48-49 — Transportes y almacenamiento',
  '51 — Información y comunicaciones',
  '52 — Servicios financieros y seguros',
  '53 — Servicios inmobiliarios y de alquiler',
  '54 — Servicios profesionales y técnicos',
  '55 — Corporativos',
  '56 — Servicios de apoyo a los negocios',
  '61 — Servicios educativos',
  '62 — Servicios de salud',
  '71 — Esparcimiento y cultura',
  '72 — Alojamiento y alimentos',
  '81 — Otros servicios',
  '93 — Actividades gubernamentales',
]

const schema = z.object({
  tipo_persona:        z.enum(['PFAE', 'PM']),
  rfc:                 z.string().min(12, 'RFC inválido').max(13, 'RFC inválido')
                        .refine(v => validarRFC(v), 'El RFC no tiene formato válido'),
  curp:                z.string().optional(),
  razon_social:        z.string().min(2, 'Campo requerido'),
  nombre_comercial:    z.string().optional(),
  representante_legal: z.string().optional(),
  telefono:            z.string().optional(),
  email:               z.string().email('Email inválido').optional().or(z.literal('')),
  direccion_fiscal:    z.string().optional(),
  clasificacion_riesgo:z.enum(['A', 'B', 'C', 'D']),
  limite_credito:      z.coerce.number().min(0),
  pep_flag:            z.boolean().optional(),
  pep_parentesco:      z.string().optional(),
  origen_recursos:     z.string().optional(),
  actividad_economica: z.string().optional(),
  estructura_corporativa: z.string().optional(),
  perfil_monto_promedio:  z.coerce.number().optional(),
  perfil_frecuencia:      z.string().optional(),
  perfil_forma_pago:      z.string().optional(),
  fecha_actualizacion_expediente: z.string().optional(),
  portafolio:          z.string().optional(),
  notas:               z.string().optional(),
})

const inputCls = 'input'
const labelCls = 'label'
const errCls   = 'text-red-500 text-xs mt-1'

export default function ClienteForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading]   = useState(isEdit)
  const [guardando, setGuardando] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState('')

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_persona: 'PFAE',
      clasificacion_riesgo: 'B',
      limite_credito: 0,
      pep_flag: false,
    },
  })

  const tipoPersona = watch('tipo_persona')

  useEffect(() => {
    if (isEdit) {
      getClienteById(id)
        .then(data => { reset(data); setLoading(false) })
        .catch(() => { setErrorGlobal('No se pudo cargar el cliente.'); setLoading(false) })
    }
  }, [id])

  const onSubmit = async (data) => {
    setGuardando(true)
    setErrorGlobal('')
    try {
      if (isEdit) await updateCliente(id, data)
      else        await createCliente(data)
      navigate('/clientes')
    } catch (e) {
      if (e.code === '23505') setErrorGlobal('Ya existe un cliente con ese RFC.')
      else setErrorGlobal('Ocurrió un error al guardar. Intenta de nuevo.')
    }
    setGuardando(false)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader
        titulo={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
        subtitulo={isEdit ? 'Modifica los datos del expediente' : 'Alta de persona física o moral'}
      >
        <button onClick={() => navigate('/clientes')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Regresar
        </button>
      </PageHeader>

      {errorGlobal && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {errorGlobal}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de persona */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Tipo de persona</h2>
          <div className="flex gap-4">
            {['PFAE', 'PM'].map(tipo => (
              <label key={tipo} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={tipo} {...register('tipo_persona')}
                  className="text-primary focus:ring-primary" />
                <span className="text-sm font-medium">
                  {tipo === 'PFAE' ? 'Persona Física con Actividad Empresarial' : 'Persona Moral'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Datos fiscales */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Datos fiscales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>RFC *</label>
              <input {...register('rfc')} className={inputCls}
                placeholder={tipoPersona === 'PFAE' ? 'XAXX010101000' : 'XAX010101000'}
                style={{ textTransform: 'uppercase' }} />
              {errors.rfc && <p className={errCls}>{errors.rfc.message}</p>}
            </div>

            {tipoPersona === 'PFAE' && (
              <div>
                <label className={labelCls}>CURP</label>
                <input {...register('curp')} className={inputCls}
                  placeholder="XAXX010101HXXXXXX00"
                  style={{ textTransform: 'uppercase' }} />
              </div>
            )}

            <div className={tipoPersona === 'PM' ? 'md:col-span-2' : ''}>
              <label className={labelCls}>
                {tipoPersona === 'PFAE' ? 'Nombre completo *' : 'Razón social *'}
              </label>
              <input {...register('razon_social')} className={inputCls}
                placeholder={tipoPersona === 'PFAE' ? 'Juan García López' : 'Empresa S.A. de C.V.'} />
              {errors.razon_social && <p className={errCls}>{errors.razon_social.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Nombre comercial</label>
              <input {...register('nombre_comercial')} className={inputCls} placeholder="Nombre comercial" />
            </div>

            {tipoPersona === 'PM' && (
              <div>
                <label className={labelCls}>Representante legal</label>
                <input {...register('representante_legal')} className={inputCls} placeholder="Nombre del representante" />
              </div>
            )}

            <div className="md:col-span-2">
              <label className={labelCls}>Dirección fiscal</label>
              <input {...register('direccion_fiscal')} className={inputCls}
                placeholder="Calle, número, colonia, ciudad, estado, CP" />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input {...register('telefono')} className={inputCls} placeholder="442 123 4567" />
            </div>
            <div>
              <label className={labelCls}>Correo electrónico</label>
              <input {...register('email')} className={inputCls} placeholder="contacto@empresa.com" />
              {errors.email && <p className={errCls}>{errors.email.message}</p>}
            </div>
          </div>
        </div>

        {/* Crédito y riesgo */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Crédito y riesgo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Clasificación de riesgo</label>
              <select {...register('clasificacion_riesgo')} className={inputCls}>
                <option value="A">A — Excelente</option>
                <option value="B">B — Bueno</option>
                <option value="C">C — Regular</option>
                <option value="D">D — Alto riesgo</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Límite de crédito aprobado (MXN)</label>
              <input type="number" step="1000" {...register('limite_credito')}
                className={inputCls} placeholder="500000" />
              {errors.limite_credito && <p className={errCls}>{errors.limite_credito.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Portafolio / Family Office</label>
              <select {...register('portafolio')} className={inputCls}>
                <option value="">— General —</option>
                <option value="Monarca Capital">Monarca Capital</option>
              </select>
            </div>
          </div>

          {/* AML básico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelCls}>Origen de recursos</label>
              <input {...register('origen_recursos')} className={inputCls}
                placeholder="Ej. Actividad empresarial, inversiones..." />
            </div>
            <div className="flex items-center gap-3 mt-6">
              <input type="checkbox" id="pep" {...register('pep_flag')}
                className="w-4 h-4 text-primary rounded focus:ring-primary" />
              <label htmlFor="pep" className="text-sm text-gray-700 cursor-pointer">
                Persona Políticamente Expuesta (PEP)
              </label>
            </div>
          </div>
        </div>

        {/* KYC / PLD */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-1">KYC — Expediente PLD</h2>
          <p className="text-xs text-gray-400 mb-4">Datos de debida diligencia para prevención de lavado de dinero</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Actividad económica (SCIAN)</label>
              <select {...register('actividad_economica')} className={inputCls}>
                <option value="">— Seleccionar —</option>
                {ACTIVIDADES_ECONOMICAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {watch('pep_flag') && (
              <div className="md:col-span-2">
                <label className={labelCls}>Parentesco / cargo PEP</label>
                <input {...register('pep_parentesco')} className={inputCls}
                  placeholder="Ej. Titular / cónyuge de Secretario de Estado..." />
              </div>
            )}

            {tipoPersona === 'PM' && (
              <div className="md:col-span-2">
                <label className={labelCls}>Estructura corporativa (socios y beneficiario final)</label>
                <textarea {...register('estructura_corporativa')} className={inputCls} rows={3}
                  placeholder="Nombre y % de cada socio. Identificar al beneficiario controlador final..." />
              </div>
            )}

            <div>
              <label className={labelCls}>Monto promedio esperado por operación (MXN)</label>
              <input type="number" {...register('perfil_monto_promedio')} className={inputCls} placeholder="50000" />
            </div>
            <div>
              <label className={labelCls}>Frecuencia de operaciones</label>
              <select {...register('perfil_frecuencia')} className={inputCls}>
                <option value="">— Seleccionar —</option>
                {['Diaria','Semanal','Quincenal','Mensual','Bimestral','Trimestral','Eventual'].map(f => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Forma de pago habitual</label>
              <select {...register('perfil_forma_pago')} className={inputCls}>
                <option value="">— Seleccionar —</option>
                {['SPEI','Efectivo','Cheque','Mixto'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha última actualización expediente</label>
              <input type="date" {...register('fecha_actualizacion_expediente')} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Notas internas</h2>
          <textarea {...register('notas')} className={inputCls} rows={3}
            placeholder="Observaciones sobre el cliente..." />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate('/clientes')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
            <Save size={16} />
            {guardando ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}
