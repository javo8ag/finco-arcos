import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificacionesBell from './NotificacionesBell'

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-end px-6 shrink-0">
          <NotificacionesBell />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
