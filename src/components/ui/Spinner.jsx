export default function Spinner({ texto = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-3" />
      <p className="text-sm">{texto}</p>
    </div>
  )
}
