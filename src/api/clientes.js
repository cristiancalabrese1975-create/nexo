import { useQuery } from '@tanstack/react-query'
import { api } from './client'

/** Sólo para selectores (GestionFormModal, filtros) — el backend ya scopea por rol (vendedor ve sólo su cartera). */
export async function listarClientesResumen() {
  const data = await api.get('/clientes')
  return data.items
}

export function useClientesSelector() {
  return useQuery({ queryKey: ['clientes-selector'], queryFn: listarClientesResumen, staleTime: 60_000 })
}
