import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, logout as apiLogout, intentarRestaurarSesion } from '../api/auth'
import { ApiError } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // El access token vive sólo en memoria (ver api/client.js); al recargar
  // la página no queda nada en localStorage — la sesión se restaura con
  // la cookie httpOnly de refresh, o si no hay, vuelve al Login.
  const [cargandoSesion, setCargandoSesion] = useState(true)

  useEffect(() => {
    let cancelado = false
    intentarRestaurarSesion().then((usuario) => {
      if (!cancelado) {
        setUser(usuario)
        setCargandoSesion(false)
      }
    })
    return () => {
      cancelado = true
    }
  }, [])

  async function login(dni, clave) {
    try {
      const usuario = await apiLogin(dni, clave)
      setUser(usuario)
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false
      throw err
    }
  }

  async function logout() {
    await apiLogout().catch(() => {})
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout, cargandoSesion }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
