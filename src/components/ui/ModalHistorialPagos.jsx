import { useState, useCallback, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Clock, ChevronRight, Download, AlertTriangle } from 'lucide-react'
import { parseCSVHistorial, calcularHistorial, confirmarHistorial, generarPlantillaHistorial } from '../../lib/historialPagosApi'
import { formatCurrency, formatDate } from '../../utils/format'

const ESTATUS_CFG = {
  Pagado:    { cls: 'badge-success', label: 'Pagado'    },
  Parcial:   { cls: 'badge-warning', label: 'Parcial'   },
  Atrasado:  { cls: 'badge-danger',  label: 'Atrasado'  },
  Pendiente: { cls: 'badge-gray',    label: 'Pendiente' },
}

function descargarPlantilla() {
  const csv  = generarPlantillaHistorial()
  const blob = new Blob([csv], { type: 'text/csv' })
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = 'plantilla_historial_pagos.csv'
  a.click()
}

// ── Paso 1 — Carga de archivo ─────────────────────────────────
function PasoUpload({ onParsed, err }) {
  const [dragging, setDragging]   = useState(false)
  const [fileName, setFileName]   = useState('')
  const [csvText,  setCsvText]    = useState('')
  const inputRef = useRef(null)

  const leerArchivo = (file) => {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => setCsvText(e.target.result)
    reader.readAsText(file, 'UTF-8')
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    leerArchivo(e.dataTransfer?.files[0])
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Paso 1 de 3 — Cargar CSV</p>
          <p className="text-xs text-gray-400 mt-0.5">
            El CSV debe tener una fila por período de la tabla de amortización del contrato.
          </p>
        </div>
        <button onClick={descargarPlantilla} className="flex items-center gap-1.5 text-xs text-primary border border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 transition-colors">
          <Download size={12} /> Plantilla
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Upload size={28} className="mx-auto mb-3 text-gray-300" />
        {fileName ? (
          <p className="text-sm font-medium text-primary">{fileName}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">Arrastra el archivo aquí o haz click</p>
            <p className="text-xs text-gray-400 mt-1">CSV con el historial de pagos del contrato</p>
          </>
        )}
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => leerArchivo(e.target.files[0])} />
      </div>

      <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">Columnas reconocidas automáticamente:</p>
        <p className="text-blue-600">
          <span className="font-mono bg-blue-100 rounded px-1">numero_pago</span> ·{' '}
          <span className="font-mono bg-blue-100 rounded px-1">fecha_pago</span> ·{' '}
          <span className="font-mono bg-blue-100 rounded px-1">saldo</span> ·{' '}
          <span className="font-mono bg-blue-100 rounded px-1">capital</span> ·{' '}
          <span className="font-mono bg-blue-100 rounded px-1">interes</span> ·{' '}
          <span className="font-mono bg-blue-100 rounded px-1">iva</span> ·{' '}
          <span className="font-mono bg-blue-100 rounded px-1">pago</span> ·{' '}
          <span className="font-mono bg-blue-100 rounded px-1">fecha_real_de_pago</span>
        </p>
        <p className="text-blue-500">Acepta nombres con o sin acentos, y fechas YYYY-MM-DD o YYYY/MM/DD.</p>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

      <button
        disabled={!csvText}
        onClick={() => onParsed(csvText)}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
      >
        Calcular historial <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ── Paso 2 — Vista previa ─────────────────────────────────────
function PasoPreview({ filas, onConfirmar, procesando, err }) {
  const pagados   = filas.filter(f => f.estatus === 'Pagado').length
  const atrasados = filas.filter(f => f.estatus === 'Atrasado').length
  const parciales = filas.filter(f => f.estatus === 'Parcial').length
  const pendientes= filas.filter(f => f.estatus === 'Pendiente').length
  const totalMora = filas.reduce((s, f) => s + f.moratorioTotal, 0)
  const totalPagado = filas.reduce((s, f) => s + f.pagoRecibido, 0)
  const conAtraso = filas.filter(f => f.diasAtraso > 0).length

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-700">Paso 2 de 3 — Vista previa</p>
        <p className="text-xs text-gray-400 mt-0.5">Revisa los cálculos antes de confirmar. Esta acción actualiza la tabla de amortización.</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Pagados',   value: pagados,   color: 'text-green-600' },
          { label: 'Con mora',  value: conAtraso, color: 'text-red-600'   },
          { label: 'Parciales', value: parciales, color: 'text-yellow-600'},
          { label: 'Pendientes',value: pendientes,color: 'text-gray-500'  },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-400">{k.label}</p>
          </div>
        ))}
      </div>

      {totalMora > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
          <AlertTriangle size={14} className="text-orange-500 shrink-0" />
          <p className="text-xs text-orange-700">
            Total moratorios generados: <strong>{formatCurrency(totalMora)}</strong> en {conAtraso} período(s) con atraso.
            Se aplican primero (prelación) antes de interés y capital.
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-auto max-h-72 rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {['#','F. prog.','F. real','Días atraso','Pago recibido','Mora + IVA','→ Mora','→ Interés','→ Capital','Sobrante','Estatus']
                .map(h => <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filas.map((f, i) => {
              const cfg = ESTATUS_CFG[f.estatus] ?? ESTATUS_CFG.Pendiente
              const rowBg = f.diasAtraso > 0 ? 'bg-red-50/40' : f.estatus === 'Pagado' ? '' : ''
              return (
                <tr key={i} className={`${rowBg} hover:bg-gray-50`}>
                  <td className="px-2 py-1.5 font-medium text-gray-700">{f.numeroPago}</td>
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{f.fechaProgramada ?? '—'}</td>
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{f.fechaReal ?? '—'}</td>
                  <td className="px-2 py-1.5 text-center">
                    {f.diasAtraso > 0
                      ? <span className="text-red-600 font-medium">{f.diasAtraso}d</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium">{f.pagoRecibido > 0 ? formatCurrency(f.pagoRecibido) : '—'}</td>
                  <td className="px-2 py-1.5 text-right">
                    {f.moratorioTotal > 0
                      ? <span className="text-red-600">{formatCurrency(f.moratorioTotal)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right text-orange-600">{f.appMora > 0 ? formatCurrency(f.appMora) : '—'}</td>
                  <td className="px-2 py-1.5 text-right text-blue-600">{f.appInteres > 0 ? formatCurrency(f.appInteres) : '—'}</td>
                  <td className="px-2 py-1.5 text-right text-green-600">{f.appCapital > 0 ? formatCurrency(f.appCapital) : '—'}</td>
                  <td className="px-2 py-1.5 text-right">
                    {f.sobrante > 0.01 ? <span className="text-purple-600">{formatCurrency(f.sobrante)}</span> : '—'}
                  </td>
                  <td className="px-2 py-1.5"><span className={`badge ${cfg.cls}`}>{cfg.label}</span></td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50 sticky bottom-0 border-t border-gray-200">
            <tr>
              <td colSpan={4} className="px-2 py-2 text-xs font-semibold text-gray-600">Totales</td>
              <td className="px-2 py-2 text-right text-xs font-semibold">{formatCurrency(totalPagado)}</td>
              <td className="px-2 py-2 text-right text-xs font-semibold text-red-600">{formatCurrency(totalMora)}</td>
              <td colSpan={5} />
            </tr>
          </tfoot>
        </table>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

      <button
        onClick={onConfirmar}
        disabled={procesando}
        className="btn-primary w-full"
      >
        {procesando ? 'Procesando...' : `Confirmar e importar ${filas.length} períodos`}
      </button>
    </div>
  )
}

// ── Paso 3 — Éxito ────────────────────────────────────────────
function PasoDone({ resultado, onClose }) {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle size={32} className="text-green-500" />
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-800">Historial importado</p>
        <p className="text-sm text-gray-500 mt-1">
          Se actualizaron <strong>{resultado}</strong> períodos en la tabla de amortización,
          incluyendo moratorios calculados por atraso y prelación aplicada por período.
        </p>
      </div>
      <p className="text-xs text-gray-400">Recarga la página del contrato para ver los cambios reflejados.</p>
      <button onClick={onClose} className="btn-primary">Cerrar</button>
    </div>
  )
}

// ── Modal principal ───────────────────────────────────────────
export default function ModalHistorialPagos({ contratoId, contratoTipo, contrato, onClose, onDone }) {
  const [paso,       setPaso]       = useState(1)
  const [filasCalc,  setFilasCalc]  = useState([])
  const [procesando, setProcesando] = useState(false)
  const [resultado,  setResultado]  = useState(null)
  const [err,        setErr]        = useState('')

  const onParsed = (csvText) => {
    setErr('')
    try {
      const filas = parseCSVHistorial(csvText)
      if (!filas.length) { setErr('El archivo está vacío o no tiene filas válidas'); return }
      const calc = calcularHistorial(filas, contrato)
      setFilasCalc(calc)
      setPaso(2)
    } catch (e) { setErr(e.message) }
  }

  const onConfirmar = async () => {
    setErr('')
    setProcesando(true)
    try {
      const n = await confirmarHistorial(contratoId, contratoTipo, filasCalc)
      setResultado(n)
      setPaso(3)
      if (onDone) onDone()
    } catch (e) { setErr(e.message) }
    setProcesando(false)
  }

  const TITULOS = ['', 'Cargar historial de pagos', 'Vista previa del historial', 'Historial importado']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-base font-semibold text-gray-800">{TITULOS[paso]}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Contrato {contrato?.numero_contrato} · Prelación: mora → interés → capital
            </p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Indicador de pasos */}
        {paso < 3 && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-50">
            {[1, 2, 3].map(p => (
              <div key={p} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  p < paso ? 'bg-green-500 text-white' :
                  p === paso ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                }`}>{p < paso ? '✓' : p}</div>
                {p < 3 && <div className={`h-px w-8 ${p < paso ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Contenido */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {paso === 1 && <PasoUpload onParsed={onParsed} err={err} />}
          {paso === 2 && <PasoPreview filas={filasCalc} onConfirmar={onConfirmar} procesando={procesando} err={err} />}
          {paso === 3 && <PasoDone resultado={resultado} onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}
