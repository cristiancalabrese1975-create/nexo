import { createContext, useContext, useState } from 'react'

const ValueModeContext = createContext(null)

export function ValueModeProvider({ children }) {
  const [modo, setModo] = useState('pesos') // 'pesos' | 'unidades'
  return <ValueModeContext.Provider value={{ modo, setModo }}>{children}</ValueModeContext.Provider>
}

export function useValueMode() {
  const ctx = useContext(ValueModeContext)
  if (!ctx) throw new Error('useValueMode debe usarse dentro de <ValueModeProvider>')
  return ctx
}
