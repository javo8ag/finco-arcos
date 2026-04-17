export default function EmptyState({ titulo, descripcion, children }) {
  return (
    <div className="card text-center py-16">
      <p className="text-gray-400 text-lg font-medium">{titulo}</p>
      {descripcion && <p className="text-gray-300 text-sm mt-1">{descripcion}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
