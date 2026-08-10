import { api } from './client'

export async function listarLineas({ periodos, comparar, modo } = {}) {
  const params = new URLSearchParams()
  if (periodos?.length) params.set('periodos', periodos.join(','))
  if (comparar?.length) params.set('comparar', comparar.join(','))
  if (modo) params.set('modo', modo)
  const qs = params.toString()
  return api.get(`/lineas${qs ? `?${qs}` : ''}`)
}
