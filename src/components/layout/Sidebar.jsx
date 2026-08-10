import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Radar,
  KanbanSquare,
  Users,
  Package,
  Tag,
  Wallet,
  Percent,
  CalendarClock,
  CalendarDays,
  BarChart3,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { NOMBRE_EMPRESA } from '../../config'

const navItems = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/faro', label: 'Faro', icon: Radar },
  { to: '/gerencial', label: 'Resumen Gerencial', icon: BarChart3, soloGerente: true },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { to: '/agenda', label: 'Agenda del Vendedor', icon: CalendarClock },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/lineas', label: 'Líneas', icon: Package },
  { to: '/skus', label: 'SKU', icon: Tag },
  { to: '/cobranzas', label: 'Cobranzas', icon: Wallet },
  { to: '/descuentos', label: 'Descuentos', icon: Percent },
]

export function Sidebar({ open, onClose }) {
  const { user } = useAuth()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed z-40 md:z-0 md:static top-0 left-0 h-full w-64 bg-slate-900 text-slate-200 flex flex-col
        transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-baseline">
              <span className="text-xl font-bold text-white">Nex</span>
              <span className="text-xl font-bold text-indigo-400">o</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{NOMBRE_EMPRESA}</p>
          </div>
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => !item.soloGerente || user?.rol === 'gerente')
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-500">
          {user?.nombre} · {user?.rol === 'gerente' ? 'Gerente' : 'Vendedor'}
        </div>
      </aside>
    </>
  )
}
