import { api } from './client'

export async function listarEtapas() {
  return api.get('/oportunidades/etapas') // { etapas }
}

export async function listarOportunidades() {
  return api.get('/oportunidades')
}

export async function crearOportunidad(body) {
  return api.post('/oportunidades', body)
}

export async function cambiarEtapaOportunidad(id, etapaId, motivoPerdida) {
  return api.patch(`/oportunidades/${id}/etapa`, { etapaId, motivoPerdida })
}
