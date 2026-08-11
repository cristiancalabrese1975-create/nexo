import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export async function getCatalogoBase({ desde, hasta } = {}) {
  const params = new URLSearchParams()
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  const qs = params.toString()
  return api.get(`/reportes/base${qs ? `?${qs}` : ''}`)
}

export function useCatalogoBase() {
  return useQuery({ queryKey: ['reportes-base'], queryFn: () => getCatalogoBase(), staleTime: 5 * 60_000 })
}

export async function getReporteDiario(year, month) {
  return api.get(`/reportes/diario?year=${year}&month=${month}`)
}

export function useReporteDiario(year, month, enabled) {
  return useQuery({
    queryKey: ['reportes-diario', year, month],
    queryFn: () => getReporteDiario(year, month),
    enabled,
    staleTime: 5 * 60_000,
  })
}
