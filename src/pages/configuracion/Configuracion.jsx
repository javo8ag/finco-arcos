import { Settings } from 'lucide-react'

export default function Configuracion() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Settings size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
          <p className="text-gray-500 text-sm">Tasas, cargos, datos de la empresa y alertas</p>
        </div>
      </div>
      <div className="card text-center py-16">
        <p className="text-gray-400 text-lg">Módulo de Configuración en construcción</p>
      </div>
    </div>
  )
}
