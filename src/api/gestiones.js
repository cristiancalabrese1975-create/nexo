import { api } from './client'

export async function listarGestiones(clienteId) {
  const qs = clienteId ? `?clienteId=${encodeURIComponent(clienteId)}` : ''
  const data = await api.get(`/gestiones${qs}`)
  return data.items
}

export async function crearGestion(body) {
  return api.post('/gestiones', body)
}

export async function aGestionarHoy() {
  return api.get('/agenda/a-gestionar-hoy')
}
