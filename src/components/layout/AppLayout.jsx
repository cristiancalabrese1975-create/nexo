import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const titles = {
  '/': ['Resumen', 'Panel general de ventas'],
  '/gerencial': ['Resumen Gerencial', 'Supervisión del equipo de ventas'],
  '/pipeline': ['Pipeline de Ventas', 'Oportunidades por etapa'],
  '/agenda': ['Agenda del Vendedor', 'Gestión telefónica y visitas a clientes'],
  '/calendario': ['Calendario', 'Gestiones realizadas y próximos compromisos'],
  '/clientes': ['Clientes', 'Cartera y evolución de ventas'],
  '/lineas': ['Líneas', 'Ventas por línea de producto'],
  '/skus': ['SKU', 'Catálogo de productos y ranking A/B/C'],
  '/cobranzas': ['Cobranzas', 'Cuenta corriente y vencimientos'],
  '/descuentos': ['Descuentos', 'Condiciones comerciales'],
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const [title, subtitle] = titles[pathname] ?? ['Nexo', '']

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
