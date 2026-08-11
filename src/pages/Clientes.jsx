import { useMemo, useState } from 'react'
import { TrendingUp, X, Package, Tag, CheckCircle2, PhoneCall, ChevronDown, ChevronUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { Card } from '../components/ui/Card'
import { Sparkline } from '../components/ui/Sparkline'
import { SortableTh } from '../components/ui/SortableTh'
import { GestionFormModal } from '../components/agenda/GestionFormModal'
import { usePeriod } from '../context/PeriodContext'
import { useValueMode } from '../context/ValueModeContext'
import { useAuth } from '../context/AuthContext'
import { useCatalogoBase, useReporteDiario } from '../api/reportes'
import { createLiveData, serieDiariaCliente, EMPTY_BASE } from '../data/liveData'
import { PERIODS, periodShortLabel, diasEnMes } from '../data/periods'
import { formatCurrency, formatValor } from '../utils/format'
import { compareValues, nextSort } from '../utils/sort'

const TRAILING = 5

function colorRK(t) {
  if (t === 'A') return 'bg-emerald-100 text-emerald-700'
  if (t === 'B') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-200 text-slate-600'
}

function valorColumna(fila, key) {
  if (key === 'nombre') return fila.razonSocial
  if (key === 'actual') return fila.actual
  if (key === 'anterior') return fila.anterior
  if (key === 'vsPromedio') return fila.vsPromedioPct ?? -Infinity
  if (key === 'evolucion') return fila.evolucionPct ?? -Infinity
  if (key.startsWith('col')) return fila.columnas?.[Number(key.slice(3))]?.valor ?? 0
  return 0
}

export default function Clientes() {
  const [categoria, setCategoria] = useState('Todas')
  const [vista, setVista] = useState('mensual') // 'mensual' | 'diario'
  const [sort, setSort] = useState({ key: null, dir: 'desc' })
  const [sortDiario, setSortDiario] = useState({ key: null, dir: 'desc' })
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [ofertaForm, setOfertaForm] = useState(null) // { nombreLinea } | null
  const [pareto80Abierto, setPareto80Abierto] = useState(false)
  const [rkFiltro, setRkFiltro] = useState(null) // 'A' | 'B' | 'C' | null
  const [evolucionFiltro, setEvolucionFiltro] = useState(null) // 'mejora' | 'baja' | null

  function toggleRkFiltro(tier) {
    setRkFiltro((prev) => (prev === tier ? null : tier))
  }

  function toggleEvolucionFiltro(estado) {
    setEvolucionFiltro((prev) => (prev === estado ? null : estado))
  }
  const { year, month, selectedIndices, primaryIndex, comparisonIndices, yoyIndices, isAnnual, label } = usePeriod()
  const { modo } = useValueMode()
  const { user } = useAuth()
  const esVendedor = user?.rol === 'vendedor'
  const { data: base, isLoading } = useCatalogoBase()
  const { data: diario } = useReporteDiario(year, month, !isAnnual && vista === 'diario')

  // Ver nota en Lineas.jsx: EMPTY_BASE evita cortar acá con un return y
  // romper el orden de hooks (useMemo) de más abajo.
  const {
    clientes,
    lineas,
    skus,
    valorCliente,
    ventaClienteRango,
    inflacionAcumulada,
    valorLinea,
    lineasPreferidasPorCliente,
    valorSku,
    skusPreferidosPorCliente,
    clasificarSkusABC,
    clasificarClientesABC,
  } = createLiveData(base ?? EMPTY_BASE)
  const categorias = ['Todas', ...new Set(clientes.map((c) => c.categoria))]

  function toggleCliente(codigo) {
    setClienteSeleccionado((prev) => (prev === codigo ? null : codigo))
  }

  const filtrados = useMemo(
    () => (categoria === 'Todas' ? clientes : clientes.filter((c) => c.categoria === categoria)),
    [categoria, clientes],
  )

  const trailingIdx = useMemo(() => {
    const idxs = []
    for (let k = 0; k < TRAILING; k++) {
      const idx = primaryIndex - k
      if (idx >= 0) idxs.push(idx)
    }
    return idxs
  }, [primaryIndex])

  const refInflacion = comparisonIndices.length ? comparisonIndices[comparisonIndices.length - 1] : primaryIndex - 1
  const inflacionComparacion = inflacionAcumulada(refInflacion, primaryIndex) ?? 0

  // Promedio de venta por cliente a nivel empresa (siempre sobre TODA la
  // cartera, sin importar el filtro de categoría, para que sea un valor de
  // referencia estable).
  const promedioEmpresa = useMemo(
    () => (clientes.length ? clientes.reduce((acc, c) => acc + valorCliente(c.codigo, selectedIndices, modo), 0) / clientes.length : 0),
    [selectedIndices, modo],
  )

  const tiersClientes = useMemo(() => clasificarClientesABC(selectedIndices), [selectedIndices])

  const filas = filtrados.map((c) => {
    let columnas = null
    let actual
    let anterior
    let sparklineValues

    if (!isAnnual) {
      columnas = trailingIdx.map((i) => ({ label: periodShortLabel(PERIODS[i]), valor: valorCliente(c.codigo, [i], modo) }))
      actual = columnas[0]?.valor ?? 0
      anterior = columnas[1]?.valor ?? 0
      sparklineValues = columnas.map((col) => col.valor).slice().reverse()
    } else {
      actual = valorCliente(c.codigo, selectedIndices, modo)
      anterior = valorCliente(c.codigo, comparisonIndices, modo)
      sparklineValues = [anterior, actual]
    }

    const evolucionPct = anterior > 0 ? Math.round((actual / anterior - 1) * 100) : actual > 0 ? 100 : 0

    let mejora
    if (modo === 'unidades') {
      mejora = actual > anterior
    } else {
      mejora = evolucionPct > inflacionComparacion
    }

    const yoyValido = yoyIndices.length === selectedIndices.length
    const yoyPesos = yoyValido ? ventaClienteRango(c.codigo, yoyIndices) : null
    const actualPesos = ventaClienteRango(c.codigo, selectedIndices)

    const vsPromedioPct = promedioEmpresa > 0 ? Math.round((actual / promedioEmpresa - 1) * 100) : null

    return { ...c, columnas, actual, anterior, sparklineValues, mejora, evolucionPct, yoyValido, yoyPesos, actualPesos, vsPromedioPct, tier: tiersClientes[c.codigo] }
  })

  // Tabla visible: respeta el filtro de categoría (filas) y, si está activo,
  // el filtro por RK que se activa al tildar A/B/C en la composición.
  const filasTabla = filas
    .filter((f) => !rkFiltro || f.tier === rkFiltro)
    .filter((f) => !evolucionFiltro || (evolucionFiltro === 'mejora' ? f.mejora : !f.mejora))

  const totalActual = filasTabla.reduce((acc, f) => acc + f.actual, 0)
  const totalAnterior = filasTabla.reduce((acc, f) => acc + f.anterior, 0)
  const totalPorColumna = !isAnnual
    ? trailingIdx.map((_, colIdx) => filasTabla.reduce((acc, f) => acc + (f.columnas?.[colIdx]?.valor ?? 0), 0))
    : []

  // ---- Detalle del cliente seleccionado: qué líneas y qué SKU le compra,
  // siempre respetando el período elegido arriba. ----
  const clienteData = clienteSeleccionado ? clientes.find((c) => c.codigo === clienteSeleccionado) : null

  // Cobertura de líneas: de TODO el catálogo de la empresa, cuáles le
  // compra el cliente y cuáles no — estas últimas son la oportunidad de
  // llamarlo y ofrecérselas.
  const nombresLineasCliente = clienteData ? lineasPreferidasPorCliente[clienteData.codigo] ?? [] : []
  const lineasQueCompra = clienteData
    ? lineas
        .filter((l) => nombresLineasCliente.includes(l.nombre))
        .map((l) => ({ nombre: l.nombre, venta: valorLinea(l.id, selectedIndices, modo) }))
        .sort((a, b) => b.venta - a.venta)
    : []
  const lineasQueNoCompra = clienteData ? lineas.filter((l) => !nombresLineasCliente.includes(l.nombre)) : []
  const coberturaPct = clienteData && lineas.length ? Math.round((lineasQueCompra.length / lineas.length) * 100) : null
  const skusCliente = clienteData
    ? (() => {
        const tiers = clasificarSkusABC(selectedIndices)
        return (skusPreferidosPorCliente[clienteData.codigo] ?? []).map((skuId) => {
          const sku = skus.find((s) => s.id === skuId)
          return {
            id: skuId,
            nombre: sku?.nombre ?? skuId,
            codigo: sku?.codigo ?? '',
            lineaNombre: sku?.lineaNombre ?? '',
            venta: valorSku(skuId, selectedIndices, modo),
            tier: tiers[skuId],
          }
        })
      })()
    : []

  // Top 5 / Bottom 5 clientes según el filtro de categoría activo — sirve
  // tanto para el vendedor como para el gerente, ambos ven esta misma solapa.
  const top5 = [...filas].sort((a, b) => b.actual - a.actual).slice(0, 5)
  const bottom5 = [...filas].sort((a, b) => a.actual - b.actual).slice(0, 5)

  // Regla 80/20: cuántos clientes (del filtro de categoría activo) concentran
  // el 80% de la facturación — mismo criterio que en Líneas, SKU y en la
  // cartera de cada vendedor del Resumen Gerencial.
  const pareto80 = useMemo(() => {
    const ordenados = [...filas].sort((a, b) => b.actual - a.actual)
    const total = ordenados.reduce((acc, f) => acc + f.actual, 0)
    let acumulado = 0
    let count = 0
    if (total > 0) {
      for (const f of ordenados) {
        acumulado += f.actual
        count += 1
        if (acumulado >= total * 0.8) break
      }
    }
    return {
      count,
      total: filas.length,
      pct: filas.length ? Math.round((count / filas.length) * 100) : null,
      items: ordenados.slice(0, count),
    }
  }, [filas])

  // Composición de la cartera por ranking A/B/C (del filtro de categoría
  // activo) — misma clasificación que alimenta la Regla 80/20: A concentra
  // el primer 50% de la facturación, B suma hasta el 80%, C es el resto.
  const composicionRK = { A: 0, B: 0, C: 0 }
  filas.forEach((f) => {
    if (f.tier) composicionRK[f.tier] += 1
  })
  const dataRK = [
    { name: 'A', value: composicionRK.A, fill: '#10b981' },
    { name: 'B', value: composicionRK.B, fill: '#f59e0b' },
    { name: 'C', value: composicionRK.C, fill: '#94a3b8' },
  ]

  const filasOrdenadas = useMemo(() => {
    if (!sort.key) return filasTabla
    return [...filasTabla].sort((a, b) => compareValues(valorColumna(a, sort.key), valorColumna(b, sort.key), sort.dir))
  }, [filasTabla, sort])

  const clientesEnMejora = filas.filter((f) => f.mejora)
  const clientesEnBaja = filas.filter((f) => !f.mejora)
  const dataEvolucion = [
    { name: 'mejora', label: 'En mejora', value: clientesEnMejora.length, fill: '#10b981' },
    { name: 'baja', label: 'En baja', value: clientesEnBaja.length, fill: '#f43f5e' },
  ]
  const pctMejora = filas.length ? Math.round((clientesEnMejora.length / filas.length) * 100) : 0
  const incrementoInteranual = clientesEnMejora.reduce(
    (acc, f) => acc + (f.yoyValido ? f.actualPesos - f.yoyPesos : 0),
    0,
  )
  const yoyBaseMejora = clientesEnMejora.reduce((acc, f) => acc + (f.yoyValido ? f.yoyPesos : 0), 0)
  const pctIncrementoInteranual = yoyBaseMejora > 0 ? Math.round((incrementoInteranual / yoyBaseMejora) * 100) : null

  // ---- Vista diaria ----
  const dias = diasEnMes(year, isAnnual ? new Date().getMonth() + 1 : month)
  const seriesDiarias = !isAnnual && vista === 'diario'
    ? filtrados.map((c) => serieDiariaCliente(diario, c.codigo, year, month, modo))
    : []
  const filasDiarias = seriesDiarias.length
    ? Array.from({ length: dias }, (_, i) => {
        const valor = seriesDiarias.reduce((acc, serie) => acc + (serie[i]?.venta ?? 0), 0)
        return { day: i + 1, valor }
      })
    : []
  // Se recalcula a partir del total mensual (no sumando los días redondeados)
  // para que coincida exactamente con la vista Mensual en modo Unidades.
  const totalDiario = vista === 'diario' ? filtrados.reduce((acc, c) => acc + valorCliente(c.codigo, [primaryIndex], modo), 0) : 0

  const filasDiariasOrdenadas = useMemo(() => {
    if (!sortDiario.key) return filasDiarias
    return [...filasDiarias].sort((a, b) =>
      compareValues(sortDiario.key === 'dia' ? a.day : a.valor, sortDiario.key === 'dia' ? b.day : b.valor, sortDiario.dir),
    )
  }, [filasDiarias, sortDiario])

  if (isLoading || !base) {
    return <p className="text-sm text-slate-400">Cargando clientes…</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 md:p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">
            Clientes en mejora {isAnnual ? '(vs. año anterior)' : '(vs. mes anterior)'}
            {modo === 'pesos' && ' · ajustado por inflación'}
          </p>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" />
            <p className="text-xl md:text-2xl font-bold text-slate-900">
              {clientesEnMejora.length} <span className="text-sm font-medium text-slate-400">de {filas.length}</span>
            </p>
            <span className="ml-auto text-sm font-semibold text-emerald-600">{pctMejora}%</span>
          </div>
          {modo === 'pesos' && (
            <p className="text-[11px] text-slate-400 mt-1">
              Inflación acumulada del período de comparación: {inflacionComparacion.toFixed(1)}%
            </p>
          )}
        </Card>
        <Card className="p-4 md:p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Incremento en ventas interanual (en pesos)</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-xl md:text-2xl font-bold ${incrementoInteranual >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(incrementoInteranual)}
            </p>
            {pctIncrementoInteranual !== null && (
              <span className={`text-sm font-semibold ${pctIncrementoInteranual >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ({pctIncrementoInteranual >= 0 ? '+' : ''}{pctIncrementoInteranual}%)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Suma del incremento año contra año de los clientes que vienen mejorando · {label}
          </p>
        </Card>
        <Card className="p-4 md:p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Promedio de venta por cliente (empresa)</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{formatValor(promedioEmpresa, modo)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Referencia sobre los {clientes.length} clientes de la cartera, sin filtro de categoría</p>
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
              {pareto80.total === 0 ? '—' : `${pareto80.count} de ${pareto80.total} clientes`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {pareto80.pct === null ? 'Sin datos.' : `Concentran el 80% de la facturación ${categoria !== 'Todas' ? `de "${categoria}"` : ''} · ${pareto80.pct}% del total de clientes`}
            </p>
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Composición de la cartera por ranking (RK)</h2>
            {rkFiltro && (
              <button
                onClick={() => setRkFiltro(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Mostrando sólo RK {rkFiltro} <X size={12} />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3">
            A concentra el primer 50% de la facturación, B suma hasta el 80% (la Regla 80/20), C es el 20% restante · tildá una para ver esos clientes en la tabla.
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
                  <Tooltip formatter={(v, n) => [`${v} clientes`, `RK ${n}`]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
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
                <span className="text-slate-500">{composicionRK.A} clientes</span>
              </button>
              <button
                onClick={() => toggleRkFiltro('B')}
                className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${rkFiltro === 'B' ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-slate-50'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-semibold text-slate-700">B</span>
                <span className="text-slate-500">{composicionRK.B} clientes</span>
              </button>
              <button
                onClick={() => toggleRkFiltro('C')}
                className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${rkFiltro === 'C' ? 'bg-slate-100 ring-1 ring-slate-300' : 'hover:bg-slate-50'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">C</span>
                <span className="text-slate-500">{composicionRK.C} clientes</span>
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Evolución de la cartera</h2>
            {evolucionFiltro && (
              <button
                onClick={() => setEvolucionFiltro(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
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
                  <Tooltip formatter={(v, _n, entry) => [`${v} clientes`, entry.payload.label]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
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
                <span className="text-slate-500">{clientesEnMejora.length} clientes ({pctMejora}%)</span>
              </button>
              <button
                onClick={() => toggleEvolucionFiltro('baja')}
                className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${evolucionFiltro === 'baja' ? 'bg-rose-50 ring-1 ring-rose-300' : 'hover:bg-slate-50'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="font-semibold text-slate-700">En baja</span>
                <span className="text-slate-500">{clientesEnBaja.length} clientes ({100 - pctMejora}%)</span>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {pareto80Abierto && pareto80.items.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Clientes que concentran el 80% de la facturación</h2>
          <p className="text-xs text-slate-400 mb-3">
            Ordenados de mayor a menor · {categoria !== 'Todas' ? `"${categoria}" · ` : ''}
            {label}
          </p>
          <div className="space-y-1.5">
            {pareto80.items.map((c, idx) => (
              <div key={c.codigo} className="flex items-center gap-3 bg-indigo-50/60 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-indigo-400 w-5 shrink-0">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 truncate">{c.razonSocial}</p>
                  <p className="text-[11px] text-slate-400">{c.codigo} · {c.categoria}</p>
                </div>
                <span className="text-sm font-medium text-indigo-600 shrink-0">{formatValor(c.actual, modo)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 md:p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Top 5 clientes</h2>
          <p className="text-xs text-slate-400 mb-3">Los que más venden {categoria !== 'Todas' ? `dentro de "${categoria}"` : ''} · {label}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatValor(v, modo)} />
                <YAxis
                  type="category"
                  dataKey="razonSocial"
                  width={130}
                  tick={{ fontSize: 11, fill: '#334155' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => formatValor(v, modo)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="actual" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {top5.map((c) => (
                    <Cell key={c.codigo} fill="#10b981" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Bottom 5 clientes</h2>
          <p className="text-xs text-slate-400 mb-3">Los que menos venden {categoria !== 'Todas' ? `dentro de "${categoria}"` : ''} · {label}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bottom5} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatValor(v, modo)} />
                <YAxis
                  type="category"
                  dataKey="razonSocial"
                  width={130}
                  tick={{ fontSize: 11, fill: '#334155' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => formatValor(v, modo)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="actual" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {bottom5.map((c) => (
                    <Cell key={c.codigo} fill="#f43f5e" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-500 font-medium">Categoría Cliente</label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
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
          {vista === 'mensual' || isAnnual ? filasTabla.length : filtrados.length} clientes
          {rkFiltro ? ` · RK ${rkFiltro}` : ''}
          {evolucionFiltro ? ` · ${evolucionFiltro === 'mejora' ? 'en mejora' : 'en baja'}` : ''}
        </span>
      </Card>

      <p className="text-xs text-slate-400 -mt-2">Tocá un cliente en la tabla para ver qué líneas y SKU compra en {label}.</p>

      {clienteData && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Qué le compra {clienteData.razonSocial}</h2>
              <p className="text-xs text-slate-400">{clienteData.codigo} · {clienteData.categoria} · {label}</p>
            </div>
            <button onClick={() => setClienteSeleccionado(null)} className="text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Package size={13} /> Cobertura de líneas
              </p>
              {coberturaPct !== null && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    coberturaPct >= 70 ? 'bg-emerald-50 text-emerald-700' : coberturaPct >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {lineasQueCompra.length} de {lineas.length} líneas · {coberturaPct}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-1.5">Le compra</p>
                {lineasQueCompra.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin datos.</p>
                ) : (
                  <div className="space-y-1.5">
                    {lineasQueCompra.map((l) => (
                      <div key={l.nombre} className="flex items-center gap-2 text-sm bg-emerald-50/60 rounded-lg px-3 py-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        <span className="text-slate-700 flex-1 truncate">{l.nombre}</span>
                        <span className="font-medium text-slate-800">{formatValor(l.venta, modo)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-1.5">No le compra · oportunidad</p>
                {lineasQueNoCompra.length === 0 ? (
                  <p className="text-sm text-emerald-600">Le compra todas las líneas del catálogo.</p>
                ) : (
                  <div className="space-y-1.5">
                    {lineasQueNoCompra.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 text-sm bg-rose-50/60 rounded-lg px-3 py-2">
                        <span className="text-slate-700 flex-1 truncate">{l.nombre}</span>
                        <button
                          onClick={() => setOfertaForm({ nombreLinea: l.nombre })}
                          className="shrink-0 flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-full px-2 py-1 transition-colors"
                        >
                          <PhoneCall size={11} /> Ofrecer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Tag size={13} /> SKU que compra
            </p>
            {skusCliente.length === 0 ? (
              <p className="text-sm text-slate-400">Sin datos.</p>
            ) : (
              <div className="space-y-1.5">
                {skusCliente.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-slate-700 truncate">{s.nombre}</p>
                      <p className="text-[11px] text-slate-400">{s.codigo} · {s.lineaNombre}</p>
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
        </Card>
      )}

      <GestionFormModal
        open={!!ofertaForm}
        onClose={() => setOfertaForm(null)}
        defaultClienteCodigo={clienteData?.codigo ?? ''}
        defaultTipo="Llamada"
        defaultNotas={ofertaForm ? `Ofrecer línea "${ofertaForm.nombreLinea}" — el cliente no la está comprando actualmente.` : ''}
        esVendedor={esVendedor}
        nombreVendedor={user?.nombre}
      />

      {vista === 'mensual' || isAnnual ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                  <SortableTh label="Cliente" sortKey="nombre" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k, 'asc'))} className="px-4 md:px-6 py-2.5" />
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
                {filasOrdenadas.map((c) => (
                  <tr
                    key={c.codigo}
                    onClick={() => toggleCliente(c.codigo)}
                    className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                      clienteSeleccionado === c.codigo ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 md:px-6 py-2.5 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{c.razonSocial}</div>
                      <div className="text-xs text-slate-400">
                        {c.codigo} · {c.categoria}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {c.tier && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${colorRK(c.tier)}`}>{c.tier}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Sparkline values={c.sparklineValues} positive={c.mejora} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.mejora ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {c.evolucionPct >= 0 ? '▲' : '▼'} {Math.abs(c.evolucionPct)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.vsPromedioPct === null ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            c.vsPromedioPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {c.vsPromedioPct >= 0 ? '▲' : '▼'} {Math.abs(c.vsPromedioPct)}%
                        </span>
                      )}
                    </td>
                    {!isAnnual
                      ? c.columnas.map((col, idx) => (
                          <td
                            key={idx}
                            className={`px-4 py-2.5 text-right ${idx === 0 ? 'font-semibold text-slate-800' : 'text-slate-600'}`}
                          >
                            {formatValor(col.valor, modo)}
                          </td>
                        ))
                      : [
                          <td key="actual" className="px-4 py-2.5 text-right font-semibold text-slate-800">
                            {formatValor(c.actual, modo)}
                          </td>,
                          <td key="anterior" className="px-4 md:px-6 py-2.5 text-right text-slate-600">
                            {formatValor(c.anterior, modo)}
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
            <p className="text-xs text-slate-400">{filtrados.length} clientes incluidos en la categoría seleccionada</p>
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
