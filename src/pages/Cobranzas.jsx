import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card } from '../components/ui/Card'
import { SortableTh } from '../components/ui/SortableTh'
import { usePeriod } from '../context/PeriodContext'
import { useCobranzas } from '../api/cobranzas'
import { periodKey } from '../data/periods'
import { formatCurrency } from '../utils/format'
import { compareValues, nextSort } from '../utils/sort'

const DIAS_MORA_OPCIONES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]

function Kpi({ label, value, tone = 'default', onClick, active }) {
  const toneClass = tone === 'danger' ? 'text-rose-600' : tone === 'success' ? 'text-emerald-600' : 'text-slate-900'
  return (
    <Card
      className={`p-4 md:p-5 ${onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''} ${active ? 'ring-2 ring-indigo-500' : ''}`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="w-full text-left disabled:cursor-default"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
          {onClick && (active ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)}
        </div>
        <p className={`text-xl md:text-2xl font-bold ${toneClass}`}>{value}</p>
      </button>
    </Card>
  )
}

export default function Cobranzas() {
  const [cliente, setCliente] = useState('Todos')
  const [diasMora, setDiasMora] = useState(30)
  const [mostrarDetalleMora, setMostrarDetalleMora] = useState(false)
  const [sortMora, setSortMora] = useState({ key: 'saldo', dir: 'desc' })
  const [sort, setSort] = useState({ key: null, dir: 'desc' })
  const { year, selectedMonths, label } = usePeriod()

  const periodos = useMemo(() => selectedMonths.map((m) => periodKey(year, m)), [year, selectedMonths])
  const { data, isLoading } = useCobranzas({ periodos, umbralDias: diasMora })

  const comprobantes = data?.comprobantes ?? []
  const clientesEnMora = data?.clientesEnMora ?? []
  const clientesUnicos = useMemo(() => ['Todos', ...new Set(comprobantes.map((c) => c.clienteNombre))], [comprobantes])

  const filtrados = useMemo(
    () => (cliente === 'Todos' ? comprobantes : comprobantes.filter((c) => c.clienteNombre === cliente)),
    [comprobantes, cliente],
  )

  const filtradosOrdenados = useMemo(() => {
    if (!sort.key) return filtrados
    const valor = (c) => {
      if (sort.key === 'cliente') return c.clienteNombre
      if (sort.key === 'fecha') return c.fechaEmision
      if (sort.key === 'dias') return c.dias
      if (sort.key === 'importe') return Number(c.importe)
      return Number(c.saldo)
    }
    return [...filtrados].sort((a, b) => compareValues(valor(a), valor(b), sort.dir))
  }, [filtrados, sort])

  const saldoTotal = filtrados.reduce((acc, c) => acc + Number(c.saldo), 0)
  const vencido = filtrados.reduce((acc, c) => acc + (c.vencidoDinamico ? Number(c.saldo) : 0), 0)
  const pctVencido = saldoTotal > 0 ? (vencido / saldoTotal) * 100 : 0

  const clientesEnMoraOrdenados = useMemo(() => {
    const valor = (c, key) => (key === 'cliente' ? c.cliente : key === 'diasMax' ? c.diasMax : key === 'comprobantes' ? c.comprobantes : c.saldo)
    return [...clientesEnMora].sort((a, b) => compareValues(valor(a, sortMora.key), valor(b, sortMora.key), sortMora.dir))
  }, [clientesEnMora, sortMora])

  const montoEnMora = data?.montoEnMora ?? 0
  const top5Mora = [...clientesEnMora].sort((a, b) => b.saldo - a.saldo).slice(0, 5)

  if (isLoading || !data) {
    return <p className="text-sm text-slate-400">Cargando cobranzas…</p>
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <p className="text-sm text-slate-500">
        Comprobantes de: <span className="font-medium text-slate-700">{label}</span>
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="A cuenta" value={formatCurrency(data.aCuenta)} tone="danger" />
        <Kpi label="Saldo total" value={formatCurrency(saldoTotal)} />
        <Kpi label={`Vencido (+${diasMora} días)`} value={formatCurrency(vencido)} tone="danger" />
        <Kpi label="% Vencido" value={`${pctVencido.toFixed(1)}%`} tone="danger" />
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <p className="text-sm font-semibold text-slate-700">Análisis de mora</p>
          <span className="text-xs text-slate-400">sobre el saldo total pendiente, al {data.hoy}</span>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-slate-500 font-medium">Más de</label>
            <select
              value={diasMora}
              onChange={(e) => setDiasMora(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DIAS_MORA_OPCIONES.map((d) => (
                <option key={d} value={d}>
                  {d} días
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Kpi
            label={`Clientes en mora (+${diasMora} días)`}
            value={`${clientesEnMora.length}`}
            tone={clientesEnMora.length > 0 ? 'danger' : 'success'}
            onClick={() => setMostrarDetalleMora((v) => !v)}
            active={mostrarDetalleMora}
          />
          <Kpi label="Monto en mora" value={formatCurrency(montoEnMora)} tone={montoEnMora > 0 ? 'danger' : 'success'} />
        </div>

        {mostrarDetalleMora && (
          <div className="mt-4 overflow-x-auto border-t border-slate-100 pt-4">
            {clientesEnMora.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Ningún cliente supera los {diasMora} días de mora.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <SortableTh label="Cliente" sortKey="cliente" sort={sortMora} onSort={(k) => setSortMora((s) => nextSort(s, k, 'asc'))} className="py-2" />
                    <SortableTh label="Días de atraso (máx.)" sortKey="diasMax" sort={sortMora} onSort={(k) => setSortMora((s) => nextSort(s, k))} align="right" className="py-2" />
                    <SortableTh label="Comprobantes" sortKey="comprobantes" sort={sortMora} onSort={(k) => setSortMora((s) => nextSort(s, k))} align="right" className="py-2" />
                    <SortableTh label="Saldo en mora" sortKey="saldo" sort={sortMora} onSort={(k) => setSortMora((s) => nextSort(s, k))} align="right" className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {clientesEnMoraOrdenados.map((c) => (
                    <tr key={c.clienteId} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 text-slate-800 font-medium">{c.cliente}</td>
                      <td className="py-2 text-right">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                          {c.diasMax} días
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-600">{c.comprobantes}</td>
                      <td className="py-2 text-right font-medium text-rose-600">{formatCurrency(c.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold text-slate-800">
                    <td className="py-2">Total</td>
                    <td className="py-2" />
                    <td className="py-2 text-right">{clientesEnMora.reduce((acc, c) => acc + c.comprobantes, 0)}</td>
                    <td className="py-2 text-right">{formatCurrency(montoEnMora)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </Card>

      {top5Mora.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Top 5 clientes en mora</h2>
          <p className="text-xs text-slate-400 mb-3">Los que más plata adeudan (+{diasMora} días) · saldo y días de atraso</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5Mora} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="cliente" width={130} tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value, _name, entry) => [formatCurrency(value), `${entry.payload.diasMax} días de atraso`]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                  />
                  <Bar dataKey="saldo" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {top5Mora.map((c) => (
                      <Cell key={c.clienteId} fill="#f43f5e" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {top5Mora.map((c, idx) => (
                <div key={c.clienteId} className="flex items-center gap-3 bg-rose-50/60 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-rose-400 w-4 shrink-0">{idx + 1}</span>
                  <span className="text-sm text-slate-700 flex-1 truncate">{c.cliente}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 shrink-0">{c.diasMax} días</span>
                  <span className="text-sm font-medium text-rose-600 shrink-0">{formatCurrency(c.saldo)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-500 font-medium">Razón social</label>
        <select
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px]"
        >
          {clientesUnicos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtrados.length} comprobantes</span>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                <SortableTh label="Cliente" sortKey="cliente" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k, 'asc'))} className="px-4 md:px-6 py-2.5" />
                <th className="px-4 py-2.5 font-medium">N° comprobante</th>
                <SortableTh label="Fecha" sortKey="fecha" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k, 'asc'))} className="px-4 py-2.5" />
                <SortableTh label="Días" sortKey="dias" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="Importe" sortKey="importe" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 py-2.5" />
                <SortableTh label="Saldo" sortKey="saldo" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} align="right" className="px-4 md:px-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtradosOrdenados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 md:px-6 py-8 text-center text-slate-400">
                    No hay comprobantes en el período seleccionado.
                  </td>
                </tr>
              )}
              {filtradosOrdenados.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 ${c.vencidoDinamico ? 'bg-rose-50/60' : ''}`}
                >
                  <td className="px-4 md:px-6 py-2.5 font-medium text-slate-800 whitespace-nowrap">{c.clienteNombre}</td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{c.numero}</td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                    {new Date(`${c.fechaEmision}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{Number(c.saldo) > 0 ? `${c.dias} d` : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(c.importe)}</td>
                  <td className={`px-4 md:px-6 py-2.5 text-right font-medium ${c.vencidoDinamico ? 'text-rose-600' : 'text-slate-700'}`}>
                    {formatCurrency(c.saldo)}
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
