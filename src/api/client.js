// Cliente HTTP hacia el backend de Nexo (server/). Maneja el access token
// en memoria (nunca en localStorage — ver AuthContext) y renueva la
// sesión de forma transparente vía la cookie httpOnly de refresh cuando
// un request devuelve 401.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

let accessToken = null
let refreshEnCurso = null

export function setAccessToken(token) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

async function refrescarSesion() {
  // Evita disparar varios /auth/refresh en paralelo si varios requests
  // pegan 401 al mismo tiempo — todos esperan la misma promesa.
  if (!refreshEnCurso) {
    refreshEnCurso = fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh_failed')
        const data = await res.json()
        setAccessToken(data.accessToken)
        return data.accessToken
      })
      .finally(() => {
        refreshEnCurso = null
      })
  }
  return refreshEnCurso
}

export class ApiError extends Error {
  constructor(message, status, code, detalles) {
    super(message)
    this.status = status
    this.code = code
    this.detalles = detalles
  }
}

/**
 * `path` es relativo a /api/v1, ej. apiFetch('/clientes?periodos=2026-08').
 * Reintenta una vez tras un 401 refrescando el access token.
 */
export async function apiFetch(path, options = {}, { _retried = false } = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' })

  if (res.status === 401 && !_retried) {
    try {
      await refrescarSesion()
      return apiFetch(path, options, { _retried: true })
    } catch {
      setAccessToken(null)
      throw new ApiError('Sesión vencida.', 401, 'unauthorized')
    }
  }

  if (!res.ok) {
    let body = null
    try {
      body = await res.json()
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(body?.message || `Error ${res.status}`, res.status, body?.error, body?.detalles)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: (path) => apiFetch(path, { method: 'DELETE' }),
}

export { BASE_URL }
