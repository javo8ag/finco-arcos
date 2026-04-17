import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ui/ProtectedRoute'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Clientes from './pages/clientes/Clientes'
import ClienteForm from './pages/clientes/ClienteForm'
import ClienteDetalle from './pages/clientes/ClienteDetalle'
import Contratos from './pages/contratos/Contratos'
import ContratoForm from './pages/contratos/ContratoForm'
import ContratoDetalle from './pages/contratos/ContratoDetalle'
import CreditoForm from './pages/contratos/CreditoForm'
import CreditoDetalle from './pages/contratos/CreditoDetalle'
import Pagos from './pages/pagos/Pagos'
import RegistrarPago from './pages/pagos/RegistrarPago'
import Moratorios from './pages/pagos/Moratorios'
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
        <Route path="dashboard"                      element={<Dashboard />} />

        {/* Clientes */}
        <Route path="clientes"                       element={<Clientes />} />
        <Route path="clientes/nuevo"                 element={<ClienteForm />} />
        <Route path="clientes/:id"                   element={<ClienteDetalle />} />
        <Route path="clientes/:id/editar"            element={<ClienteForm />} />

        {/* Contratos */}
        <Route path="contratos"                      element={<Contratos />} />
        <Route path="contratos/nuevo-arrendamiento"  element={<ContratoForm />} />
        <Route path="contratos/nuevo-credito"        element={<CreditoForm />} />
        <Route path="contratos/:id"                  element={<ContratoDetalle />} />
        <Route path="contratos/credito/:id"          element={<CreditoDetalle />} />

        {/* Pagos */}
        <Route path="pagos"                                element={<Pagos />} />
        <Route path="pagos/registrar/:contratoId"          element={<RegistrarPago tipoContrato="arrendamiento" />} />
        <Route path="pagos/registrar-credito/:contratoId"  element={<RegistrarPago tipoContrato="credito" />} />

        <Route path="moratorios"                     element={<Moratorios />} />
        <Route path="reportes"                       element={<Reportes />} />
        <Route path="configuracion"                  element={<Configuracion />} />
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
