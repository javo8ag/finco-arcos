import { CreditCard } from 'lucide-react'

export default function Pagos() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <CreditCard size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cobranza</h1>
          <p className="text-gray-500 text-sm">Registro de pagos y gestión de moratorios</p>
        </div>
      </div>
      <div className="card text-center py-16">
        <p className="text-gray-400 text-lg">Módulo de Cobranza en construcción</p>
      </div>
    </div>
  )
}
