import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Card } from '../components/ui/Card'
import { StatusDot } from '../components/ui/StatusDot'
import { usePeriod } from '../context/PeriodContext'
import { useValueMode } from '../context/ValueModeContext'
import {
  resumenPorPeriodo,
  unidadesPorPeriodo,
  lineas,
  valorLinea,
  objetivoLineaRango,
  ventaResumenRango,
  unidadesResumenRango,
  inflacionAcumulada,
  HOY_DEMO_ISO,
} from '../data/mockData'
import { diasHabilesInfo, diasEnMes } from '../data/periods'
import { formatCurrency, formatPercent, formatValor } from '../utils/format'
import { TrendingDown, TrendingUp } from 'lucide-react'

function KpiCard({ label, value, tone = 'default', hint }) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600'
      : tone === 'danger'
        ? 'text-rose-600'
        : 'text-slate-900'
  return (
    <Card className="p-4 md:p-5">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-xl md:text-2xl font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </Card>
  )
}

export default function Dashboard() {
  const { year, month, selectedIndices, primaryIndex, comparisonIndices, yoyIndices, isAnnual, isSingleMonth, label } = usePeriod()
  const { modo } = useValueMode()

  const venta = ventaResumenRango(selectedIndices)
  const ventaMostrada = modo === 'unidades' ? unidadesResumenRango(selectedIndices) : venta

  const objetivo = selectedIndices.reduce((acc, i) => acc + (resumenPorPeriodo[i]?.objetivo ?? 0), 0)
  // El objetivo sólo existe cargado en pesos; para mostrarlo en unidades lo
  // convertimos línea por línea usando el precio promedio de cada una (es un
  // equivalente calculado, no un dato cargado directamente en unidades).
  const objetivoUnidades = lineas.reduce(
    (acc, l) => acc + Math.round(objetivoLineaRango(l.id, selectedIndices) / (l.precioPromedio || 1)),
    0,
  )
  const objetivoMostrado = modo === 'unidades' ? objetivoUnidades : objetivo
  const avance = objetivoMostrado > 0 ? Math.round((ventaMostrada / objetivoMostrado) * 100) : null

  const habiles = isSingleMonth ? diasHabilesInfo(year, month, HOY_DEMO_ISO) : null

  // Fecha "de hoy" de la demo y días de calendario que faltan para el
  // cierre del mes en curso — independiente del período que se esté
  // filtrando arriba, siempre relativo a la fecha actual real.
  const hoyDate = new Date(`${HOY_DEMO_ISO}T00:00:00`)
  const hoyFormateada = hoyDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const diasRestantesMesActual = diasEnMes(hoyDate.getFullYear(), hoyDate.getMonth() + 1) - hoyDate.getDate()

  const proyeccionValor = isAnnual
    ? Math.round(ventaMostrada / selectedIndices.length)
    : habiles
      ? Math.round((ventaMostrada - objetivoMostrado) / (habiles.restantes > 0 ? habiles.restantes : habiles.totalHabiles))
      : 0
  const proyeccionLabel = isAnnual ? 'Promedio mensual' : 'Venta diaria proyectada'

  // Proyección de cierre: extrapola el ritmo de venta actual (venta / días
  // hábiles ya transcurridos) a los días hábiles totales del mes.
  const proyeccionCierre =
    habiles && habiles.transcurridos > 0 ? Math.round((ventaMostrada / habiles.transcurridos) * habiles.totalHabiles) : null
  const proyeccionCierrePct =
    proyeccionCierre !== null && objetivoMostrado > 0 ? Math.round((proyeccionCierre / objetivoMostrado) * 100) : null

  const hayYoy = yoyIndices.length === selectedIndices.length
  const ventaYoy = hayYoy ? ventaResumenRango(yoyIndices) : null
  const nominalYoY = hayYoy && ventaYoy > 0 ? ((venta / ventaYoy - 1) * 100) : null
  const inflacionYoY = inflacionAcumulada(primaryIndex - 12, primaryIndex)
  const realYoY =
    nominalYoY !== null && inflacionYoY !== null
      ? ((1 + nominalYoY / 100) / (1 + inflacionYoY / 100) - 1) * 100
      : null

  // Inflación acumulada y crecimiento de facturación, ambos interanuales
  // (12 meses contra el mismo mes del año anterior) para cada punto del
  // gráfico. Siempre en pesos, aunque las barras estén en unidades: la
  // inflación sólo tiene sentido contra un valor monetario.
  const dataAnio = resumenPorPeriodo
    .map((p, i) => {
      const ventaAnterior = resumenPorPeriodo[i - 12]?.venta ?? null
      const crecimientoInteranual =
        ventaAnterior && ventaAnterior > 0 ? Math.round(((p.venta / ventaAnterior) - 1) * 1000) / 10 : null
      const inflacionInteranual = i - 12 >= 0 ? Math.round((inflacionAcumulada(i - 12, i) ?? 0) * 10) / 10 : null
      return {
        ...p,
        globalIndex: i,
        unidades: unidadesPorPeriodo[i]?.unidades ?? 0,
        crecimientoInteranual,
        inflacionInteranual,
      }
    })
    .filter((p) => p.year === year)
  const barKey = modo === 'unidades' ? 'unidades' : 'venta'
  const barName = modo === 'unidades' ? 'Unidades' : 'Venta $'

  return (
    <div className="space-y-4 md:space-y-6">
      <p className="text-sm text-slate-500">
        Hoy es {hoyFormateada} ·{' '}
        <span className="font-medium text-slate-700">
          {diasRestantesMesActual === 0 ? 'último día del mes' : `${diasRestantesMesActual} días para el cierre del mes`}
        </span>
      </p>
      <p className="text-sm text-slate-500">
        Mostrando: <span className="font-medium text-slate-700">{label}</span>
        {habiles && (
          <span className="text-slate-400">
            {' '}
            · {habiles.transcurridos} de {habiles.totalHabiles} días hábiles transcurridos ·{' '}
            <span className={habiles.restantes === 0 ? 'text-slate-400' : 'font-medium text-slate-600'}>
              {habiles.restantes} restantes hasta el cierre
            </span>
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <KpiCard label="Venta" value={formatValor(ventaMostrada, modo)} />
        <KpiCard
          label="Objetivo"
          value={formatValor(objetivoMostrado, modo)}
          hint={modo === 'unidades' ? 'equivalente, según precio promedio por línea' : undefined}
        />
        <KpiCard
          label="Avance %"
          value={formatPercent(avance ?? 0, { infinite: avance === null })}
          tone={avance !== null && avance >= 100 ? 'success' : avance !== null && avance >= 70 ? 'default' : 'danger'}
        />
        <KpiCard
          label={proyeccionLabel}
          value={formatValor(proyeccionValor, modo)}
          tone={proyeccionValor >= 0 ? 'success' : 'danger'}
        />
        <KpiCard
          label="Proyección de cierre"
          value={proyeccionCierre === null ? '—' : formatValor(proyeccionCierre, modo)}
          tone={proyeccionCierre === null ? 'default' : proyeccionCierre >= objetivoMostrado ? 'success' : 'danger'}
          hint={
            proyeccionCierre === null
              ? 'elegí un solo mes para verla'
              : `${proyeccionCierrePct}% del objetivo al ritmo actual`
          }
        />
      </div>

      <Card className="p-4 md:p-5">
        <p className="text-xs font-medium text-slate-500 mb-2">
          Venta real vs. inflación (interanual) <span className="font-normal text-slate-400">· siempre en pesos</span>
        </p>
        {nominalYoY === null || inflacionYoY === null ? (
          <p className="text-sm text-slate-400">Sin datos suficientes del año anterior para comparar.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <span className="text-xs text-slate-500 block">Variación nominal</span>
              <span className="text-lg font-bold text-slate-800">{nominalYoY >= 0 ? '+' : ''}{nominalYoY.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Inflación estimada</span>
              <span className="text-lg font-bold text-slate-800">{inflacionYoY.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Variación real</span>
              <span className={`text-lg font-bold ${realYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {realYoY >= 0 ? '+' : ''}{realYoY.toFixed(1)}%
              </span>
            </div>
            <span
              className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                realYoY >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {realYoY >= 0 ? 'Por encima de la inflación' : 'Por debajo de la inflación'}
            </span>
          </div>
        )}
      </Card>

      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">{modo === 'unidades' ? 'Unidades vendidas' : 'Ventas $'} · {year}</h2>
        </div>
        <div className="h-64 md:h-80 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dataAnio} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][m - 1]}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (modo === 'unidades' ? formatValor(v, 'unidades') : `${(v / 1_000_000).toFixed(0)}M`)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (value === null) return ['Sin datos', name]
                  if (['Avance %', 'Inflación interanual', 'Crecimiento facturación interanual'].includes(name)) {
                    return [`${value}%`, name]
                  }
                  return [formatValor(value, modo), name]
                }}
                labelFormatter={(m) =>
                  ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][m - 1]
                }
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey={barKey} name={barName} radius={[4, 4, 0, 0]} maxBarSize={36}>
                {dataAnio.map((p) => (
                  <Cell key={p.key} fill={selectedIndices.includes(p.globalIndex) ? '#4338ca' : '#4f46e5'} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="avance" name="Avance %" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="inflacionInteranual"
                name="Inflación interanual"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 2 }}
                connectNulls
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="crecimientoInteranual"
                name="Crecimiento facturación interanual"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 md:p-6 pb-2">
          <h2 className="text-sm font-semibold text-slate-700">Avance por línea</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-y border-slate-100 bg-slate-50">
                <th className="px-4 md:px-6 py-2.5 font-medium">Línea</th>
                <th className="px-4 py-2.5 font-medium text-right">Venta</th>
                <th className="px-4 py-2.5 font-medium text-right">Objetivo</th>
                <th className="px-4 py-2.5 font-medium text-right">Evolución</th>
                <th className="px-4 md:px-6 py-2.5 font-medium text-right">Avance</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => {
                const ventaLinea = valorLinea(l.id, selectedIndices, modo)
                const objetivoLineaPesos = objetivoLineaRango(l.id, selectedIndices)
                const objetivoLinea = modo === 'unidades' ? Math.round(objetivoLineaPesos / (l.precioPromedio || 1)) : objetivoLineaPesos
                const pct = objetivoLinea === 0 ? null : Math.round((ventaLinea / objetivoLinea) * 100)
                const ventaLineaAnterior = comparisonIndices.length ? valorLinea(l.id, comparisonIndices, modo) : 0
                const mejora = ventaLinea > ventaLineaAnterior
                const evolucionPct =
                  ventaLineaAnterior > 0 ? Math.round((ventaLinea / ventaLineaAnterior - 1) * 100) : ventaLinea > 0 ? 100 : 0
                return (
                  <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 md:px-6 py-2.5 whitespace-nowrap">
                      <div className="font-medium text-slate-700">{l.nombre}</div>
                      <div className="text-xs text-slate-400">{l.direccion}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatValor(ventaLinea, modo)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatValor(objetivoLinea, modo)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mejora ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {evolucionPct >= 0 ? '▲' : '▼'} {Math.abs(evolucionPct)}%
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        {pct !== null && pct >= 100 ? (
                          <TrendingUp size={14} className="text-emerald-500" />
                        ) : (
                          <TrendingDown size={14} className="text-rose-500" />
                        )}
                        <span className="font-medium text-slate-700">
                          {pct === null ? 'Infinito' : `${pct}%`}
                        </span>
                        <StatusDot pct={pct ?? 100} infinite={pct === null} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
