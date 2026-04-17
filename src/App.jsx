import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ui/ProtectedRoute'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Clientes from './pages/clientes/Clientes'
import Contratos from './pages/contratos/Contratos'
import Pagos from './pages/pagos/Pagos'
import Reportes from './pages/reportes/Reportes'
import Configuracion from './pages/configuracion/Configuracion'

function AppRoutes() {
  useAuth()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="clientes"      element={<Clientes />} />
        <Route path="contratos"     element={<Contratos />} />
        <Route path="pagos"         element={<Pagos />} />
        <Route path="reportes"      element={<Reportes />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
