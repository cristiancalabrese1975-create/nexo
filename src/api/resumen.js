import { api } from './client'

export async function getResumen({ desde, hasta, modo } = {}) {
  const params = new URLSearchParams()
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  if (modo) params.set('modo', modo)
  const qs = params.toString()
  return api.get(`/resumen${qs ? `?${qs}` : ''}`)
}
