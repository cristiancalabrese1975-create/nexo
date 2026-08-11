import { api, apiFetch, refrescarSesion, setAccessToken } from './client'

// Varias páginas (Agenda, Clientes, Faro, Calendario, ResumenGerencial)
// comparan `user.nombre` contra `vendedorAsignado` de clientes/gestiones,
// que viaja como "Nombre Apellido" completo — se normaliza acá junto con
// `user.iniciales` para el avatar del Topbar.
function normalizarUsuario(u) {
  if (!u) return null
  const nombreCompleto = `${u.nombre} ${u.apellido}`
  const iniciales = `${u.nombre[0] ?? ''}${u.apellido[0] ?? ''}`.toUpperCase()
  return { ...u, nombre: nombreCompleto, iniciales }
}

export async function login(dni, clave) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ dni, clave }) })
  setAccessToken(data.accessToken)
  return normalizarUsuario(data.usuario)
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } finally {
    setAccessToken(null)
  }
}

/** Se llama al montar la app: intenta renovar sesión con la cookie httpOnly de refresh (silencioso, sin mostrar error si no hay sesión). */
export async function intentarRestaurarSesion() {
  try {
    // Pasa por el mismo single-flight que usa el reintento-tras-401 —
    // si React StrictMode dispara este efecto dos veces, la segunda
    // llamada espera la misma promesa en vez de disparar un refresh
    // nuevo que la rotación del primero dejaría inválido.
    await refrescarSesion()
    const me = await api.get('/auth/me')
    return normalizarUsuario(me.usuario)
  } catch {
    return null
  }
}

export async function me() {
  const data = await api.get('/auth/me')
  return normalizarUsuario(data.usuario)
}
