import { createContext, useContext, useState } from 'react'
import { actividadesAgendaSemilla } from '../data/mockData'

const AgendaContext = createContext(null)

export function AgendaProvider({ children }) {
  const [actividades, setActividades] = useState(actividadesAgendaSemilla)

  function addActividad(nueva) {
    setActividades((prev) => [nueva, ...prev])
  }

  return <AgendaContext.Provider value={{ actividades, addActividad }}>{children}</AgendaContext.Provider>
}

export function useAgenda() {
  const ctx = useContext(AgendaContext)
  if (!ctx) throw new Error('useAgenda debe usarse dentro de <AgendaProvider>')
  return ctx
}
