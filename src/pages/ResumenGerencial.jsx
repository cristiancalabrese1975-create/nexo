import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { X, Users, TrendingUp, AlertTriangle, Phone, MapPin, Video, Target, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { StatusDot } from '../components/ui/StatusDot'
import { SortableTh } from '../components/ui/SortableTh'
import { usePeriod } from '../context/PeriodContext'
import {
  vendedores,
  clientes,
  resumenPorPeriodo,
  ventaVendedorRango,
  ventaClienteRango,
  actividadesAgendaSemilla,
  oportunidades,
  etapasPipeline,
  indexOfFecha,
  clientesAGestionarHoy,
  clasificarClientesABC,
  lineasPreferidasPorCliente,
  whatsappVendedor,
  HOY_DEMO_ISO,
} from '../data/mockData'
import { diasHabilesInfo, PERIODS, MONTH_ABBR } from '../data/periods'
import { formatCurrency } from '../utils/format'
import { compareValues, nextSort } from '../utils/sort'

const COLORES_VENDEDOR = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6']

function fechaCorta(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

const estadoStyles = {
  Realizada: 'bg-emerald-50 text-emerald-700',
  Pendiente: 'bg-amber-50 text-amber-700',
  Reprogramada: 'bg-slate-100 text-slate-600',
}

const iconosPorTipo = { Visita: MapPin, Llamada: Phone, Videollamada: Video }

function colorTasa(t) {
  if (t === null) return 'bg-slate-50 text-slate-400'
  if (t >= 50) return 'bg-emerald-100 text-emerald-700'
  if (t >= 20) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

export default function ResumenGerencial() {
  const { year, month, selectedIndices, comparisonIndices, isAnnual, isSingleMonth, label } = usePeriod()
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null)
  const [sort, setSort] = useState({ key: 'venta', dir: 'desc' })
  const [mostrarEvolucion, setMostrarEvolucion] = useState(false)
  const [rkEmpresaAbierto, setRkEmpresaAbierto] = useState(null) // 'A' | 'B' | 'C' | null
  const [gestionesAbierto, setGestionesAbierto] = useState(false)
  const [aGestionarAbierto, setAGestionarAbierto] = useState(false)

  function toggleRkEmpresa(tier) {
    setRkEmpresaAbierto((prev) => (prev === tier ? null : tier))
  }

  const objetivoGlobal = selectedIndices.reduce((acc, i) => acc + (resumenPorPeriodo[i]?.objetivo ?? 0), 0)
  const objetivoPorVendedor = vendedores.length ? objetivoGlobal / vendedores.length : 0
  const habiles = isSingleMonth ? diasHabilesInfo(year, month, HOY_DEMO_ISO) : null

  const filasBase = vendedores.map((v) => {
    const venta = ventaVendedorRango(v, selectedIndices)
    const objetivo = objetivoPorVendedor
    const avance = objetivo > 0 ? Math.round((venta / objetivo) * 100) : null

    const gestionesActs = actividadesAgendaSemilla.filter(
      (a) => a.vendedor === v && selectedIndices.includes(indexOfFecha(a.fecha)),
    )
    const porTipo = { Visita: 0, Llamada: 0, Videollamada: 0 }
    const porEstado = { Realizada: 0, Pendiente: 0, Reprogramada: 0 }
    gestionesActs.forEach((a) => {
      porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1
      porEstado[a.estado] = (porEstado[a.estado] ?? 0) + 1
    })

    const opsDelVendedor = oportunidades.filter(
      (o) => o.vendedor === v && selectedIndices.includes(indexOfFecha(o.fecha)),
    )
    const ganadas = opsDelVendedor.filter((o) => o.etapa === 'ganado')
    const abiertas = opsDelVendedor.filter((o) => o.etapa !== 'ganado' && o.etapa !== 'perdido')
    const porEtapa = Object.fromEntries(etapasPipeline.map((e) => [e.id, opsDelVendedor.filter((o) => o.etapa === e.id).length]))
    const tasaConversion = opsDelVendedor.length ? Math.round((ganadas.length / opsDelVendedor.length) * 100) : null

    const proyeccionCierre =
      habiles && habiles.transcurridos > 0 ? Math.round((venta / habiles.transcurridos) * habiles.totalHabiles) : null

    // Regla 80/20: cuántos clientes de la cartera del vendedor concentran el
    // 80% de su facturación del período. Menos clientes = cartera más
    // concentrada (más riesgo si se pierde alguno de esos clientes).
    const clientesDelVendedor = clientes.filter((c) => c.vendedorAsignado === v)
    const ventasOrdenadas = clientesDelVendedor
      .map((c) => ventaClienteRango(c.codigo, selectedIndices))
      .sort((a, b) => b - a)
    const ventaCarteraTotal = ventasOrdenadas.reduce((acc, x) => acc + x, 0)
    let acumuladoPareto = 0
    let pareto80Count = 0
    if (ventaCarteraTotal > 0) {
      for (const val of ventasOrdenadas) {
        acumuladoPareto += val
        pareto80Count += 1
        if (acumuladoPareto >= ventaCarteraTotal * 0.8) break
      }
    }
    const pareto80Pct = clientesDelVendedor.length > 0 ? Math.round((pareto80Count / clientesDelVendedor.length) * 100) : null

    return {
      vendedor: v,
      clientesAsignados: clientesDelVendedor.length,
      pareto80Count,
      pareto80Pct,
      venta,
      objetivo,
      avance,
      gestiones: gestionesActs.length,
      porTipo,
      porEstado,
      porEtapa,
      tasaConversion,
      proyeccionCierre,
      aGestionarHoy: clientesAGestionarHoy(v).length,
      ganadasCant: ganadas.length,
      ganadasValor: ganadas.reduce((acc, o) => acc + o.valor, 0),
      abiertasCant: abiertas.length,
      abiertasValor: abiertas.reduce((acc, o) => acc + o.valor, 0),
    }
  })

  const ventaTotal = filasBase.reduce((acc, f) => acc + f.venta, 0)
  const promedioEquipo = filasBase.length ? ventaTotal / filasBase.length : 0

  const filas = filasBase.map((f) => ({
    ...f,
    vsPromedioPct: promedioEquipo > 0 ? Math.round((f.venta / promedioEquipo - 1) * 100) : null,
  }))

  const filasOrdenadas = useMemo(() => {
    if (!sort.key) return filas
    const valor = (f) => {
      if (sort.key === 'vendedor') return f.vendedor
      return f[sort.key]
    }
    return [...filas].sort((a, b) => compareValues(valor(a), valor(b), sort.dir))
  }, [filas, sort])

  const gestionesTotal = filas.reduce((acc, f) => acc + f.gestiones, 0)
  const aGestionarHoyTotal = filas.reduce((acc, f) => acc + f.aGestionarHoy, 0)
  const avanceEquipo = objetivoGlobal > 0 ? Math.round((ventaTotal / objetivoGlobal) * 100) : null

  // Detalle de las gestiones registradas y de los clientes a gestionar hoy,
  // de toda la empresa (sin filtrar por vendedor) — para el drill-down de
  // las tarjetas de KPI de arriba.
  const gestionesDetalle = actividadesAgendaSemilla
    .filter((a) => selectedIndices.includes(indexOfFecha(a.fecha)))
    .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`))
  const aGestionarDetalle = clientesAGestionarHoy()

  const pieData = filas.map((f) => ({
    name: f.vendedor,
    value: f.venta,
    pct: ventaTotal > 0 ? Math.round((f.venta / ventaTotal) * 100) : 0,
  }))

  // Evolución mensual: venta de cada vendedor mes a mes durante el año
  // elegido, siempre en pesos, para ver quién viene acompañando el
  // crecimiento del equipo y quién queda por debajo del promedio.
  const evolucionMensual = useMemo(() => {
    return PERIODS.map((p, i) => {
      if (p.year !== year) return null
      const punto = { mes: MONTH_ABBR[p.month - 1] }
      let total = 0
      vendedores.forEach((v) => {
        const venta = ventaVendedorRango(v, [i])
        punto[v] = venta
        total += venta
      })
      punto.promedio = vendedores.length ? Math.round(total / vendedores.length) : 0
      return punto
    }).filter(Boolean)
  }, [year])

  const resumenEvolucion = vendedores.map((v, i) => {
    const meses = evolucionMensual.length
    const porEncima = evolucionMensual.filter((p) => p[v] >= p.promedio).length
    return { vendedor: v, color: COLORES_VENDEDOR[i % COLORES_VENDEDOR.length], porEncima, meses }
  })

  // ---- Detalle del vendedor seleccionado ----
  const vendedorData = vendedorSeleccionado ? filas.find((f) => f.vendedor === vendedorSeleccionado) : null

  const clientesVendedor = vendedorSeleccionado
    ? clientes.filter((c) => c.vendedorAsignado === vendedorSeleccionado)
    : []
  const tiersABC = clasificarClientesABC(selectedIndices)

  // Composición de TODA la cartera de la empresa por ranking A/B/C — misma
  // clasificación acumulada que alimenta la Regla 80/20 en Clientes.
  const composicionRKEmpresa = { A: 0, B: 0, C: 0 }
  clientes.forEach((c) => {
    const t = tiersABC[c.codigo]
    if (t) composicionRKEmpresa[t] += 1
  })
  const dataRKEmpresa = [
    { name: 'A', value: composicionRKEmpresa.A, fill: '#10b981' },
    { name: 'B', value: composicionRKEmpresa.B, fill: '#f59e0b' },
    { name: 'C', value: composicionRKEmpresa.C, fill: '#94a3b8' },
  ]
  const clientesRkEmpresa = rkEmpresaAbierto
    ? clientes
        .filter((c) => tiersABC[c.codigo] === rkEmpresaAbierto)
        .map((c) => ({ ...c, venta: ventaClienteRango(c.codigo, selectedIndices) }))
        .sort((a, b) => b.venta - a.venta)
    : []

  const filasClientes = clientesVendedor
    .map((c) => {
      const actual = ventaClienteRango(c.codigo, selectedIndices)
      const anterior = comparisonIndices.length ? ventaClienteRango(c.codigo, comparisonIndices) : 0
      return { ...c, actual, anterior, mejora: actual > anterior, tier: tiersABC[c.codigo] }
    })
    .sort((a, b) => b.actual - a.actual)
  const clientesEnMejora = filasClientes.filter((f) => f.mejora)
  const incrementoVendedor = clientesEnMejora.reduce((acc, f) => acc + (f.actual - f.anterior), 0)
  const pendientesVendedor = vendedorSeleccionado ? clientesAGestionarHoy(vendedorSeleccionado) : []

  const composicionRK = { A: 0, B: 0, C: 0 }
  filasClientes.forEach((c) => {
    if (c.tier) composicionRK[c.tier] += 1
  })

  const lineasFrecuencia = {}
  filasClientes.forEach((c) => {
    ;(lineasPreferidasPorCliente[c.codigo] || []).forEach((l) => {
      lineasFrecuencia[l] = (lineasFrecuencia[l] ?? 0) + 1
    })
  })
  const lineasTopVendedor = Object.entries(lineasFrecuencia).sort((a, b) => b[1] - a[1])

  function toggleVendedor(v) {
    setVendedorSeleccionado((prev) => (prev === v ? null : v))
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <p className="text-sm text-slate-500">
        Supervisión de: <span className="font-medium text-slate-700">{label}</span>
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="p-4 md:p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Venta del equipo</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{formatCurrency(ventaTotal)}</p>
        </Card>
        <Card className="p-4 md:p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Objetivo del equipo</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{formatCurrency(objetivoGlobal)}</p>
        </Card>
        <Card className="p-4 md:p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Avance del equipo</p>
          <p className={`text-xl md:text-2xl font-bold ${avanceEquipo >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
            {avanceEquipo === null ? '—' : `${avanceEquipo}%`}
          </p>
        </Card>
        <Card className={`p-4 md:p-5 ${gestionesTotal > 0 ? 'cursor-pointer transition-shadow hover:shadow-md' : ''} ${gestionesAbierto ? 'ring-2 ring-indigo-500' : ''}`}>
          <button
            type="button"
            onClick={() => gestionesTotal > 0 && setGestionesAbierto((v) => !v)}
            disabled={gestionesTotal === 0}
            className="w-full text-left disabled:cursor-default"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 mb-1">Gestiones registradas</p>
              {gestionesTotal > 0 && (gestionesAbierto ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)}
            </div>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{gestionesTotal}</p>
          </button>
        </Card>
        <Card className={`p-4 md:p-5 ${aGestionarHoyTotal > 0 ? 'cursor-pointer transition-shadow hover:shadow-md' : ''} ${aGestionarAbierto ? 'ring-2 ring-indigo-500' : ''}`}>
          <button
            type="button"
            onClick={() => aGestionarHoyTotal > 0 && setAGestionarAbierto((v) => !v)}
            disabled={aGestionarHoyTotal === 0}
            className="w-full text-left disabled:cursor-default"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 mb-1">A gestionar hoy</p>
              {aGestionarHoyTotal > 0 && (aGestionarAbierto ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)}
            </div>
            <p className={`text-xl md:text-2xl font-bold ${aGestionarHoyTotal > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {aGestionarHoyTotal}
            </p>
          </button>
        </Card>
      </div>

      {gestionesAbierto && gestionesDetalle.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Gestiones registradas</h2>
          <p className="text-xs text-slate-400 mb-3">Todas las gestiones del equipo · {label}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2 font-medium">Cliente</th>
                  <th className="py-2 font-medium">Vendedor</th>
                  <th className="py-2 font-medium">Tipo</th>
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {gestionesDetalle.map((a) => {
                  const Icono = iconosPorTipo[a.tipo] ?? Phone
                  return (
                    <tr key={a.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 text-slate-700">{a.cliente}</td>
                      <td className="py-2 text-slate-500">{a.vendedor}</td>
                      <td className="py-2 text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Icono size={13} className="text-slate-400" />
                          {a.tipo}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500">{fechaCorta(a.fecha)}</td>
                      <td className="py-2 text-right">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoStyles[a.estado] ?? ''}`}>{a.estado}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {aGestionarAbierto && aGestionarDetalle.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Clientes a gestionar hoy</h2>
          <p className="text-xs text-slate-400 mb-3">De toda la cartera del equipo</p>
          <div className="space-y-1.5">
            {aGestionarDetalle.map(({ cliente, fechaReferencia }) => (
              <div key={cliente.codigo} className="flex items-center justify-between text-sm bg-amber-50/60 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-slate-700 truncate">{cliente.razonSocial}</p>
                  <p className="text-[11px] text-slate-400">{cliente.vendedorAsignado}</p>
                </div>
                <span className={`text-xs font-medium shrink-0 ${fechaReferencia < HOY_DEMO_ISO ? 'text-rose-600' : 'text-amber-600'}`}>
                  {fechaReferencia < HOY_DEMO_ISO ? `Vencida desde el ${fechaCorta(fechaReferencia)}` : 'Hoy'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Venta vs. objetivo por vendedor</h2>
          <div className="h-64 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filas} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="vendedor" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="venta" name="Venta" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar dataKey="objetivo" name="Objetivo" fill="#c7d2fe" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <ReferenceLine
                  y={promedioEquipo}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  label={{ value: 'Promedio equipo', position: 'insideTopRight', fontSize: 11, fontWeight: 600, fill: '#f59e0b' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Distribución de venta del equipo</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={2}
                  label={(entry) => `${entry.pct}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORES_VENDEDOR[i % COLORES_VENDEDOR.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Composición de la cartera por ranking (RK) · a nivel empresa</h2>
        <p className="text-xs text-slate-400 mb-3">
          A concentra el primer 50% de la facturación, B suma hasta el 80% (la Regla 80/20), C es el 20% restante · tildá una para ver esos clientes. Sobre toda la cartera, sin filtro de vendedor.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
          <div className="h-44 w-full sm:w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataRKEmpresa}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  onClick={(d) => toggleRkEmpresa(d.name)}
                  cursor="pointer"
                >
                  {dataRKEmpresa.map((d) => (
                    <Cell key={d.name} fill={d.fill} opacity={rkEmpresaAbierto && rkEmpresaAbierto !== d.name ? 0.35 : 1} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} clientes`, `RK ${n}`]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => toggleRkEmpresa('A')}
              className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${rkEmpresaAbierto === 'A' ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-slate-50'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-700">A</span>
              <span className="text-slate-500">{composicionRKEmpresa.A} clientes · cuidalos, sostienen la mitad de la facturación</span>
            </button>
            <button
              onClick={() => toggleRkEmpresa('B')}
              className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${rkEmpresaAbierto === 'B' ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-slate-50'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold text-slate-700">B</span>
              <span className="text-slate-500">{composicionRKEmpresa.B} clientes · completan el 80% junto con los A</span>
            </button>
            <button
              onClick={() => toggleRkEmpresa('C')}
              className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${rkEmpresaAbierto === 'C' ? 'bg-slate-100 ring-1 ring-slate-300' : 'hover:bg-slate-50'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700">C</span>
              <span className="text-slate-500">{composicionRKEmpresa.C} clientes · oportunidad de crecimiento, potencialos</span>
            </button>
          </div>
        </div>

        {rkEmpresaAbierto && clientesRkEmpresa.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">Clientes RK {rkEmpresaAbierto} · ordenados de mayor a menor venta</p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {clientesRkEmpresa.map((c, idx) => (
                <div key={c.codigo} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">{c.razonSocial}</p>
                    <p className="text-[11px] text-slate-400">{c.codigo} · {c.vendedorAsignado}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-700 shrink-0">{formatCurrency(c.venta)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 md:p-6">
        <button
          onClick={() => setMostrarEvolucion((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Evolución mensual por vendedor</h2>
            <p className="text-xs text-slate-400 mt-0.5">Quién viene acompañando el crecimiento del equipo y quién queda por debajo · {year}, siempre en pesos</p>
          </div>
          {mostrarEvolucion ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
        </button>

        {mostrarEvolucion && (
          <div className="mt-4">
            <div className="h-64 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucionMensual} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="promedio" name="Promedio equipo" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                  {vendedores.map((v, i) => (
                    <Line
                      key={v}
                      type="monotone"
                      dataKey={v}
                      name={v}
                      stroke={COLORES_VENDEDOR[i % COLORES_VENDEDOR.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {resumenEvolucion.map((r) => (
                <div key={r.vendedor} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-2.5 py-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="font-medium text-slate-700">{r.vendedor}</span>
                  <span className={r.porEncima >= r.meses / 2 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                    {r.porEncima} de {r.meses} meses por encima del promedio
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 md:px-6 pt-4 pb-1 flex flex-wrap items-center gap-2">
          <p className="text-xs text-slate-400">
            Ranking de gestión comercial · tocá un vendedor para ver el detalle.
            {!isSingleMonth && ' La proyección de cierre sólo se calcula con un único mes elegido.'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                <th className="px-4 md:px-6 py-2.5 font-medium">RK</th>
                <SortableTh label="Vendedor" sortKey="vendedor" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k, 'asc'))} className="px-4 py-2.5" />
                <SortableTh label="Clientes" sortKey="clientesAsignados" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="80/20" sortKey="pareto80Count" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="Venta" sortKey="venta" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="Objetivo" sortKey="objetivo" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="Avance" sortKey="avance" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="vs. Promedio" sortKey="vsPromedioPct" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="Proyección" sortKey="proyeccionCierre" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="Tasa conv." sortKey="tasaConversion" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="Gestiones" sortKey="gestiones" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="A gestionar hoy" sortKey="aGestionarHoy" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 md:px-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filasOrdenadas.map((f, idx) => (
                <tr
                  key={f.vendedor}
                  onClick={() => toggleVendedor(f.vendedor)}
                  className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                    vendedorSeleccionado === f.vendedor ? 'bg-indigo-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-4 md:px-6 py-2.5 text-slate-400 font-medium">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {f.vendedor}
                      {(() => {
                        const mensaje = `Hola ${f.vendedor.split(' ')[0]}! ¿Cómo venís con el objetivo del mes? Llevás ${f.avance ?? 0}% de avance.`
                        const url = whatsappVendedor(f.vendedor, mensaje)
                        return (
                          url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-500 hover:text-emerald-700 shrink-0"
                              title={`Escribirle por WhatsApp a ${f.vendedor}`}
                            >
                              <MessageCircle size={15} />
                            </a>
                          )
                        )
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{f.clientesAsignados}</td>
                  <td className="px-4 py-2.5 text-right">
                    {f.pareto80Pct === null ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <div className="flex flex-col items-end leading-tight">
                        <span className="font-medium text-slate-700">
                          {f.pareto80Count}/{f.clientesAsignados}
                        </span>
                        <span className="text-[10px] text-slate-400">{f.pareto80Pct}% cartera</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(f.venta)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(f.objetivo)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-medium text-slate-700">{f.avance === null ? '—' : `${f.avance}%`}</span>
                      <StatusDot pct={f.avance ?? 0} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {f.vsPromedioPct === null ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          f.vsPromedioPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {f.vsPromedioPct >= 0 ? '▲' : '▼'} {Math.abs(f.vsPromedioPct)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {f.proyeccionCierre === null ? '—' : formatCurrency(f.proyeccionCierre)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorTasa(f.tasaConversion)}`}>
                      {f.tasaConversion === null ? '—' : `${f.tasaConversion}%`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{f.gestiones}</td>
                  <td className="px-4 md:px-6 py-2.5 text-right">
                    {f.aGestionarHoy > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <AlertTriangle size={11} />
                        {f.aGestionarHoy}
                      </span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {vendedorData && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Detalle de {vendedorSeleccionado}</h2>
            <button onClick={() => setVendedorSeleccionado(null)} className="text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500 mb-2">Gestiones por tipo</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <MapPin size={12} /> Visitas
                  </span>
                  <span className="font-medium text-slate-800">{vendedorData.porTipo.Visita}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Phone size={12} /> Llamadas
                  </span>
                  <span className="font-medium text-slate-800">{vendedorData.porTipo.Llamada}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Video size={12} /> Videollamadas
                  </span>
                  <span className="font-medium text-slate-800">{vendedorData.porTipo.Videollamada}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500 mb-2">Gestiones por estado</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Realizada</span>
                  <span className="font-medium text-slate-800">{vendedorData.porEstado.Realizada}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Pendiente</span>
                  <span className="font-medium text-slate-800">{vendedorData.porEstado.Pendiente}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Reprogramada</span>
                  <span className="font-medium text-slate-800">{vendedorData.porEstado.Reprogramada}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500 mb-2">Oportunidades por etapa</p>
              <div className="space-y-1 text-sm">
                {etapasPipeline.map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                      {e.nombre}
                    </span>
                    <span className="font-medium text-slate-800">{vendedorData.porEtapa[e.id] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Target size={18} className="text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Tasa de conversión</p>
                <p className="text-lg font-bold text-slate-900">
                  {vendedorData.tasaConversion === null ? '—' : `${vendedorData.tasaConversion}%`}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500">Proyección de cierre</p>
              <p
                className={`text-lg font-bold ${
                  vendedorData.proyeccionCierre === null
                    ? 'text-slate-900'
                    : vendedorData.proyeccionCierre >= vendedorData.objetivo
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                }`}
              >
                {vendedorData.proyeccionCierre === null ? '—' : formatCurrency(vendedorData.proyeccionCierre)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Users size={18} className="text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Cartera de clientes</p>
                <p className="text-lg font-bold text-slate-900">{filasClientes.length} clientes</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500">Concentración 80/20</p>
              <p className="text-lg font-bold text-slate-900">
                {vendedorData.pareto80Pct === null ? '—' : `${vendedorData.pareto80Count} clientes`}
              </p>
              <p className="text-[11px] text-slate-400">
                {vendedorData.pareto80Pct === null ? 'Sin datos.' : `Representan el 80% de su facturación (${vendedorData.pareto80Pct}% de la cartera)`}
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <TrendingUp size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">
                  En mejora {isAnnual ? '(vs. año anterior)' : '(vs. mes anterior)'}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {clientesEnMejora.length} de {filasClientes.length}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500">Representa en pesos</p>
              <p className={`text-lg font-bold ${incrementoVendedor >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(incrementoVendedor)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500 mb-2">Composición de cartera por ranking (RK)</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">A: {composicionRK.A}</span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">B: {composicionRK.B}</span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-200 text-slate-600">C: {composicionRK.C}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                A = concentra el primer 50% de la facturación de la empresa · B = suma hasta el 80% · C = el 20% restante. Clasificación sobre toda la cartera de la empresa.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500 mb-2">Líneas más compradas por sus clientes</p>
              {lineasTopVendedor.length === 0 ? (
                <p className="text-sm text-slate-400">Sin datos.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {lineasTopVendedor.slice(0, 5).map(([nombre, cant]) => (
                    <span key={nombre} className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                      {nombre} · {cant}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {pendientesVendedor.length > 0 && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                {pendientesVendedor.length} cliente{pendientesVendedor.length > 1 ? 's' : ''} a gestionar hoy
              </p>
              <div className="space-y-1">
                {pendientesVendedor.map(({ cliente, fechaReferencia }) => (
                  <div key={cliente.codigo} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{cliente.razonSocial}</span>
                    <span className={`text-xs font-medium ${fechaReferencia < HOY_DEMO_ISO ? 'text-rose-600' : 'text-amber-600'}`}>
                      {fechaReferencia < HOY_DEMO_ISO ? `Vencida desde el ${fechaCorta(fechaReferencia)}` : 'Hoy'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2 font-medium">Cliente</th>
                  <th className="py-2 font-medium text-center">RK</th>
                  <th className="py-2 font-medium text-center">80/20</th>
                  <th className="py-2 font-medium text-right">Venta actual</th>
                  <th className="py-2 font-medium text-right">{isAnnual ? 'Año anterior' : 'Mes anterior'}</th>
                  <th className="py-2 font-medium text-right">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {filasClientes.map((c, idx) => (
                  <tr
                    key={c.codigo}
                    className={`border-b border-slate-50 last:border-0 ${idx < vendedorData.pareto80Count ? 'bg-indigo-50/40' : ''}`}
                  >
                    <td className="py-2 text-slate-700">{c.razonSocial}</td>
                    <td className="py-2 text-center">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          c.tier === 'A'
                            ? 'bg-emerald-100 text-emerald-700'
                            : c.tier === 'B'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      {idx < vendedorData.pareto80Count && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">★</span>
                      )}
                    </td>
                    <td className="py-2 text-right text-slate-600">{formatCurrency(c.actual)}</td>
                    <td className="py-2 text-right text-slate-500">{formatCurrency(c.anterior)}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          c.mejora ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {c.mejora ? 'Mejora' : 'Baja'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
