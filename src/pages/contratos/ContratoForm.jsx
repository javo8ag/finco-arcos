import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save, Calculator } from 'lucide-react'
import { createContratoArrendamiento, generarNumeroContrato } from '../../lib/contratosApi'
import { getClientes } from '../../lib/clientesApi'
import { calcularRentaMensual, generarTablaAmortizacion } from '../../utils/amortizacion'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'
import PageHeader from '../../components/ui/PageHeader'

const schema = z.object({
  numero_contrato:  z.string().min(1, 'Requerido'),
  cliente_id:       z.string().uuid('Selecciona un cliente'),
  portafolio:       z.string().optional(),
  marca:            z.string().min(1, 'Requerido'),
  modelo:           z.string().min(1, 'Requerido'),
  anio:             z.coerce.number().min(2000).max(2100),
  niv:              z.string().optional(),
  placas:           z.string().optional(),
  valor_activo:     z.coerce.number().min(1, 'Requerido'),
  enganche:         z.coerce.number().min(0),
  plazo_meses:      z.coerce.number().min(1),
  tasa_ordinaria:   z.coerce.number().min(0.01, 'Requerido'),
  tasa_moratoria:   z.coerce.number().min(0.01, 'Requerido'),
  dias_gracia:      z.coerce.number().min(0),
  valor_residual:   z.coerce.number().min(0),
  gps_mensual:      z.coerce.number().min(0),
  seguro_mensual:   z.coerce.number().min(0),
  gastos_admin:     z.coerce.number().min(0),
  cargo_seguridad:  z.coerce.number().min(0),
  fecha_inicio:     z.string().min(1, 'Requerido'),
})

const F = ({ label, children, error }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
)

