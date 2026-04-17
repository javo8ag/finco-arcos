import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save, Calculator } from 'lucide-react'
import { createContratoCredito, generarNumeroContrato } from '../../lib/contratosApi'
import { getClientes } from '../../lib/clientesApi'
import { generarTablaCredito } from '../../utils/amortizacion'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'
import PageHeader from '../../components/ui/PageHeader'

const schema = z.object({
  numero_contrato:      z.string().min(1, 'Requerido'),
  cliente_id:           z.string().uuid('Selecciona un cliente'),
  portafolio:           z.string().optional(),
  proposito:            z.string().min(1, 'Requerido'),
  monto_credito:        z.coerce.number().min(1, 'Requerido'),
  enganche:             z.coerce.number().min(0),
  plazo_meses:          z.coerce.number().min(1),
  tasa_ordinaria:       z.coerce.number().min(0.01, 'Requerido'),
  tasa_moratoria:       z.coerce.number().min(0.01, 'Requerido'),
  dias_gracia:          z.coerce.number().min(0),
  metodo_amortizacion:  z.enum(['frances', 'aleman']),
  fecha_inicio:         z.string().min(1, 'Requerido'),
})

const F = ({ label, children, error }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
)

export default function CreditoForm() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const { user }      = useAuthStore()
  const [clientes, setClientes]       = useState([])
  const [guardando, setGuardando]     = useState(false)
  const [errorGlobal, setErrorGlobal] = useState('')
  const [preview, setPreview]         = useState(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente_id:          params.get('cliente') || '',
      proposito:           'Capital de trabajo',
      enganche:            0,
      dias_gracia:         0,
      plazo_meses:         12,
      metodo_amortizacion: 'frances',
      tasa_moratoria:      0,
    },
  })

  const valores = watch()

  useEffect(() => {
    getClientes().then(setClientes)
    generarNumeroContrato('CRD').then(n => setValue('numero_contrato', n))
  }, [])

  const calcularPreview = () => {
    const { monto_credito, enganche, plazo_meses, tasa_ordinaria, fecha_inicio, metodo_amortizacion } = valores
    if (!monto_credito || !plazo_meses || !tasa_ordinaria || !fecha_inicio) return

    const tabla = generarTablaCredito({
      monto_credito, enganche, plazo_meses, tasa_ordinaria, fecha_inicio, metodo_amortizacion,
    })

    const totalPagar    = tabla.reduce((s, r) => s + r.total_pago, 0)
    const totalIntereses= tabla.reduce((s, r) => s + r.interes_ordinario, 0)
    const pagoMensual   = tabla[0]?.total_pago ?? 0

    setPreview({ pagoMensual, tabla: tabla.slice(0, 3), totalPagar, totalIntereses })
  }

  const onSubmit = async (data) => {
    setGuardando(true)
    setErrorGlobal('')
    try {
      const fechaFin = new Date(data.fecha_inicio + 'T12:00:00')
      fechaFin.setMonth(fechaFin.getMonth() + Number(data.plazo_meses))

      await createContratoCredito({
        ...data,
        fecha_vencimiento: fechaFin.toISOString().split('T')[0],
      }, user?.id)

      navigate('/contratos')
    } catch (e) {
      if (e.code === '23505') setErrorGlobal('Ya existe un contrato con ese número.')
      else setErrorGlobal('Error al guardar. Intenta de nuevo.')
    }
    setGuardando(false)
  }

  return (
    <div>
      <PageHeader titulo="Nuevo crédito simple" subtitulo="Capital de trabajo u otros destinos">
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
          <h2 className="text-base font-semibold text-gray-800 mb-4">Identificación</h2>
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

        {/* Destino del crédito */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Destino del crédito</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <F label="Propósito / Destino *" error={errors.proposito?.message}>
                <input {...register('proposito')} className="input"
                  placeholder="Capital de trabajo, compra de maquinaria, liquidez..." />
              </F>
            </div>
          </div>
        </div>

        {/* Condiciones financieras */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Condiciones financieras</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <F label="Monto del crédito (MXN) *" error={errors.monto_credito?.message}>
              <input type="number" step="1000" {...register('monto_credito')} className="input" placeholder="200000" />
            </F>
            <F label="Enganche (MXN)">
              <input type="number" step="1000" {...register('enganche')} className="input" placeholder="0" />
            </F>
            <F label="Plazo (meses) *" error={errors.plazo_meses?.message}>
              <select {...register('plazo_meses')} className="input">
                {[3, 6, 9, 12, 18, 24, 36, 48, 60].map(p => (
                  <option key={p} value={p}>{p} meses</option>
                ))}
              </select>
            </F>
            <F label="Tasa ordinaria anual (%) *" error={errors.tasa_ordinaria?.message}>
              <input type="number" step="0.01" {...register('tasa_ordinaria')} className="input" placeholder="24.00" />
            </F>
            <F label="Tasa moratoria anual (%) *" error={errors.tasa_moratoria?.message}>
              <input type="number" step="0.01" {...register('tasa_moratoria')} className="input" placeholder="48.00" />
            </F>
            <F label="Método de amortización">
              <select {...register('metodo_amortizacion')} className="input">
                <option value="frances">Francés (pago fijo)</option>
                <option value="aleman">Alemán (capital fijo)</option>
              </select>
            </F>
            <F label="Fecha de inicio *" error={errors.fecha_inicio?.message}>
              <input type="date" {...register('fecha_inicio')} className="input" />
            </F>
            <F label="Días de gracia">
              <input type="number" {...register('dias_gracia')} className="input" placeholder="0" />
            </F>
          </div>
        </div>

        {/* Simulador */}
        <div className="card border-2 border-primary/20 bg-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Calculator size={18} className="text-primary" /> Simulador de pagos
            </h2>
            <button type="button" onClick={calcularPreview} className="btn-primary text-sm">
              Calcular
            </button>
          </div>

          {!preview ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Llena las condiciones financieras y haz clic en <strong>Calcular</strong>.
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Pago mensual</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(preview.pagoMensual)}</p>
                  <p className="text-xs text-gray-400 mt-1">incluye IVA sobre interés</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Total a pagar</p>
                  <p className="text-xl font-bold text-gray-800">{formatCurrency(preview.totalPagar)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Total de intereses</p>
                  <p className="text-xl font-bold text-accent">{formatCurrency(preview.totalIntereses)}</p>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Primeros 3 pagos</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {['#', 'Fecha', 'Capital', 'Interés', 'IVA', 'Total', 'Saldo'].map(h => (
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
            {guardando ? 'Guardando crédito...' : 'Crear crédito'}
          </button>
        </div>
      </form>
    </div>
  )
}
