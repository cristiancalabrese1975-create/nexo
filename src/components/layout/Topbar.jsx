import { Menu, Bell, LogOut, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PeriodFilter } from './PeriodFilter'
import { ValueModeToggle } from './ValueModeToggle'
import { clientesAGestionarHoy, ULTIMA_ACTUALIZACION_ISO, formatUltimaActualizacion } from '../../data/mockData'

export function Topbar({ title, subtitle, onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const aGestionar = clientesAGestionarHoy(user?.rol === 'vendedor' ? user.nombre : null).length
  const ultimaActualizacion = formatUltimaActualizacion(ULTIMA_ACTUALIZACION_ISO)

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 md:px-6">
      <div className="min-h-16 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="md:hidden text-slate-600 hover:text-slate-900"
            onClick={onMenuClick}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-semibold text-slate-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          <div className="hidden sm:flex items-center gap-2">
            <PeriodFilter />
            <ValueModeToggle />
            <span
              className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap"
              title="Última vez que se importaron los datos de venta del sistema del cliente"
            >
              <RefreshCw size={13} />
              Datos actualizados {ultimaActualizacion}
            </span>
          </div>
          <button
            onClick={() => navigate('/agenda')}
            className="text-slate-500 hover:text-slate-800 relative shrink-0"
            title={aGestionar > 0 ? `${aGestionar} cliente(s) a gestionar hoy` : 'Sin gestiones pendientes hoy'}
          >
            <Bell size={19} />
            {aGestionar > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {aGestionar}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {user?.iniciales}
            </div>
            <span className="hidden xl:block text-sm font-medium text-slate-700 whitespace-nowrap">{user?.nombre}</span>
          </div>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-rose-600 transition-colors shrink-0"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
      <div className="sm:hidden pb-2.5 flex items-center gap-2 flex-wrap">
        <PeriodFilter />
        <ValueModeToggle />
        <span className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
          <RefreshCw size={12} />
          Actualizado {ultimaActualizacion}
        </span>
      </div>
    </header>
  )
}
