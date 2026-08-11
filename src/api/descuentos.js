import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export async function getDescuentos({ periodos, modo } = {}) {
  const params = new URLSearchParams()
  if (periodos?.length) params.set('periodos', periodos.join(','))
  if (modo) params.set('modo', modo)
  const qs = params.toString()
  return api.get(`/descuentos${qs ? `?${qs}` : ''}`)
}

export function useDescuentos(params) {
  return useQuery({ queryKey: ['descuentos', params], queryFn: () => getDescuentos(params) })
}
