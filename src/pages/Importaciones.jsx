import { useRef, useState } from 'react'
import { Upload, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { useImportaciones, useImportarArchivo } from '../api/hooks'

const TIPOS = [
  { value: 'ventas', label: 'Ventas', plantilla: 'Nexo_Historial_de_Ventas.xlsx' },
  { value: 'vendedores', label: 'Vendedores', plantilla: 'Nexo_Alta_de_Vendedores.xlsx' },
]

const ESTADO_ESTILOS = {
  completada: 'bg-emerald-50 text-emerald-700',
  completada_con_errores: 'bg-amber-50 text-amber-700',
  fallida: 'bg-rose-50 text-rose-700',
  procesando: 'bg-slate-100 text-slate-500',
}

function fechaHora(iso) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Importaciones() {
  const [tipo, setTipo] = useState('ventas')
  const [archivo, setArchivo] = useState(null)
  const [resultado, setResultado] = useState(null)
  const fileInputRef = useRef(null)

  const { data: historialResp } = useImportaciones()
  const importar = useImportarArchivo()

  const historial = historialResp?.items ?? []

  function handleSubmit(e) {
    e.preventDefault()
    if (!archivo) return
    setResultado(null)
    importar.mutate(
      { tipo, archivo },
      {
        onSuccess: (data) => {
          setResultado(data)
          setArchivo(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        },
      },
    )
  }

  const plantillaActual = TIPOS.find((t) => t.value === tipo)?.plantilla

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Importar datos</h1>
        <p className="text-sm text-slate-500">Cargá ventas nuevas o dá de alta vendedores subiendo la planilla correspondiente.</p>
      </div>

      <Card className="p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo de dato</label>
            <div className="flex bg-slate-100 rounded-lg p-0.5 text-sm font-medium w-fit">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTipo(t.value)
                    setResultado(null)
                  }}
                  className={`px-4 py-1.5 rounded-md transition-colors ${
                    tipo === t.value ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Tiene que tener el formato de la plantilla <span className="font-medium text-slate-500">{plantillaActual}</span>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Archivo (.xlsx)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <button
            type="submit"
            disabled={!archivo || importar.isPending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            <Upload size={16} />
            {importar.isPending ? 'Importando…' : 'Importar'}
          </button>

          {importar.isError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{importar.error?.message ?? 'No se pudo importar el archivo.'}</p>
          )}
        </form>
      </Card>

      {resultado && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-1">
            {resultado.filasError === 0 ? (
              <CheckCircle2 size={18} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={18} className="text-amber-500" />
            )}
            <h2 className="text-sm font-semibold text-slate-700">
              {resultado.filasOk} de {resultado.filasTotal} filas cargadas correctamente
            </h2>
          </div>

          {resultado.credenciales?.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
                <KeyRound size={13} />
                Guardá estas claves ahora — no se vuelven a mostrar
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="py-1 font-medium">Nombre</th>
                    <th className="py-1 font-medium">DNI</th>
                    <th className="py-1 font-medium">Clave temporal</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.credenciales.map((c) => (
                    <tr key={c.dni} className="border-t border-amber-100/70">
                      <td className="py-1.5 text-slate-700">{c.nombre} {c.apellido}</td>
                      <td className="py-1.5 text-slate-600">{c.dni}</td>
                      <td className="py-1.5 font-mono text-slate-800">{c.claveTemporal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resultado.errores?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-rose-700 mb-2">{resultado.filasError} fila(s) con error</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="py-1.5 font-medium">Fila</th>
                      <th className="py-1.5 font-medium">Columna</th>
                      <th className="py-1.5 font-medium">Valor</th>
                      <th className="py-1.5 font-medium">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.errores.map((e, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="py-1.5 text-slate-600">{e.fila}</td>
                        <td className="py-1.5 text-slate-600">{e.columna}</td>
                        <td className="py-1.5 text-slate-500">{e.valor ?? '—'}</td>
                        <td className="py-1.5 text-rose-600">{e.mensaje}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Historial de importaciones</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no se importó ningún archivo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-1.5 font-medium">Fecha</th>
                  <th className="py-1.5 font-medium">Tipo</th>
                  <th className="py-1.5 font-medium">Archivo</th>
                  <th className="py-1.5 font-medium text-right">Filas OK</th>
                  <th className="py-1.5 font-medium text-right">Errores</th>
                  <th className="py-1.5 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5 text-slate-600 whitespace-nowrap">{fechaHora(h.iniciadaEn)}</td>
                    <td className="py-1.5 text-slate-600 capitalize">{h.tipo}</td>
                    <td className="py-1.5 text-slate-500 truncate max-w-[200px]">{h.archivoNombre}</td>
                    <td className="py-1.5 text-right text-slate-600">{h.filasOk ?? '—'}</td>
                    <td className="py-1.5 text-right text-slate-600">{h.filasError ?? '—'}</td>
                    <td className="py-1.5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_ESTILOS[h.estado] ?? ''}`}>{h.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
