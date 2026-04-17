export default function PageHeader({ icon: Icon, titulo, subtitulo, children }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={28} className="text-primary" />}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{titulo}</h1>
          {subtitulo && <p className="text-gray-500 text-sm">{subtitulo}</p>}
        </div>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  )
}
