import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export async function getCobranzas({ periodos, umbralDias } = {}) {
  const params = new URLSearchParams()
  if (periodos?.length) params.set('periodos', periodos.join(','))
  if (umbralDias) params.set('umbralDias', umbralDias)
  const qs = params.toString()
  return api.get(`/cobranzas${qs ? `?${qs}` : ''}`)
}

export function useCobranzas(params) {
  return useQuery({ queryKey: ['cobranzas', params], queryFn: () => getCobranzas(params) })
}
