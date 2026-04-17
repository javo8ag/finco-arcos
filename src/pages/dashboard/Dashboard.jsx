import { LayoutDashboard } from 'lucide-react'

export default function Dashboard() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Resumen ejecutivo de la cartera</p>
        </div>
      </div>
      <div className="card text-center py-16">
        <p className="text-gray-400 text-lg">Dashboard en construcción</p>
        <p className="text-gray-300 text-sm mt-2">Aquí aparecerán los KPIs y gráficas de la cartera.</p>
      </div>
    </div>
  )
}
