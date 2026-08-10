import { useMemo, useState } from 'react'
import { X, Users, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { Card } from '../components/ui/Card'
import { Sparkline } from '../components/ui/Sparkline'
import { SortableTh } from '../components/ui/SortableTh'
import { usePeriod } from '../context/PeriodContext'
import { useValueMode } from '../context/ValueModeContext'
import {
  lineas,
  clientes,
  valorLinea,
  serieDiariaLinea,
  valorCliente,
  lineasPreferidasPorCliente,
  skusPorLinea,
  valorSku,
  clasificarSkusABC,
  clasificarLineasABC,
} from '../data/mockData'
import { PERIODS, periodShortLabel, diasEnMes } from '../data/periods'
import { formatValor } from '../utils/format'
import { compareValues, nextSort } from '../utils/sort'

const direcciones = ['Todas', ...new Set(lineas.map((l) => l.direccion))]
const TRAILING = 5

function colorRK(t) {
  if (t === 'A') return 'bg-emerald-100 text-emerald-700'
  if (t === 'B') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-200 text-slate-600'
}

function valorColumna(fila, key) {
  if (key === 'nombre') return fila.nombre
  if (key === 'actual') return fila.actual
  if (key === 'anterior') return fila.anterior
  if (key === 'vsPromedio') return fila.vsPromedioPct ?? -Infinity
  if (key === 'evolucion') return fila.evolucionPct ?? -Infinity
  if (key.startsWith('col')) return fila.columnas?.[Number(key.slice(3))]?.valor ?? 0
  return 0
}

export default function Lineas() {
  const [direccion, setDireccion] = useState('Todas')
  const [vista, setVista] = useState('mensual')
  const [sort, setSort] = useState({ key: null, dir: 'desc' })
  const [sortDiario, setSortDiario] = useState({ key: null, dir: 'desc' })
  const [lineaSeleccionada, setLineaSeleccionada] = useState(null)
  const [pareto80Abierto, setPareto80Abierto] = useState(false)
  const [rkFiltro, setRkFiltro] = useState(null)
  const [evolucionFiltro, setEvolucionFiltro] = useState(null)
  const { year, month, selectedIndices, primaryIndex, comparisonIndices, isAnnual, label } = usePeriod()
  const { modo } = useValueMode()

  function toggleLinea(id) {
    setLineaSeleccionada((prev) => (prev === id ? null : id))
  }

  function toggleRkFiltro(tier) {
    setRkFiltro((prev) => (prev === tier ? null : tier))
  }

  function toggleEvolucionFiltro(estado) {
    setEvolucionFiltro((prev) => (prev === estado ? null : estado))
  }

  const filtradas = useMemo(
    () => (direccion === 'Todas' ? lineas : lineas.filter((l) => l.direccion === direccion)),
    [direccion],
  )

  const trailingIdx = useMemo(() => {
    const idxs = []
    for (let k = 0; k < TRAILING; k++) {
      const idx = primaryIndex - k
      if (idx >= 0) idxs.push(idx)
    }
    return idxs
  }, [primaryIndex])

  const promedioEmpresa = useMemo(
    () => (lineas.length ? lineas.reduce((acc, l) => acc + valorLinea(l.id, selectedIndices, modo), 0) / lineas.length : 0),
    [selectedIndices, modo],
  )

  const tiersLineas = useMemo(() => clasificarLineasABC(selectedIndices), [selectedIndices])

  const filas = filtradas.map((l) => {
    let columnas = null
    let actual
    let anterior
    let sparklineValues

    if (!isAnnual) {
      columnas = trailingIdx.map((i) => ({ label: periodShortLabel(PERIODS[i]), valor: valorLinea(l.id, [i], modo) }))
      actual = columnas[0]?.valor ?? 0
      anterior = columnas[1]?.valor ?? 0
      sparklineValues = columnas.map((col) => col.valor).slice().reverse()
    } else {
      actual = valorLinea(l.id, selectedIndices, modo)
      anterior = valorLinea(l.id, comparisonIndices, modo)
      sparklineValues = [anterior, actual]
    }

    const mejora = actual > anterior
    const evolucionPct = anterior > 0 ? Math.round((actual / anterior - 1) * 100) : actual > 0 ? 100 : 0
    const vsPromedioPct = promedioEmpresa > 0 ? Math.round((actual / promedioEmpresa - 1) * 100) : null

    return { ...l, columnas, actual, anterior, sparklineValues, mejora, evolucionPct, vsPromedioPct, tier: tiersLineas[l.id] }
  })

  // Top 5 / Bottom 5 líneas según el filtro de dirección activo — mismo
  // patrón que en Clientes, visible tanto al vendedor como al gerente.
  const top5 = [...filas].sort((a, b) => b.actual - a.actual).slice(0, 5)
  const bottom5 = [...filas].sort((a, b) => a.actual - b.actual).slice(0, 5)

  // Regla 80/20: cuántas líneas (del filtro de dirección activo) concentran
  // el 80% de la facturación — mismo criterio que usamos para la cartera de
  // cada vendedor en el Resumen Gerencial.
  const pareto80 = useMemo(() => {
    const ordenadas = [...filas].sort((a, b) => b.actual - a.actual)
    const total = ordenadas.reduce((acc, f) => acc + f.actual, 0)
    let acumulado = 0
    let count = 0
    if (total > 0) {
      for (const f of ordenadas) {
        acumulado += f.actual
        count += 1
        if (acumulado >= total * 0.8) break
      }
    }
    return {
      count,
      total: filas.length,
      pct: filas.length ? Math.round((count / filas.length) * 100) : null,
      items: ordenadas.slice(0, count),
    }
  }, [filas])

  // Composición de líneas por ranking A/B/C (del filtro de dirección
  // activo) — misma clasificación que alimenta la Regla 80/20.
  const composicionRK = { A: 0, B: 0, C: 0 }
  filas.forEach((f) => {
    if (f.tier) composicionRK[f.tier] += 1
  })
  const dataRK = [
    { name: 'A', value: composicionRK.A, fill: '#10b981' },
    { name: 'B', value: composicionRK.B, fill: '#f59e0b' },
    { name: 'C', value: composicionRK.C, fill: '#94a3b8' },
  ]

  // Evolución de líneas (del filtro de dirección activo) comparado según el
  // período elegido arriba — mes vs. mes anterior, o año vs. año anterior.
  const lineasEnMejora = filas.filter((f) => f.mejora)
  const lineasEnBaja = filas.filter((f) => !f.mejora)
  const pctMejoraLineas = filas.length ? Math.round((lineasEnMejora.length / filas.length) * 100) : 0
  const dataEvolucion = [
    { name: 'mejora', label: 'En mejora', value: lineasEnMejora.length, fill: '#10b981' },
    { name: 'baja', label: 'En baja', value: lineasEnBaja.length, fill: '#f43f5e' },
  ]

  // ---- Detalle de la línea seleccionada: qué clientes la compran y qué
  // SKU la componen, siempre respetando el período elegido arriba. ----
  const lineaData = lineaSeleccionada ? lineas.find((l) => l.id === lineaSeleccionada) : null
  const tiersSkuLinea = useMemo(() => clasificarSkusABC(selectedIndices), [selectedIndices])
  const clientesLinea = lineaData
    ? clientes
        .filter((c) => (lineasPreferidasPorCliente[c.codigo] ?? []).includes(lineaData.nombre))
        .map((c) => ({ codigo: c.codigo, razonSocial: c.razonSocial, venta: valorCliente(c.codigo, selectedIndices, modo) }))
        .sort((a, b) => b.venta - a.venta)
    : []
  const skusLinea = lineaData
    ? (skusPorLinea[lineaData.id] ?? [])
        .map((s) => ({ ...s, venta: valorSku(s.id, selectedIndices, modo), tier: tiersSkuLinea[s.id] }))
        .sort((a, b) => b.venta - a.venta)
    : []

  // Tabla visible: respeta el filtro de dirección (filas) y, si está activo,
  // el filtro por RK que se activa al tildar A/B/C en la composición.
  const filasTabla = filas
    .filter((f) => !rkFiltro || f.tier === rkFiltro)
    .filter((f) => !evolucionFiltro || (evolucionFiltro === 'mejora' ? f.mejora : !f.mejora))

  const filasOrdenadas = useMemo(() => {
    if (!sort.key) return filasTabla
    return [...filasTabla].sort((a, b) => compareValues(valorColumna(a, sort.key), valorColumna(b, sort.key), sort.dir))
  }, [filasTabla, sort])

  const totalActual = filasTabla.reduce((acc, f) => acc + f.actual, 0)
  const totalAnterior = filasTabla.reduce((acc, f) => acc + f.anterior, 0)
  const totalPorColumna = !isAnnual
    ? trailingIdx.map((_, colIdx) => filasTabla.reduce((acc, f) => acc + (f.columnas?.[colIdx]?.valor ?? 0), 0))
    : []

  const dias = diasEnMes(year, isAnnual ? new Date().getMonth() + 1 : month)
  const seriesDiarias = !isAnnual && vista === 'diario'
    ? filtradas.map((l) => serieDiariaLinea(l.id, year, month, modo))
    : []
  const filasDiarias = seriesDiarias.length
    ? Array.from({ length: dias }, (_, i) => {
        const valor = seriesDiarias.reduce((acc, serie) => acc + (serie[i]?.venta ?? 0), 0)
        return { day: i + 1, valor }
      })
    : []
  const totalDiario = vista === 'diario' ? filtradas.reduce((acc, l) => acc + valorLinea(l.id, [primaryIndex], modo), 0) : 0

  const filasDiariasOrdenadas = useMemo(() => {
    if (!sortDiario.key) return filasDiarias
    return [...filasDiarias].sort((a, b) =>
      compareValues(sortDiario.key === 'dia' ? a.day : a.valor, sortDiario.key === 'dia' ? b.day : b.valor, sortDiario.dir),
    )
  }, [filasDiarias, sortDiario])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <Card className="p-4 md:p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Promedio de venta por línea (empresa)</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{formatValor(promedioEmpresa, modo)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Referencia sobre las {lineas.length} líneas, sin filtro de dirección</p>
        </Card>
        <Card className={`p-4 md:p-5 ${pareto80.count > 0 ? 'cursor-pointer transition-shadow hover:shadow-md' : ''} ${pareto80Abierto ? 'ring-2 ring-indigo-500' : ''}`}>
          <button
            type="button"
            onClick={() => pareto80.count > 0 && setPareto80Abierto((v) => !v)}
            disabled={pareto80.count === 0}
            className="w-full text-left disabled:cursor-default"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 mb-1">Regla 80/20</p>
              {pareto80.count > 0 && (pareto80Abierto ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)}
            </div>
            <p className="text-xl md:text-2xl font-bold text-slate-900">
              {pareto80.total === 0 ? '—' : `${pareto80.count} de ${pareto80.total} líneas`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {pareto80.pct === null ? 'Sin datos.' : `Concentran el 80% de la facturación ${direccion !== 'Todas' ? `de "${direccion}"` : ''} · ${pareto80.pct}% del total de líneas`}
            </p>
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Composición de líneas por ranking (RK)</h2>
            {rkFiltro && (
              <button onClick={() => setRkFiltro(null)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                Mostrando sólo RK {rkFiltro} <X size={12} />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3">
            A concentra el primer 50% de la facturación, B suma hasta el 80% (la Regla 80/20), C es el 20% restante · tildá una para ver esas líneas en la tabla.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
            <div className="h-44 w-full sm:w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataRK}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    onClick={(d) => toggleRkFiltro(d.name)}
                    cursor="pointer"
                  >
                    {dataRK.map((d) => (
                      <Cell key={d.name} fill={d.fill} opacity={rkFiltro && rkFiltro !== d.name ? 0.35 : 1} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} líneas`, `RK ${n}`]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => toggleRkFiltro('A')}
                className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${rkFiltro === 'A' ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-slate-50'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-700">A</span>
                <span className="text-slate-500">{composicionRK.A} líneas</span>
              </button>
              <button
                onClick={() => toggleRkFiltro('B')}
                className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${rkFiltro === 'B' ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-slate-50'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-semibold text-slate-700">B</span>
                <span className="text-slate-500">{composicionRK.B} líneas</span>
              </button>
              <button
                onClick={() => toggleRkFiltro('C')}
                className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${rkFiltro === 'C' ? 'bg-slate-100 ring-1 ring-slate-300' : 'hover:bg-slate-50'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">C</span>
                <span className="text-slate-500">{composicionRK.C} líneas</span>
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Evolución de líneas</h2>
            {evolucionFiltro && (
              <button onClick={() => setEvolucionFiltro(null)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                Mostrando sólo {evolucionFiltro === 'mejora' ? 'en mejora' : 'en baja'} <X size={12} />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Comparado {isAnnual ? 'contra el año anterior' : 'contra el mes anterior'} · tildá para ver cuáles son en la tabla.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
            <div className="h-44 w-full sm:w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataEvolucion}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    onClick={(d) => toggleEvolucionFiltro(d.name)}
                    cursor="pointer"
                  >
                    {dataEvolucion.map((d) => (
                      <Cell key={d.name} fill={d.fill} opacity={evolucionFiltro && evolucionFiltro !== d.name ? 0.35 : 1} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, _n, entry) => [`${v} líneas`, entry.payload.label]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => toggleEvolucionFiltro('mejora')}
                className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${evolucionFiltro === 'mejora' ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-slate-50'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-700">En mejora</span>
                <span className="text-slate-500">{lineasEnMejora.length} líneas ({pctMejoraLineas}%)</span>
              </button>
              <button
                onClick={() => toggleEvolucionFiltro('baja')}
                className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${evolucionFiltro === 'baja' ? 'bg-rose-50 ring-1 ring-rose-300' : 'hover:bg-slate-50'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="font-semibold text-slate-700">En baja</span>
                <span className="text-slate-500">{lineasEnBaja.length} líneas ({100 - pctMejoraLineas}%)</span>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {pareto80Abierto && pareto80.items.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Líneas que concentran el 80% de la facturación</h2>
          <p className="text-xs text-slate-400 mb-3">
            Ordenadas de mayor a menor · {direccion !== 'Todas' ? `"${direccion}" · ` : ''}
            {label}
          </p>
          <div className="space-y-1.5">
            {pareto80.items.map((l, idx) => (
              <div key={l.id} className="flex items-center gap-3 bg-indigo-50/60 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-indigo-400 w-5 shrink-0">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 truncate">{l.nombre}</p>
                  <p className="text-[11px] text-slate-400">{l.direccion}</p>
                </div>
                <span className="text-sm font-medium text-indigo-600 shrink-0">{formatValor(l.actual, modo)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 md:p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Top 5 líneas</h2>
          <p className="text-xs text-slate-400 mb-3">Las que más venden {direccion !== 'Todas' ? `dentro de "${direccion}"` : ''} · {label}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatValor(v, modo)} />
                <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatValor(v, modo)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="actual" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {top5.map((l) => (
                    <Cell key={l.id} fill="#10b981" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Bottom 5 líneas</h2>
          <p className="text-xs text-slate-400 mb-3">Las que menos venden {direccion !== 'Todas' ? `dentro de "${direccion}"` : ''} · {label}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bottom5} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatValor(v, modo)} />
                <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatValor(v, modo)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="actual" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {bottom5.map((l) => (
                    <Cell key={l.id} fill="#f43f5e" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-500 font-medium">GRP Empresario</label>
        <select
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {direcciones.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <div className="flex bg-slate-100 rounded-lg p-0.5 text-sm font-medium">
          <button
            onClick={() => setVista('mensual')}
            className={`px-3 py-1 rounded-md transition-colors ${vista === 'mensual' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            Mensual
          </button>
          <button
            onClick={() => !isAnnual && setVista('diario')}
            disabled={isAnnual}
            title={isAnnual ? 'Elegí un mes específico para ver el detalle diario' : ''}
            className={`px-3 py-1 rounded-md transition-colors ${
              vista === 'diario' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
            } ${isAnnual ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            Diario
          </button>
        </div>

        <span className="text-xs text-slate-400 ml-auto">
          {vista === 'mensual' || isAnnual ? filasTabla.length : filtradas.length} líneas
          {rkFiltro ? ` · RK ${rkFiltro}` : ''}
          {evolucionFiltro ? ` · ${evolucionFiltro === 'mejora' ? 'en mejora' : 'en baja'}` : ''}
        </span>
      </Card>

      <p className="text-xs text-slate-400 -mt-2">Tocá una línea en la tabla para ver qué clientes la compran y qué SKU la componen en {label}.</p>

      {lineaData && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Detalle de {lineaData.nombre}</h2>
              <p className="text-xs text-slate-400">{lineaData.direccion} · {label}</p>
            </div>
            <button onClick={() => setLineaSeleccionada(null)} className="text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <Users size={13} /> Clientes que la compran
              </p>
              {clientesLinea.length === 0 ? (
                <p className="text-sm text-slate-400">Sin datos.</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {clientesLinea.map((c) => (
                    <div key={c.codigo} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-slate-700 truncate">{c.razonSocial}</p>
                        <p className="text-[11px] text-slate-400">{c.codigo}</p>
                      </div>
                      <span className="font-medium text-slate-800 shrink-0">{formatValor(c.venta, modo)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <Tag size={13} /> SKU de esta línea
              </p>
              {skusLinea.length === 0 ? (
                <p className="text-sm text-slate-400">Sin datos.</p>
              ) : (
                <div className="space-y-1.5">
                  {skusLinea.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-slate-700 truncate">{s.nombre}</p>
                        <p className="text-[11px] text-slate-400">{s.codigo}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colorRK(s.tier)}`}>{s.tier}</span>
                        <span className="font-medium text-slate-800">{formatValor(s.venta, modo)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {vista === 'mensual' || isAnnual ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                  <SortableTh label="Línea" sortKey="nombre" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k, 'asc'))} className="px-4 md:px-6 py-2.5" />
                  <th className="px-4 py-2.5 font-medium text-center">RK</th>
                  <th className="px-4 py-2.5 font-medium">Tendencia</th>
                  <SortableTh label="Evolución" sortKey="evolucion" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                  <SortableTh label="vs. Promedio" sortKey="vsPromedio" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                  {!isAnnual
                    ? trailingIdx.map((i, idx) => (
                        <SortableTh
                          key={i}
                          label={i === primaryIndex ? `${periodShortLabel(PERIODS[i])} (actual)` : periodShortLabel(PERIODS[i])}
                          sortKey={`col${idx}`}
                          sort={sort}
                          onSort={(k) => setSort((s) => nextSort(s, k))}
                          align="right"
                          className="px-4 py-2.5 whitespace-nowrap"
                        />
                      ))
                    : [
                        <SortableTh
                          key="actual"
                          label={`Venta ${label}`}
                          sortKey="actual"
                          sort={sort}
                          onSort={(k) => setSort((s) => nextSort(s, k))}
                          align="right"
                          className="px-4 py-2.5"
                        />,
                        <SortableTh
                          key="anterior"
                          label="Año anterior"
                          sortKey="anterior"
                          sort={sort}
                          onSort={(k) => setSort((s) => nextSort(s, k))}
                          align="right"
                          className="px-4 md:px-6 py-2.5"
                        />,
                      ]}
                </tr>
              </thead>
              <tbody>
                {filasOrdenadas.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => toggleLinea(l.id)}
                    className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer ${
                      lineaSeleccionada === l.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <td className="px-4 md:px-6 py-2.5 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{l.nombre}</div>
                      <div className="text-xs text-slate-400">{l.direccion}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {l.tier && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${colorRK(l.tier)}`}>{l.tier}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Sparkline values={l.sparklineValues} positive={l.mejora} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.mejora ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {l.evolucionPct >= 0 ? '▲' : '▼'} {Math.abs(l.evolucionPct)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {l.vsPromedioPct === null ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            l.vsPromedioPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {l.vsPromedioPct >= 0 ? '▲' : '▼'} {Math.abs(l.vsPromedioPct)}%
                        </span>
                      )}
                    </td>
                    {!isAnnual
                      ? l.columnas.map((col, idx) => (
                          <td
                            key={idx}
                            className={`px-4 py-2.5 text-right ${idx === 0 ? 'font-semibold text-slate-800' : 'text-slate-600'}`}
                          >
                            {formatValor(col.valor, modo)}
                          </td>
                        ))
                      : [
                          <td key="actual" className="px-4 py-2.5 text-right font-semibold text-slate-800">
                            {formatValor(l.actual, modo)}
                          </td>,
                          <td key="anterior" className="px-4 md:px-6 py-2.5 text-right text-slate-600">
                            {formatValor(l.anterior, modo)}
                          </td>,
                        ]}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
                  <td className="px-4 md:px-6 py-3">Total</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  {!isAnnual
                    ? totalPorColumna.map((t, idx) => (
                        <td key={idx} className="px-4 py-3 text-right">
                          {formatValor(t, modo)}
                        </td>
                      ))
                    : [
                        <td key="actual" className="px-4 py-3 text-right">
                          {formatValor(totalActual, modo)}
                        </td>,
                        <td key="anterior" className="px-4 md:px-6 py-3 text-right">
                          {formatValor(totalAnterior, modo)}
                        </td>,
                      ]}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 md:p-6 pb-2">
            <h2 className="text-sm font-semibold text-slate-700">Venta por día · {label}</h2>
            <p className="text-xs text-slate-400">{filtradas.length} líneas incluidas en la dirección seleccionada</p>
          </div>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <SortableTh label="Día" sortKey="dia" sort={sortDiario} onSort={(k) => setSortDiario((s) => nextSort(s, k, 'asc'))} className="px-4 md:px-6 py-2.5" />
                  <SortableTh label="Venta" sortKey="valor" sort={sortDiario} onSort={(k) => setSortDiario((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                  <th className="px-4 md:px-6 py-2.5 font-medium text-right">vs. día anterior</th>
                </tr>
              </thead>
              <tbody>
                {filasDiariasOrdenadas.map((d, i) => {
                  const prev = filasDiarias.find((x) => x.day === d.day - 1)?.valor
                  const up = prev === undefined ? null : d.valor >= prev
                  return (
                    <tr key={d.day} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 md:px-6 py-2 text-slate-700 font-medium">
                        {String(d.day).padStart(2, '0')}/{String(month).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700">{formatValor(d.valor, modo)}</td>
                      <td className="px-4 md:px-6 py-2 text-right">
                        {up === null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {up ? '▲' : '▼'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
                  <td className="px-4 md:px-6 py-3">Total {label}</td>
                  <td className="px-4 py-3 text-right">{formatValor(totalDiario, modo)}</td>
                  <td className="px-4 md:px-6 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
