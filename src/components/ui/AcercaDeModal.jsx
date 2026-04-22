import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

export default function AcercaDeModal({ titulo, children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors border border-gray-200 hover:border-primary/30 rounded-lg px-3 py-1.5"
      >
        <HelpCircle size={13} />
        Acerca de este módulo
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-primary" />
                <h2 className="text-base font-semibold text-gray-800">{titulo}</h2>
              </div>
              <button onClick={() => setOpen(false)}>
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-gray-700 leading-relaxed">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function Seccion({ titulo, children }) {
  return (
    <div>
      <p className="font-semibold text-gray-900 mb-1.5">{titulo}</p>
      <div className="space-y-1.5 text-gray-600">{children}</div>
    </div>
  )
}

export function Alerta({ tipo = 'info', children }) {
  const cfg = {
    info:    'bg-blue-50  border-blue-200  text-blue-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    danger:  'bg-red-50   border-red-200   text-red-800',
  }
  return (
    <div className={`border rounded-xl px-4 py-3 text-xs leading-relaxed ${cfg[tipo]}`}>
      {children}
    </div>
  )
}

export function Tabla({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>{headers.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
