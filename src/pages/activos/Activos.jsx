import { useState, useEffect, useMemo } from 'react'
import { Package, Plus, Search, Car, Wrench, Monitor, Building2, Box, Edit2, TrendingDown, ChevronDown, ChevronUp, X } from 'lucide-react'
import AcercaDeModal, { Seccion, Alerta, Tabla } from '../../components/ui/AcercaDeModal'
import { getActivos, crearActivo, actualizarActivo, calcularDepreciacion, getStatsActivos } from '../../lib/activosApi'
import { useAuthStore } from '../../store/authStore'
import { usePortafolioStore } from '../../store/portafolioStore'
import { formatCurrency, formatDate } from '../../utils/format'

const TIPO_BIEN_ICONS = {
  vehiculo:  { icon: Car,       label: 'Vehículo',   color: '#2d43d0' },
  maquinaria:{ icon: Wrench,    label: 'Maquinaria', color: '#7c3aed' },
  equipo:    { icon: Monitor,   label: 'Equipo',     color: '#0891b2' },
  inmueble:  { icon: Building2, label: 'Inmueble',   color: '#059669' },
  otro:      { icon: Box,       label: 'Otro',       color: '#6b7280' },
}

const ESTATUS_CFG = {
  disponible:       { label: 'Disponible',       cls: 'badge-success' },
  en_arrendamiento: { label: 'En arrendamiento', cls: 'badge-info'    },
  en_recuperacion:  { label: 'En recuperación',  cls: 'badge-warning' },
  dado_de_baja:     { label: 'Dado de baja',     cls: 'badge-gray'    },
}

const TASAS_FISCAL = {
  vehiculo:   0.25,
  maquinaria: 0.10,
  equipo:     0.25,
  inmueble:   0.05,
  otro:       0.10,
}

