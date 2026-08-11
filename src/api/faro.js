import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export async function getFaro({ periodos, comparar, modo } = {}) {
  const params = new URLSearchParams()
  if (periodos?.length) params.set('periodos', periodos.join(','))
  if (comparar?.length) params.set('comparar', comparar.join(','))
  if (modo) params.set('modo', modo)
  const qs = params.toString()
  return api.get(`/faro${qs ? `?${qs}` : ''}`)
}

export function useFaro(params) {
  return useQuery({ queryKey: ['faro', params], queryFn: () => getFaro(params) })
}
