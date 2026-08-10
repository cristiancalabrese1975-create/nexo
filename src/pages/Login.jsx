import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usuarios } from '../data/mockData'
import { NOMBRE_EMPRESA } from '../config'
import { LogIn } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [dni, setDni] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const ok = login(dni, clave)
    if (!ok) {
      setError('DNI o clave incorrectos. Probá con uno de los accesos de demo.')
    }
  }

  function usarDemo(u) {
    setDni(u.dni)
    setClave(u.clave)
    setError('')
    login(u.dni, u.clave)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-slate-900 text-white p-8 md:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline mb-1">
              <span className="text-2xl font-bold">Nex</span>
              <span className="text-2xl font-bold text-indigo-400">o</span>
            </div>
            <p className="text-xs text-slate-400 mb-7">{NOMBRE_EMPRESA}</p>
            <h1 className="text-2xl font-semibold leading-snug mb-3">Conectamos clientes, oportunidades y resultados</h1>
            <p className="text-sm text-slate-400">
              Pipeline, cartera de clientes, cobranzas, agenda de vendedores y un resumen gerencial en un solo lugar.
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-10">Demo comercial · Los datos mostrados son ficticios</p>
        </div>

        <div className="p-8 md:p-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-slate-500 mb-6">Ingresá con tu número de documento y tu clave personal.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Número de documento</label>
              <input
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ej. 30111222"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Clave personal</label>
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="••••••"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg py-2.5 transition-colors"
            >
              <LogIn size={16} />
              Ingresar
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">Accesos de demo (un clic para entrar)</p>
            <div className="space-y-1.5">
              {usuarios.map((u) => (
                <button
                  key={u.dni}
                  onClick={() => usarDemo(u)}
                  className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                >
                  <span className="text-sm text-slate-700">
                    {u.nombre} <span className="text-slate-400">· {u.rol === 'gerente' ? 'Gerente' : 'Vendedor'}</span>
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{u.dni}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
