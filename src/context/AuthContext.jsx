import { createContext, useContext, useState } from 'react'
import { usuarios } from '../data/mockData'

const AuthContext = createContext(null)

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('crm3_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser)

  function login(dni, clave) {
    const found = usuarios.find((u) => u.dni === dni.trim() && u.clave === clave)
    if (!found) return false
    setUser(found)
    localStorage.setItem('crm3_user', JSON.stringify(found))
    return true
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('crm3_user')
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
