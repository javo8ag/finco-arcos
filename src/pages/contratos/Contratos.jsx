import { FileText } from 'lucide-react'

export default function Contratos() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <FileText size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contratos</h1>
          <p className="text-gray-500 text-sm">Arrendamientos financieros y créditos simples</p>
        </div>
      </div>
      <div className="card text-center py-16">
        <p className="text-gray-400 text-lg">Módulo de Contratos en construcción</p>
      </div>
    </div>
  )
}