export default function ContratoForm() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const { user }      = useAuthStore()
  const [clientes, setClientes]     = useState([])
  const [guardando, setGuardando]   = useState(false)
  const [errorGlobal, setErrorGlobal] = useState('')
  const [preview, setPreview]       = useState(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente_id: params.get('cliente') || '',
      enganche: 0, valor_residual: 0, dias_gracia: 0,
      gps_mensual: 0, seguro_mensual: 0, gastos_admin: 0, cargo_seguridad: 0,
      tasa_moratoria: 0,
      plazo_meses: 24,
      anio: new Date().getFullYear(),
    },
  })

  const valores = watch()

  useEffect(() => {
    getClientes().then(setClientes)
    generarNumeroContrato('ARR').then(n => setValue('numero_contrato', n))
  }, [])

  const calcularPreview = () => {
    const { valor_activo, enganche, valor_residual, plazo_meses, tasa_ordinaria, fecha_inicio,
            gps_mensual, seguro_mensual, gastos_admin, cargo_seguridad } = valores

    if (!valor_activo || !plazo_meses || !tasa_ordinaria || !fecha_inicio) return

    const renta = calcularRentaMensual(
      Number(valor_activo), Number(enganche), Number(valor_residual),
      Number(plazo_meses), Number(tasa_ordinaria)
    )

    const tabla = generarTablaAmortizacion({
      valor_activo, enganche, valor_residual, plazo_meses, tasa_ordinaria,
      fecha_inicio, gps_mensual, seguro_mensual, gastos_admin, cargo_seguridad,
    })

    const totalPagar = tabla.reduce((s, r) => s + r.total_pago, 0)
    const totalIntereses = tabla.reduce((s, r) => s + r.interes_ordinario, 0)

    setPreview({ renta, tabla: tabla.slice(0, 3), totalPagar, totalIntereses })
  }

  const onSubmit = async (data) => {
    setGuardando(true)
    setErrorGlobal('')
    try {
      const anioActual = new Date().getFullYear()
      const fechaFin = new Date(data.fecha_inicio + 'T12:00:00')
      fechaFin.setMonth(fechaFin.getMonth() + Number(data.plazo_meses))

      const contrato = {
        ...data,
        fecha_vencimiento: fechaFin.toISOString().split('T')[0],
        renta_mensual: calcularRentaMensual(
          Number(data.valor_activo), Number(data.enganche), Number(data.valor_residual),
          Number(data.plazo_meses), Number(data.tasa_ordinaria)
        ),
      }

      await createContratoArrendamiento(contrato, user?.id)
      navigate('/contratos')
    } catch (e) {
      if (e.code === '23505') setErrorGlobal('Ya existe un contrato con ese número.')
      else setErrorGlobal('Error al guardar el contrato. Intenta de nuevo.')
    }
    setGuardando(false)
  }

  return (
    <div>
      <PageHeader titulo="Nuevo contrato de arrendamiento" subtitulo="Arrendamiento financiero vehicular">
        <button onClick={() => navigate('/contratos')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Regresar
        </button>
      </PageHeader>

      {errorGlobal && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {errorGlobal}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Identificación */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Identificación del contrato</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <F label="Número de contrato *" error={errors.numero_contrato?.message}>
              <input {...register('numero_contrato')} className="input font-mono" />
            </F>
            <F label="Cliente *" error={errors.cliente_id?.message}>
              <select {...register('cliente_id')} className="input">
                <option value="">— Seleccionar —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.razon_social} ({c.rfc})</option>
                ))}
              </select>
            </F>
            <F label="Portafolio">
              <select {...register('portafolio')} className="input">
                <option value="">— General —</option>
                <option value="Monarca Capital">Monarca Capital</option>
              </select>
            </F>
          </div>
        </div>

        {/* Bien arrendado */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Bien arrendado (vehículo)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <F label="Marca *" error={errors.marca?.message}>
              <input {...register('marca')} className="input" placeholder="Toyota" />
            </F>
            <F label="Modelo *" error={errors.modelo?.message}>
              <input {...register('modelo')} className="input" placeholder="Hilux 4x4" />
            </F>
            <F label="Año *" error={errors.anio?.message}>
              <input type="number" {...register('anio')} className="input" placeholder="2024" />
            </F>
            <F label="NIV / Número de serie">
              <input {...register('niv')} className="input font-mono" placeholder="3VWFE21C04M000001" />
            </F>
            <F label="Placas">
              <input {...register('placas')} className="input" placeholder="ABC-123-B" style={{ textTransform: 'uppercase' }} />
            </F>
          </div>
        </div>

        {/* Condiciones financieras */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Condiciones financieras</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <F label="Valor del activo (MXN) *" error={errors.valor_activo?.message}>
              <input type="number" step="1000" {...register('valor_activo')} className="input" placeholder="500000" />
            </F>
            <F label="Enganche / Renta anticipada (MXN)">
              <input type="number" step="1000" {...register('enganche')} className="input" placeholder="0" />
            </F>
            <F label="Valor residual / Opción de compra (MXN)">
              <input type="number" step="1000" {...register('valor_residual')} className="input" placeholder="0" />
            </F>
            <F label="Plazo (meses) *" error={errors.plazo_meses?.message}>
              <select {...register('plazo_meses')} className="input">
                {[12, 18, 24, 36, 48, 60].map(p => (
                  <option key={p} value={p}>{p} meses</option>
                ))}
              </select>
            </F>
            <F label="Tasa ordinaria anual (%) *" error={errors.tasa_ordinaria?.message}>
              <input type="number" step="0.01" {...register('tasa_ordinaria')} className="input" placeholder="18.00" />
            </F>
            <F label="Tasa moratoria anual (%) *" error={errors.tasa_moratoria?.message}>
              <input type="number" step="0.01" {...register('tasa_moratoria')} className="input" placeholder="36.00" />
            </F>
            <F label="Fecha de inicio *" error={errors.fecha_inicio?.message}>
              <input type="date" {...register('fecha_inicio')} className="input" />
            </F>
            <F label="Días de gracia">
              <input type="number" {...register('dias_gracia')} className="input" placeholder="0" />
            </F>
          </div>
        </div>

        {/* Cargos adicionales */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Cargos adicionales mensuales</h2>
          <p className="text-xs text-gray-400 mb-4">Dejar en 0 los que no apliquen</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <F label="GPS mensual (MXN)">
              <input type="number" step="0.01" {...register('gps_mensual')} className="input" placeholder="0" />
            </F>
            <F label="Seguro vehicular (MXN)">
              <input type="number" step="0.01" {...register('seguro_mensual')} className="input" placeholder="0" />
            </F>
            <F label="Gastos administrativos (MXN)">
              <input type="number" step="0.01" {...register('gastos_admin')} className="input" placeholder="0" />
            </F>
            <F label="Paquete de seguridad (MXN)">
              <input type="number" step="0.01" {...register('cargo_seguridad')} className="input" placeholder="0" />
            </F>
          </div>
        </div>

        {/* Simulador */}
        <div className="card border-2 border-primary/20 bg-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Calculator size={18} className="text-primary" /> Simulador de renta
            </h2>
            <button type="button" onClick={calcularPreview} className="btn-primary text-sm">
              Calcular
            </button>
          </div>

          {!preview ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Llena los datos financieros y haz clic en <strong>Calcular</strong> para ver la renta estimada.
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Renta mensual base</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(preview.renta)}</p>
                  <p className="text-xs text-gray-400 mt-1">sin IVA ni cargos</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Total a pagar ({valores.plazo_meses} pagos)</p>
                  <p className="text-xl font-bold text-gray-800">{formatCurrency(preview.totalPagar)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Total de intereses</p>
                  <p className="text-xl font-bold text-accent">{formatCurrency(preview.totalIntereses)}</p>
                </div>
              </div>

              {/* Primeros 3 pagos */}
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Primeros 3 pagos</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {['#', 'Fecha', 'Capital', 'Interés', 'IVA', 'Cargos', 'Total', 'Saldo'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.tabla.map(r => (
                      <tr key={r.numero_pago} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-500">{r.numero_pago}</td>
                        <td className="px-3 py-2">{formatDate(r.fecha_pago)}</td>
                        <td className="px-3 py-2">{formatCurrency(r.capital)}</td>
                        <td className="px-3 py-2">{formatCurrency(r.interes_ordinario)}</td>
                        <td className="px-3 py-2">{formatCurrency(r.iva_interes)}</td>
                        <td className="px-3 py-2">{formatCurrency(r.cargos_adicionales)}</td>
                        <td className="px-3 py-2 font-semibold text-primary">{formatCurrency(r.total_pago)}</td>
                        <td className="px-3 py-2 text-gray-500">{formatCurrency(r.saldo_insoluto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate('/contratos')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
            <Save size={16} />
            {guardando ? 'Guardando contrato...' : 'Crear contrato'}
          </button>
        </div>
      </form>
    </div>
  )
}
