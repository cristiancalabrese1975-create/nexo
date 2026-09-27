import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { PeriodProvider } from './context/PeriodContext'
import { ValueModeProvider } from './context/ValueModeContext'
import { AgendaProvider } from './context/AgendaContext'
import { AppLayout } from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Faro from './pages/Faro'
import ResumenGerencial from './pages/ResumenGerencial'
import Pipeline from './pages/Pipeline'
import Agenda from './pages/Agenda'
import Calendario from './pages/Calendario'
import Clientes from './pages/Clientes'
import Lineas from './pages/Lineas'
import Skus from './pages/Skus'
import Cobranzas from './pages/Cobranzas'
import Descuentos from './pages/Descuentos'
import Importaciones from './pages/Importaciones'

function RequireGerente({ children }) {
  const { user } = useAuth()
  return user?.rol === 'gerente' ? children : <Navigate to="/" replace />
}

export default function App() {
  const { user, cargandoSesion } = useAuth()

  // Mientras se intenta restaurar la sesión con la cookie de refresh, no
  // mostramos el Login todavía — evita el parpadeo de login→dashboard en
  // cada recarga de página para un usuario que ya tenía sesión activa.
  if (cargandoSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">
        Cargando…
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <PeriodProvider>
      <ValueModeProvider>
        <AgendaProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="faro" element={<Faro />} />
              <Route
                path="gerencial"
                element={
                  <RequireGerente>
                    <ResumenGerencial />
                  </RequireGerente>
                }
              />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="calendario" element={<Calendario />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="lineas" element={<Lineas />} />
              <Route path="skus" element={<Skus />} />
              <Route path="cobranzas" element={<Cobranzas />} />
              <Route path="descuentos" element={<Descuentos />} />
              <Route
                path="importaciones"
                element={
                  <RequireGerente>
                    <Importaciones />
                  </RequireGerente>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AgendaProvider>
      </ValueModeProvider>
    </PeriodProvider>
  )
}
