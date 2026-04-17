import { Users } from 'lucide-react'

export default function Clientes() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Users size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm">Expedientes de personas físicas y morales</p>
        </div>
      </div>
      <div className="card text-center py-16">
        <p className="text-gray-400 text-lg">Módulo de Clientes en construcción</p>
      </div>
    </div>
  )
}
