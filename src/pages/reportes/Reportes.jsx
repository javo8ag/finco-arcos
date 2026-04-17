import { BarChart2 } from 'lucide-react'

export default function Reportes() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <BarChart2 size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm">Exportación de cartera, cobranza y estados de cuenta</p>
        </div>
      </div>
      <div className="card text-center py-16">
        <p className="text-gray-400 text-lg">Módulo de Reportes en construcción</p>
      </div>
    </div>
  )
}
