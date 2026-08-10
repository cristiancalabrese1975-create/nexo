import { createContext, useContext, useMemo } from 'react'
import { useGestiones, useCrearGestion } from '../api/hooks'

const AgendaContext = createContext(null)

// Las páginas que consumían `actividades` (Agenda, Calendario, Faro,
// Pipeline vía scoreOportunidad) esperan el shape del mock:
// { clienteCodigo, cliente, vendedor, tipo, fecha, hora, estado, notas,
//   proximaGestion, plataforma, enlace }. Se adapta acá la respuesta real
// del backend (clienteId/clienteNombre/vendedorNombre/enlaceReunion, tipo
// y estado en minúscula) para no tener que tocar esas pantallas todavía.
function adaptarGestion(g) {
  return {
    id: g.id,
    clienteCodigo: g.clienteId,
    cliente: g.clienteNombre,
    vendedor: g.vendedorNombre,
    tipo: g.tipo.charAt(0).toUpperCase() + g.tipo.slice(1),
    fecha: g.fecha,
    hora: g.hora,
    estado: g.estado.charAt(0).toUpperCase() + g.estado.slice(1),
    notas: g.notas,
    proximaGestion: g.proximaGestion ?? undefined,
    plataforma: g.plataforma,
    enlace: g.enlaceReunion,
  }
}

export function AgendaProvider({ children }) {
  const { data, isLoading } = useGestiones()
  const crear = useCrearGestion()

  const actividades = useMemo(() => (data?.items ?? []).map(adaptarGestion), [data])

  async function addActividad(nueva) {
    // `nueva` viene con el shape del formulario (GestionFormModal) — se
    // traduce a los campos que espera POST /gestiones. El enlace de
    // videollamada lo genera el servidor (no el cliente) — se devuelve
    // la gestión creada, ya adaptada, para que el modal pueda mostrar la
    // confirmación con el enlace real.
    const creada = await crear.mutateAsync({
      clienteId: nueva.clienteCodigo,
      ...(nueva.vendedorId ? { vendedorId: nueva.vendedorId } : {}),
      tipo: nueva.tipo.toLowerCase(),
      estado: nueva.estado.toLowerCase(),
      fecha: nueva.fecha,
      hora: nueva.hora,
      notas: nueva.notas,
      proximaGestion: nueva.proximaGestion,
      plataforma: nueva.plataforma,
    })
    return adaptarGestion({ ...creada, clienteNombre: nueva.cliente, vendedorNombre: nueva.vendedor })
  }

  return (
    <AgendaContext.Provider value={{ actividades, addActividad, cargando: isLoading }}>{children}</AgendaContext.Provider>
  )
}

export function useAgenda() {
  const ctx = useContext(AgendaContext)
  if (!ctx) throw new Error('useAgenda debe usarse dentro de <AgendaProvider>')
  return ctx
}
