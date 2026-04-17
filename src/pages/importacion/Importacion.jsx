import { useRef, useState } from 'react'
import Papa from 'papaparse'
import {
  Upload, Download, CheckCircle, XCircle, AlertCircle,
  FileText, ChevronDown, ChevronUp, Loader,
} from 'lucide-react'
import {
  COLS_ARR, COLS_CRD,
  plantillaArrendamiento, plantillaCredito,
  validarArrendamiento, validarCredito,
  importarFilaArrendamiento, importarFilaCredito,
} from '../../lib/importApi'
import { useAuthStore } from '../../store/authStore'
import PageHeader from '../../components/ui/PageHeader'

// ── Descarga de archivo en el browser ─────────────────────────
function descargarCsv(contenido, nombre) {
  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

// ── Badge de estado por fila ───────────────────────────────────
function EstadoBadge({ estado }) {
  if (estado === 'ok')
    return <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium"><CheckCircle size={12} /> Importado</span>
  if (estado === 'error')
    return <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium"><XCircle size={12} /> Error</span>
  if (estado === 'invalido')
    return <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full text-xs font-medium"><AlertCircle size={12} /> Inválido</span>
  return <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium"><FileText size={12} /> Pendiente</span>
}

// ── Fila expandible de la tabla de preview ─────────────────────
function FilaPreview({ fila, index, tipo }) {
  const [expand, setExpand] = useState(false)
  const cols = tipo === 'arrendamiento' ? COLS_ARR : COLS_CRD
  const tieneErrores = fila.errores.length > 0

  return (
    <>
      <tr
        className={`border-t border-gray-100 text-sm ${tieneErrores ? 'bg-yellow-50/40' : fila.estado === 'ok' ? 'bg-green-50/40' : fila.estado === 'error' ? 'bg-red-50/40' : ''}`}
      >
        <td className="px-3 py-2 text-gray-400 text-center">{index + 1}</td>
        <td className="px-3 py-2 font-mono text-xs">{fila.data.numero_contrato || '—'}</td>
        <td className="px-3 py-2 max-w-[160px] truncate">{fila.data.razon_social || '—'}</td>
        <td className="px-3 py-2 font-mono text-xs">{fila.data.rfc || '—'}</td>
        <td className="px-3 py-2 text-center">{fila.data.portafolio || 'Finco'}</td>
        <td className="px-3 py-2 text-center">
          <EstadoBadge estado={tieneErrores ? 'invalido' : fila.estado} />
        </td>
        <td className="px-3 py-2">
          {fila.estado === 'error' && fila.mensaje && (
            <span className="text-red-600 text-xs">{fila.mensaje}</span>
          )}
          {tieneErrores && !fila.estado && (
            <button
              onClick={() => setExpand(v => !v)}
              className="flex items-center gap-1 text-yellow-700 text-xs hover:underline"
            >
              {fila.errores.length} error{fila.errores.length > 1 ? 'es' : ''}
              {expand ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </td>
      </tr>
      {expand && tieneErrores && (
        <tr className="bg-yellow-50">
          <td colSpan={7} className="px-4 py-2">
            <ul className="list-disc list-inside text-xs text-yellow-800 space-y-0.5">
              {fila.errores.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Componente principal ───────────────────────────────────────
export default function Importacion() {
  const { user }          = useAuthStore()
  const [tab, setTab]     = useState('arrendamiento')
  const [filas, setFilas] = useState([])
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso]     = useState({ actual: 0, total: 0 })
  const fileRef = useRef(null)

  const esArr = tab === 'arrendamiento'

  // ── Descarga de plantilla ──────────────────────────────────
  const handleDescarga = () => {
    if (esArr) {
      descargarCsv(plantillaArrendamiento(), 'plantilla_arrendamiento.csv')
    } else {
      descargarCsv(plantillaCredito(), 'plantilla_credito.csv')
    }
  }

  // ── Carga y parseo de CSV ──────────────────────────────────
  const handleArchivo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFilas([])

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      transform: v => v.trim(),
      complete: ({ data }) => {
        const validar = esArr ? validarArrendamiento : validarCredito
        const parsed = data.map(row => ({
          data:    row,
          errores: validar(row),
          estado:  null,
          mensaje: null,
        }))
        setFilas(parsed)
      },
      error: () => alert('No se pudo leer el archivo. Verifica que sea un CSV válido.'),
    })

    e.target.value = ''
  }

  // ── Importar filas válidas ─────────────────────────────────
  const handleImportar = async () => {
    const validas = filas.filter(f => f.errores.length === 0 && f.estado !== 'ok')
    if (!validas.length) return

    setImportando(true)
    setProgreso({ actual: 0, total: validas.length })

    const importar = esArr ? importarFilaArrendamiento : importarFilaCredito

    let actual = 0
    for (const fila of validas) {
      try {
        await importar(fila.data, user?.id)
        fila.estado  = 'ok'
        fila.mensaje = null
      } catch (err) {
        fila.estado  = 'error'
        fila.mensaje = err?.message?.includes('23505')
          ? 'Número de contrato duplicado'
          : (err?.message || 'Error desconocido')
      }
      actual++
      setProgreso({ actual, total: validas.length })
      setFilas(prev => prev.map(f => f === fila ? { ...fila } : f))
    }

    setImportando(false)
  }

  // ── Estadísticas ───────────────────────────────────────────
  const total    = filas.length
  const validas  = filas.filter(f => f.errores.length === 0).length
  const invalidas = filas.filter(f => f.errores.length > 0).length
  const importadas = filas.filter(f => f.estado === 'ok').length
  const conError   = filas.filter(f => f.estado === 'error').length
  const pendientes = filas.filter(f => f.errores.length === 0 && f.estado !== 'ok').length

  return (
    <div>
      <PageHeader
        titulo="Importación masiva"
        subtitulo="Carga contratos en andamiento desde plantilla CSV"
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['arrendamiento', 'credito'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setFilas([]) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'arrendamiento' ? 'Arrendamiento' : 'Crédito simple'}
          </button>
        ))}
      </div>

      {/* Panel de instrucciones + acciones */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">

          {/* Paso 1 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</span>
              <p className="font-semibold text-gray-800 text-sm">Descarga la plantilla</p>
            </div>
            <p className="text-xs text-gray-500 mb-3 ml-8">
              Llénala en Excel. Deja en blanco los campos opcionales.<br />
              La columna <code className="bg-gray-100 px-1 rounded">portafolio</code> acepta <code className="bg-gray-100 px-1 rounded">Monarca Capital</code> o vacío (Finco).<br />
              <code className="bg-gray-100 px-1 rounded">pagos_realizados</code> = cuántas rentas ya se cobraron.
            </p>
            <button
              onClick={handleDescarga}
              className="ml-8 btn-secondary flex items-center gap-2 text-sm"
            >
              <Download size={15} />
              Descargar plantilla {esArr ? 'arrendamiento' : 'crédito'}
            </button>
          </div>

          <div className="hidden md:block w-px bg-gray-200 self-stretch" />

          {/* Paso 2 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</span>
              <p className="font-semibold text-gray-800 text-sm">Sube el CSV llenado</p>
            </div>
            <p className="text-xs text-gray-500 mb-3 ml-8">
              Guarda el archivo como CSV UTF-8 desde Excel y súbelo aquí.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleArchivo}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="ml-8 btn-primary flex items-center gap-2 text-sm"
              disabled={importando}
            >
              <Upload size={15} />
              Seleccionar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Preview de filas */}
      {filas.length > 0 && (
        <div className="card">

          {/* Resumen */}
          <div className="flex flex-wrap gap-4 mb-5">
            <Stat label="Total filas"   value={total}     color="text-gray-800" />
            <Stat label="Válidas"       value={validas}   color="text-blue-700" />
            <Stat label="Inválidas"     value={invalidas} color="text-yellow-700" />
            <Stat label="Importadas"    value={importadas} color="text-green-700" />
            {conError > 0 && <Stat label="Con error" value={conError} color="text-red-700" />}
          </div>

          {/* Barra de progreso durante importación */}
          {importando && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Loader size={12} className="animate-spin" />
                  Importando {progreso.actual} de {progreso.total}...
                </span>
                <span className="text-xs font-medium text-primary">
                  {Math.round((progreso.actual / progreso.total) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Tabla */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold w-8">#</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Contrato</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Cliente</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">RFC</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Portafolio</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Estado</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, i) => (
                  <FilaPreview key={i} fila={fila} index={i} tipo={tab} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Botón importar */}
          {pendientes > 0 && !importando && (
            <div className="flex justify-end">
              <button
                onClick={handleImportar}
                className="btn-primary flex items-center gap-2"
              >
                <Upload size={16} />
                Importar {pendientes} contrato{pendientes !== 1 ? 's' : ''} válido{pendientes !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Resultado final */}
          {!importando && importadas > 0 && pendientes === 0 && conError === 0 && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
              <CheckCircle size={16} />
              Todos los contratos fueron importados exitosamente.
            </div>
          )}
          {!importando && conError > 0 && pendientes === 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <XCircle size={16} />
              {importadas} importados, {conError} con error. Revisa los mensajes de error en cada fila.
            </div>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {filas.length === 0 && (
        <div className="card text-center py-16 text-gray-400">
          <Upload size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Descarga la plantilla, llénala y súbela para previsualizar las filas aquí.</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-2 text-center min-w-[80px]">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
