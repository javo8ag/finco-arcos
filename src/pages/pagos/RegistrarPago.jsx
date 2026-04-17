import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CreditCard, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { getContratoArrendamientoById, getContratoCreditoById, getTablaAmortizacion } from '../../lib/contratosApi'
import { registrarPago } from '../../lib/pagosApi'
import { aplicarPrelacion, calcularMoratorioFila } from '../../utils/prelacion'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

export default function RegistrarPago({ tipoContrato = 'arrendamiento' }) {
  const { contratoId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const contratoTipo = tipoContrato

  const [contrato, setContrato]         = useState(null)
  const [filasPendientes, setFilasPendientes] = useState([])
  const [loading, setLoading]           = useState(true)
  const [guardando, setGuardando]       = useState(false)
  const [error, setError]               = useState('')
  const [exito, setExito]               = useState(false)

  // Formulario
  const [monto, setMonto]           = useState('')
  const [fecha, setFecha]           = useState(new Date().toISOString().split('T')[0])
  const [formaPago, setFormaPago]   = useState('SPEI')
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas]           = useState('')

  // Prelación calculada
  const [prelacion, setPrelacion] = useState(null)

  useEffect(() => {
    Promise.all([
      contratoTipo === 'arrendamiento'
        ? getContratoArrendamientoById(contratoId)
        : getContratoCreditoById(contratoId),
      getTablaAmortizacion(contratoId, contratoTipo),
    ]).then(([c, tabla]) => {
      setContrato(c)
      const pendientes = tabla
        .filter(f => f.estatus_pago !== 'Pagado')
        .sort((a, b) => a.numero_pago - b.numero_pago)
      setFilasPendientes(pendientes)
      setLoading(false)
    }).catch(() => { setError('No se pudo cargar el contrato.'); setLoading(false) })
  }, [contratoId])

  // Calcular prelación cada vez que cambia el monto
  useEffect(() => {
    if (!monto || !contrato || filasPendientes.length === 0) { setPrelacion(null); return }
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) { setPrelacion(null); return }
    const result = aplicarPrelacion(montoNum, filasPendientes, contrato.tasa_moratoria)
    setPrelacion(result)
  }, [monto, filasPendientes, contrato])

  const proximoPago = filasPendientes[0]
  const moratorioProximo = contrato && proximoPago
    ? calcularMoratorioFila(proximoPago, contrato.tasa_moratoria)
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prelacion) return
    setGuardando(true)
    setError('')
    try {
      await registrarPago({
        contratoId,
        contratoTipo:        contratoTipo,
        clienteId:           contrato.cliente_id,
        fechaPago:           fecha,
        montoRecibido:       parseFloat(monto),
        formaPago,
        referencia,
        notas,
        userId:              user?.id,
        aplicadoMoratorios:  prelacion.aplicado_moratorios,
        aplicadoIntereses:   prelacion.aplicado_intereses,
        aplicadoCargos:      prelacion.aplicado_cargos,
        aplicadoCapital:     prelacion.aplicado_capital,
        tipoPago:            prelacion.tipo_pago,
        filasActualizar:     prelacion.filasActualizar,
        moratorio:           prelacion.moratorio,
      })
      setExito(true)
      setTimeout(() => navigate(contratoTipo === 'credito' ? `/contratos/credito/${contratoId}` : `/contratos/${contratoId}`), 1800)
    } catch {
      setError('Error al registrar el pago. Intenta de nuevo.')
    }
    setGuardando(false)
  }

  if (loading) return <Spinner />
  if (!contrato) return <div className="card text-red-500">{error}</div>

  if (exito) return (
    <div className="flex flex-col items-center justify-center min-h-96">
      <CheckCircle size={56} className="text-green-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-800">Pago registrado correctamente</h2>
      <p className="text-gray-500 mt-1">Redirigiendo al contrato...</p>
    </div>
  )

  return (
    <div>
      <PageHeader
        titulo="Registrar pago"
        subtitulo={`${contrato.numero_contrato} · ${contrato.clientes?.razon_social}`}
      >
        <button onClick={() => navigate(contratoTipo === 'credito' ? `/contratos/credito/${contratoId}` : `/contratos/${contratoId}`)} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Regresar
        </button>
      </PageHeader>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Columna izquierda: formulario */}
        <div className="space-y-6">

          {/* Próximo pago */}
          {proximoPago && (
            <div className={`rounded-xl border-2 p-5 ${moratorioProximo?.dias > 0 ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
              <div className="flex items-start gap-3">
                {moratorioProximo?.dias > 0
                  ? <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                  : <Info size={20} className="text-primary shrink-0 mt-0.5" />
                }
                <div>
                  <p className="font-semibold text-gray-800">
                    Pago #{proximoPago.numero_pago} — {formatDate(proximoPago.fecha_pago)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Total esperado: <strong>{formatCurrency(proximoPago.total_pago)}</strong>
                  </p>
                  {moratorioProximo?.dias > 0 && (
                    <p className="text-sm text-red-600 mt-1 font-medium">
                      {moratorioProximo.dias} días de atraso — Moratorio: {formatCurrency(moratorioProximo.total_moratorio)}
                    </p>
                  )}
                  {moratorioProximo?.dias > 0 && (
                    <p className="text-sm text-red-500 font-bold mt-1">
                      Total con moratorio: {formatCurrency(proximoPago.total_pago + moratorioProximo.total_moratorio)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Formulario */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-primary" /> Datos del pago
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Monto recibido (MXN) *</label>
                <input
                  type="number" step="0.01" min="0.01"
                  className="input text-lg font-semibold"
                  placeholder="0.00"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fecha de pago *</label>
                  <input type="date" className="input" value={fecha}
                    onChange={e => setFecha(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Forma de pago</label>
                  <select className="input" value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                    <option value="SPEI">Transferencia SPEI</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Referencia bancaria / Folio</label>
                <input className="input font-mono" placeholder="Número de operación o folio"
                  value={referencia} onChange={e => setReferencia(e.target.value)} />
              </div>
              <div>
                <label className="label">Notas</label>
                <textarea className="input" rows={2} placeholder="Observaciones opcionales..."
                  value={notas} onChange={e => setNotas(e.target.value)} />
              </div>

              <button type="submit" disabled={!prelacion || guardando}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base mt-2">
                <CreditCard size={18} />
                {guardando ? 'Registrando...' : 'Confirmar y registrar pago'}
              </button>
            </form>
          </div>
        </div>

        {/* Columna derecha: prelación */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Aplicación del pago (prelación)</h2>

            {!prelacion ? (
              <p className="text-gray-400 text-sm text-center py-8">
                Ingresa el monto para ver cómo se aplicará el pago.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Desglose */}
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  {[
                    { orden: '①', label: 'Moratorios (interés de mora + IVA)', monto: prelacion.aplicado_moratorios, color: 'text-red-600', show: prelacion.aplicado_moratorios > 0 },
                    { orden: '②', label: 'Intereses ordinarios + IVA 16%',     monto: prelacion.aplicado_intereses,  color: 'text-orange-600', show: true },
                    { orden: '③', label: 'Cargos adicionales (GPS, seguro…)',   monto: prelacion.aplicado_cargos,     color: 'text-yellow-600', show: true },
                    { orden: '④', label: 'Capital',                             monto: prelacion.aplicado_capital,    color: 'text-primary',    show: true },
                  ].filter(r => r.show).map(row => (
                    <div key={row.orden} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">{row.orden}</span>
                        <span className="text-sm text-gray-700">{row.label}</span>
                      </div>
                      <span className={`text-sm font-semibold ${row.color}`}>
                        {formatCurrency(row.monto)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total aplicado */}
                <div className="flex justify-between items-center bg-primary/5 rounded-lg px-4 py-3 border border-primary/20">
                  <span className="font-semibold text-gray-800">Total aplicado</span>
                  <span className="font-bold text-primary text-lg">{formatCurrency(parseFloat(monto))}</span>
                </div>

                {/* Sobrante */}
                {prelacion.restante > 0 && (
                  <div className="flex justify-between items-center bg-green-50 rounded-lg px-4 py-3 border border-green-200">
                    <span className="text-sm text-green-700">Sobrante (pago anticipado)</span>
                    <span className="font-semibold text-green-700">{formatCurrency(prelacion.restante)}</span>
                  </div>
                )}

                {/* Tipo de pago */}
                <div className="flex justify-between items-center text-sm text-gray-500 px-1">
                  <span>Tipo de pago detectado:</span>
                  <span className={`font-medium ${
                    prelacion.tipo_pago === 'Normal'     ? 'text-green-600'
                    : prelacion.tipo_pago === 'Parcial'  ? 'text-yellow-600'
                    : prelacion.tipo_pago === 'Anticipado' ? 'text-blue-600'
                    : 'text-gray-600'
                  }`}>{prelacion.tipo_pago}</span>
                </div>

                {/* Pagos que se liquidarán */}
                {prelacion.filasActualizar.length > 0 && (
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Pagos que se actualizarán:</p>
                    {prelacion.filasActualizar.map((f, i) => {
                      const fila = filasPendientes.find(p => p.id === f.id)
                      return (
                        <div key={i} className="flex justify-between text-xs text-gray-600 py-0.5">
                          <span>Pago #{fila?.numero_pago} — {formatDate(fila?.fecha_pago)}</span>
                          <span className={f.estatus_pago === 'Pagado' ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                            {f.estatus_pago}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Saldo del contrato */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">Resumen del contrato</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Pagos pendientes</span>
                <span className="font-medium">{filasPendientes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Próxima fecha de pago</span>
                <span className="font-medium">{formatDate(proximoPago?.fecha_pago)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tasa moratoria</span>
                <span className="font-medium">{contrato.tasa_moratoria}% anual</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Días de gracia</span>
                <span className="font-medium">{contrato.dias_gracia} días</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
