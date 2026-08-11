import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card } from '../components/ui/Card'
import { SortableTh } from '../components/ui/SortableTh'
import { usePeriod } from '../context/PeriodContext'
import { useDescuentos } from '../api/descuentos'
import { periodKey } from '../data/periods'
import { formatCurrency } from '../utils/format'
import { compareValues, nextSort } from '../utils/sort'

export default function Descuentos() {
  const [linea, setLinea] = useState('Todas')
  const [sort, setSort] = useState({ key: null, dir: 'desc' })
  const { year, selectedMonths, label } = usePeriod()

  const periodos = useMemo(() => selectedMonths.map((m) => periodKey(year, m)), [year, selectedMonths])
  const { data, isLoading } = useDescuentos({ periodos, modo: 'pesos' })
  const vigentes = data?.items ?? []

  const lineasUnicas = useMemo(() => ['Todas', ...new Set(vigentes.map((d) => d.linea).filter(Boolean))], [vigentes])

  const filtrados = useMemo(
    () => (linea === 'Todas' ? vigentes : vigentes.filter((d) => d.linea === linea)),
    [vigentes, linea],
  )

  // Top 5 clientes que más descuento generan: monto aproximado = venta del
  // cliente en el período (ya viene calculada por la API) × su % de
  // descuento vigente sobre la línea que más le compra.
  const top5Descuento = useMemo(() => {
    return vigentes
      .filter((d) => d.descuento > 0)
      .map((d) => ({ ...d, monto: d.venta * (d.descuento / 100) }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5)
  }, [vigentes])

  const filtradosOrdenados = useMemo(() => {
    if (!sort.key) return filtrados
    const valor = (d) => {
      if (sort.key === 'grupo') return d.codigo
      if (sort.key === 'razonSocial') return d.razonSocial
      if (sort.key === 'linea') return d.linea
      return d.descuento
    }
    return [...filtrados].sort((a, b) => compareValues(valor(a), valor(b), sort.dir))
  }, [filtrados, sort])

  if (isLoading || !data) {
    return <p className="text-sm text-slate-400">Cargando descuentos…</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Condiciones vigentes al cierre de: <span className="font-medium text-slate-700">{label}</span>
      </p>

      {top5Descuento.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Top 5 clientes que más descuento generan</h2>
          <p className="text-xs text-slate-400 mb-3">Monto aproximado de descuento sobre su venta del período · {label}</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5Descuento} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="razonSocial" width={130} tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value, _name, entry) => [formatCurrency(value), `${entry.payload.descuento.toFixed(2)}% · ${entry.payload.linea}`]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                  />
                  <Bar dataKey="monto" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {top5Descuento.map((d) => (
                      <Cell key={d.id} fill="#4f46e5" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {top5Descuento.map((d, idx) => (
                <div key={d.id} className="flex items-center gap-3 bg-indigo-50/60 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-indigo-400 w-4 shrink-0">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">{d.razonSocial}</p>
                    <p className="text-[11px] text-slate-400 truncate">{d.linea}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">{d.descuento.toFixed(2)}%</span>
                  <span className="text-sm font-medium text-indigo-600 shrink-0">{formatCurrency(d.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-500 font-medium">Línea</label>
        <select
          value={linea}
          onChange={(e) => setLinea(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {lineasUnicas.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtrados.length} condiciones</span>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                <SortableTh label="GRP emp." sortKey="grupo" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k, 'asc'))} className="px-4 md:px-6 py-2.5" />
                <SortableTh label="Razón social" sortKey="razonSocial" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k, 'asc'))} className="px-4 py-2.5" />
                <SortableTh label="Línea" sortKey="linea" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k, 'asc'))} className="px-4 py-2.5" />
                <SortableTh label="Descuento" sortKey="descuento" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 md:px-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtradosOrdenados.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 md:px-6 py-8 text-center text-slate-400">
                    No hay condiciones vigentes en el período seleccionado.
                  </td>
                </tr>
              )}
              {filtradosOrdenados.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 md:px-6 py-2.5 text-slate-500">{d.codigo}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{d.razonSocial}</td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{d.linea}</td>
                  <td className="px-4 md:px-6 py-2.5 text-right">
                    {d.descuento > 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs">
                        {d.descuento.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-slate-400">0,00%</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