function ModalActivo({ activo, onClose, onSave }) {
  const { user } = useAuthStore()
  const { portafolioActivo } = usePortafolioStore()
  const isEdit = !!activo?.id
  const [form, setForm] = useState(activo ?? {
    tipo_bien: 'vehiculo', descripcion: '', marca: '', modelo: '',
    anio: new Date().getFullYear(), niv: '', placas: '', color: '',
    costo_adquisicion: '', fecha_adquisicion: '', proveedor: '',
    tasa_deprec_fiscal: 0.25, tasa_deprec_contable: 0.20,
    estatus: 'disponible', notas: '', portafolio: portafolioActivo ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onTipoBien = (tipo) => {
    set('tipo_bien', tipo)
    set('tasa_deprec_fiscal', TASAS_FISCAL[tipo] ?? 0.10)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.descripcion || !form.costo_adquisicion || !form.fecha_adquisicion) {
      setErr('Descripción, costo y fecha son obligatorios')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        costo_adquisicion: parseFloat(form.costo_adquisicion),
        tasa_deprec_fiscal: parseFloat(form.tasa_deprec_fiscal),
        tasa_deprec_contable: parseFloat(form.tasa_deprec_contable),
        anio: form.anio ? parseInt(form.anio) : null,
      }
      if (isEdit) await actualizarActivo(activo.id, payload)
      else        await crearActivo(payload, user?.id)
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{isEdit ? 'Editar activo' : 'Registrar activo'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{err}</div>}

          {/* Tipo de bien */}
          <div>
            <label className="label">Tipo de bien</label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(TIPO_BIEN_ICONS).map(([k, v]) => {
                const Icon = v.icon
                return (
                  <button key={k} type="button"
                    onClick={() => onTipoBien(k)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${form.tipo_bien === k ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <Icon size={18} />
                    {v.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Descripción *</label>
              <input className="input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Ej. Sedán ejecutivo TSURU 2024" required />
            </div>
            <div>
              <label className="label">Marca</label>
              <input className="input" value={form.marca ?? ''} onChange={e => set('marca', e.target.value)} placeholder="Nissan" />
            </div>
            <div>
              <label className="label">Modelo</label>
              <input className="input" value={form.modelo ?? ''} onChange={e => set('modelo', e.target.value)} placeholder="Versa" />
            </div>
            <div>
              <label className="label">Año</label>
              <input className="input" type="number" value={form.anio ?? ''} onChange={e => set('anio', e.target.value)} placeholder="2024" />
            </div>
            <div>
              <label className="label">Color</label>
              <input className="input" value={form.color ?? ''} onChange={e => set('color', e.target.value)} placeholder="Blanco" />
            </div>
            <div>
              <label className="label">NIV / Número de serie</label>
              <input className="input" value={form.niv ?? ''} onChange={e => set('niv', e.target.value)} placeholder="3VWFE21C04M..." />
            </div>
            <div>
              <label className="label">Placas</label>
              <input className="input" value={form.placas ?? ''} onChange={e => set('placas', e.target.value)} placeholder="ABC-123" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Costo de adquisición *</label>
              <input className="input" type="number" step="0.01" value={form.costo_adquisicion} onChange={e => set('costo_adquisicion', e.target.value)} placeholder="350,000" required />
            </div>
            <div>
              <label className="label">Fecha de adquisición *</label>
              <input className="input" type="date" value={form.fecha_adquisicion} onChange={e => set('fecha_adquisicion', e.target.value)} required />
            </div>
            <div>
              <label className="label">Proveedor</label>
              <input className="input" value={form.proveedor ?? ''} onChange={e => set('proveedor', e.target.value)} placeholder="Distribuidora Nissan" />
            </div>
            <div>
              <label className="label">Estatus</label>
              <select className="input" value={form.estatus} onChange={e => set('estatus', e.target.value)}>
                <option value="disponible">Disponible</option>
                <option value="en_arrendamiento">En arrendamiento</option>
                <option value="en_recuperacion">En recuperación</option>
                <option value="dado_de_baja">Dado de baja</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">Tasas de depreciación</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Tasa fiscal (SAT)</label>
                <div className="flex items-center gap-2">
                  <input className="input" type="number" step="0.01" min="0" max="1"
                    value={form.tasa_deprec_fiscal}
                    onChange={e => set('tasa_deprec_fiscal', e.target.value)} />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    = {(parseFloat(form.tasa_deprec_fiscal || 0) * 100).toFixed(0)}% anual
                  </span>
                </div>
              </div>
              <div>
                <label className="label text-xs">Tasa contable</label>
                <div className="flex items-center gap-2">
                  <input className="input" type="number" step="0.01" min="0" max="1"
                    value={form.tasa_deprec_contable}
                    onChange={e => set('tasa_deprec_contable', e.target.value)} />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    = {(parseFloat(form.tasa_deprec_contable || 0) * 100).toFixed(0)}% anual
                  </span>
                </div>
              </div>
            </div>
          </div>

          {portafolioActivo === null && (
            <div>
              <label className="label">Portafolio</label>
              <input className="input" value={form.portafolio ?? ''} onChange={e => set('portafolio', e.target.value)} placeholder="Arcos A / Arcos B / etc." />
            </div>
          )}

          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notas ?? ''} onChange={e => set('notas', e.target.value)} placeholder="Observaciones adicionales..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeprecPanel({ activo }) {
  const d = useMemo(() => calcularDepreciacion(activo), [activo])
  const pctF = Math.min(100, d.pctDeprecFiscal)
  const pctC = Math.min(100, d.pctDeprecContable)

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
      <p className="text-sm font-semibold text-gray-700">Depreciación acumulada · {d.aniosTranscurridos} años</p>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 mb-1">Fiscal (SAT {(activo.tasa_deprec_fiscal * 100).toFixed(0)}%/año)</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pctF}%` }} />
          </div>
          <p className="text-xs text-gray-600">{formatCurrency(d.deprecFiscalAcum)} ({pctF.toFixed(1)}%)</p>
          <p className="font-semibold text-gray-800 mt-1">VL fiscal: {formatCurrency(d.valorLibrosFiscal)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Contable ({(activo.tasa_deprec_contable * 100).toFixed(0)}%/año)</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div className="h-2 rounded-full bg-purple-500" style={{ width: `${pctC}%` }} />
          </div>
          <p className="text-xs text-gray-600">{formatCurrency(d.deprecContableAcum)} ({pctC.toFixed(1)}%)</p>
          <p className="font-semibold text-gray-800 mt-1">VL contable: {formatCurrency(d.valorLibrosContable)}</p>
        </div>
      </div>
      {(d.totalmenteDepreciadoFiscal || d.totalmenteDepreciadoContable) && (
        <p className="text-xs text-orange-600 font-medium">⚠ Activo totalmente depreciado</p>
      )}
    </div>
  )
}

function ActivoRow({ activo, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const cfg  = TIPO_BIEN_ICONS[activo.tipo_bien] ?? TIPO_BIEN_ICONS.otro
  const Icon = cfg.icon
  const est  = ESTATUS_CFG[activo.estatus] ?? ESTATUS_CFG.disponible
  const d    = useMemo(() => calcularDepreciacion(activo), [activo])

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cfg.color}15` }}>
              <Icon size={16} style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{activo.descripcion}</p>
              <p className="text-xs text-gray-400">{[activo.marca, activo.modelo, activo.anio].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{cfg.label}</td>
        <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatCurrency(activo.costo_adquisicion)}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(d.valorLibrosContable)}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(activo.fecha_adquisicion)}</td>
        <td className="px-4 py-3"><span className={`badge ${est.cls}`}>{est.label}</span></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(activo)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
              <Edit2 size={14} />
            </button>
            <button onClick={() => setExpanded(v => !v)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <DeprecPanel activo={activo} />
              <div className="space-y-2 text-sm">
                {activo.niv    && <p><span className="text-gray-500">NIV:</span> <span className="font-mono text-xs">{activo.niv}</span></p>}
                {activo.placas && <p><span className="text-gray-500">Placas:</span> {activo.placas}</p>}
                {activo.color  && <p><span className="text-gray-500">Color:</span> {activo.color}</p>}
                {activo.proveedor && <p><span className="text-gray-500">Proveedor:</span> {activo.proveedor}</p>}
                {activo.portafolio && <p><span className="text-gray-500">Portafolio:</span> {activo.portafolio}</p>}
                {activo.notas  && <p><span className="text-gray-500">Notas:</span> {activo.notas}</p>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Activos() {
  const { portafolioActivo } = usePortafolioStore()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCTipo, setFiltroCTipo] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [modal, setModal] = useState(null)

  const cargar = async () => {
    setLoading(true)
    try { setStats(await getStatsActivos(portafolioActivo)) } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { cargar() }, [portafolioActivo])

  const activos = useMemo(() => {
    if (!stats?.activos) return []
    return stats.activos.filter(a => {
      const q = busqueda.toLowerCase()
      const matchQ = !q || a.descripcion?.toLowerCase().includes(q) || a.marca?.toLowerCase().includes(q) || a.modelo?.toLowerCase().includes(q) || a.niv?.toLowerCase().includes(q) || a.placas?.toLowerCase().includes(q)
      const matchT = !filtroCTipo || a.tipo_bien === filtroCTipo
      const matchE = !filtroEstatus || a.estatus === filtroEstatus
      return matchQ && matchT && matchE
    })
  }, [stats, busqueda, filtroCTipo, filtroEstatus])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activos Propios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventario de bienes de la empresa con depreciación fiscal y contable</p>
        </div>
        <div className="flex items-center gap-2">
          <AcercaDeModal titulo="Activos Propios — Inventario y Depreciación">
            <Seccion titulo="¿Qué va aquí y qué no?">
              <p>Registra aquí únicamente los bienes que son <strong>propiedad de Finco o Monarca</strong> y que se entregan en arrendamiento a clientes. Esto aplica exclusivamente al <strong>arrendamiento puro</strong>: la empresa compra el bien, lo pone a nombre propio, y lo renta.</p>
              <p>En el arrendamiento financiero, el bien nunca entra al balance de Finco — el cliente lo adquiere con el crédito. Esos activos no van en este módulo.</p>
            </Seccion>
            <Seccion titulo="Tasas de depreciación por tipo de bien (SAT)">
              <p>El SAT establece tasas máximas de deducción fiscal anual. La depreciación contable puede ser diferente (normalmente menor o igual).</p>
            </Seccion>
            <Tabla
              headers={['Tipo de bien', 'Tasa fiscal SAT', 'Vida útil fiscal', 'Tasa contable sugerida']}
              rows={[
                ['Vehículos (automóviles)',  '25%', '4 años',  '20% (5 años)'],
                ['Equipo de cómputo',        '30%', '3.3 años','25% (4 años)'],
                ['Maquinaria y equipo',      '10%', '10 años', '10% (10 años)'],
                ['Inmuebles (construcción)', '5%',  '20 años', '5% (20 años)'],
                ['Otro equipo industrial',   '10%', '10 años', '10%'],
              ]}
            />
            <Seccion titulo="Valor en libros fiscal vs. contable — ¿cuál usar para qué?">
              <p><strong>Valor en libros fiscal:</strong> Es el valor que el SAT reconoce para efectos de deducción. Lo usas cuando calculas el ISR o cuando vendes el activo (la ganancia fiscal es precio de venta menos valor fiscal).</p>
              <p><strong>Valor en libros contable:</strong> Es el valor que aparece en tu balance bajo IFRS/NIF. Se basa en la vida útil estimada del bien. Tu contador lo usa para presentar los estados financieros.</p>
              <p>Pueden diferir: un vehículo comprado en 2022 puede estar totalmente depreciado fiscalmente (4 años al 25%) pero aún tener valor contable si la empresa usa 5 años.</p>
            </Seccion>
            <Seccion titulo="Cómo registrar un activo paso a paso">
              <p>1. Selecciona el tipo de bien — el sistema precarga la tasa fiscal SAT correspondiente.</p>
              <p>2. Llena descripción, marca, modelo, año, NIV/número de serie y placas si aplica.</p>
              <p>3. Captura el costo de adquisición (precio factura + IVA si no es acreditable) y la fecha de compra exacta.</p>
              <p>4. Ajusta las tasas si tu contador indica tasas distintas a las precargadas.</p>
              <p>5. El estatus inicial es "Disponible". Cámbialo a "En arrendamiento" cuando lo vincules a un contrato, "En recuperación" cuando esté en proceso de recuperación judicial, y "Dado de baja" cuando lo vendas o destruyas.</p>
            </Seccion>
            <Seccion titulo="Activo totalmente depreciado">
              <p>Cuando la depreciación acumulada iguala al costo de adquisición, el activo tiene valor en libros de $0. Fiscalmente ya no genera deducción, pero el bien puede seguir en operación. En ese caso el sistema lo marca con una advertencia naranja. No es obligatorio darlo de baja — solo significa que ya no genera beneficio fiscal adicional.</p>
            </Seccion>
            <Alerta tipo="success">Vincula cada activo al contrato de arrendamiento puro correspondiente desde el formulario del contrato (campo "Activo vinculado"). Esto te permite rastrear qué bien está con qué cliente y qué pasa si necesitas recuperarlo.</Alerta>
          </AcercaDeModal>
          <button onClick={() => setModal({})} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Registrar activo
          </button>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total activos',         value: stats.total,                          sub: `${stats.disponibles} disponibles`,    color: '#2d43d0', icon: Package },
            { label: 'En arrendamiento',      value: stats.enArrendamiento,                sub: `${stats.enRecuperacion} en recuperación`, color: '#059669', icon: Car },
            { label: 'Costo de adquisición',  value: formatCurrency(stats.costoTotal),     sub: 'valor histórico total',               color: '#7c3aed', icon: TrendingDown },
            { label: 'Valor en libros',        value: formatCurrency(stats.valorLibrosContable), sub: `Deprec. ${formatCurrency(stats.deprecAcum)}`, color: '#ff7900', icon: TrendingDown },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${k.color}15` }}>
                    <Icon size={18} style={{ color: k.color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Buscar activo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <select className="input w-44" value={filtroCTipo} onChange={e => setFiltroCTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_BIEN_ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="input w-44" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
            <option value="">Todos los estatus</option>
            {Object.entries(ESTATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-12">Cargando activos...</p>
        ) : activos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No se encontraron activos</p>
            {!busqueda && !filtroCTipo && !filtroEstatus && (
              <button onClick={() => setModal({})} className="btn-primary mt-4 text-sm">Registrar primer activo</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Activo', 'Tipo', 'Costo adq.', 'Valor libros', 'Adquisición', 'Estatus', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activos.map(a => (
                  <ActivoRow key={a.id} activo={a} onEdit={(a) => setModal(a)} />
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3 px-4">{activos.length} activo{activos.length !== 1 ? 's' : ''} mostrado{activos.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {modal !== null && (
        <ModalActivo
          activo={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); cargar() }}
        />
      )}
    </div>
  )
}
