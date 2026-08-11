import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronDown, ChevronUp, TrendingDown, Wallet, Clock, Tag, MessageCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { usePeriod } from '../context/PeriodContext'
import { useAuth } from '../context/AuthContext'
import { useFaro } from '../api/faro'
import { PERIODS } from '../data/periods'
import { formatCurrency } from '../utils/format'

function severidad(score) {
  if (score >= 60) return 'alta'
  if (score >= 30) return 'media'
  return 'baja'
}

const severidadEstilos = {
  alta: { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700', ring: 'ring-rose-300', label: 'Prioridad alta' },
  media: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700', ring: 'ring-amber-300', label: 'Prioridad media' },
  baja: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-300', label: 'Bajo riesgo' },
}

function razonesDe(f, isAnnual) {
  const razones = []
  if (f.venta === 0) razones.push('Sin compras este período')
  else if (f.evolucionPct < 0) razones.push(`Cayó ${Math.abs(f.evolucionPct)}% vs. ${isAnnual ? 'año anterior' : 'mes anterior'}`)
  if (f.mora.saldoTotal > 0) razones.push(`Mora: ${formatCurrency(f.mora.saldoTotal)} (${f.mora.diasMax} días)`)
  if (f.diasSinContacto === null) razones.push('Sin gestión registrada')
  else if (f.diasSinContacto > 30) razones.push(`${f.diasSinContacto} días sin contacto`)
  return razones
}

function whatsappUrl(nombreVendedor, whatsappPorNombre, mensaje) {
  const numero = whatsappPorNombre[nombreVendedor]
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

// Informe de texto con las cuentas de prioridad alta/media de un vendedor,
// para mandarle por WhatsApp — wa.me sólo admite texto precargado, no
// adjuntar una captura automáticamente, así que el "informe" es la cuenta
// y su motivo principal en formato de lista.
function construirInformeWhatsApp(vendedor, filasVendedor, isAnnual) {
  const nombre = vendedor.split(' ')[0]
  const prioritarias = filasVendedor.filter((f) => f.nivel === 'alta' || f.nivel === 'media')
  if (prioritarias.length === 0) {
    return `Hola ${nombre}! Repasé Faro y hoy no tenés cuentas en prioridad alta ni media. 🎉`
  }
  const lineas = prioritarias.map((f) => {
    const emoji = f.nivel === 'alta' ? '🔴' : '🟠'
    const motivo = razonesDe(f, isAnnual)[0] ?? 'revisar cuenta'
    return `${emoji} ${f.razonSocial} — ${motivo}`
  })
  return `Hola ${nombre}! Este es tu resumen de Faro de hoy (${lineas.length} cuenta${lineas.length === 1 ? '' : 's'} a priorizar):\n\n${lineas.join('\n')}`
}

export default function Faro() {
  const { selectedIndices, comparisonIndices, isAnnual, label } = usePeriod()
  const { user } = useAuth()
  const esGerente = user?.rol === 'gerente'

  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(esGerente ? 'Todos' : user?.nombre)
  const [severidadFiltro, setSeveridadFiltro] = useState(null) // 'alta' | 'media' | 'baja' | null
  const [expandido, setExpandido] = useState(null)

  const periodos = useMemo(() => selectedIndices.map((i) => PERIODS[i]?.key).filter(Boolean), [selectedIndices])
  const comparar = useMemo(() => comparisonIndices.map((i) => PERIODS[i]?.key).filter(Boolean), [comparisonIndices])
  const { data, isLoading } = useFaro({ periodos, comparar, modo: 'pesos' })

  function toggleSeveridad(s) {
    setSeveridadFiltro((prev) => (prev === s ? null : s))
  }

  const items = data?.items ?? []
  const vendedoresWhatsapp = data?.vendedoresWhatsapp ?? []
  const whatsappPorNombre = Object.fromEntries(vendedoresWhatsapp.map((v) => [v.nombre, v.whatsapp]))
  const vendedores = vendedoresWhatsapp.map((v) => v.nombre)

  const clientesDelAlcance = vendedorSeleccionado === 'Todos' ? items : items.filter((c) => c.vendedorNombre === vendedorSeleccionado)

  const filas = clientesDelAlcance.map((f) => ({ ...f, nivel: severidad(f.score) })).sort((a, b) => b.score - a.score)

  const composicion = { alta: 0, media: 0, baja: 0 }
  filas.forEach((f) => {
    composicion[f.nivel] += 1
  })
  const dataSeveridad = [
    { name: 'alta', label: 'Prioridad alta', value: composicion.alta, fill: '#f43f5e' },
    { name: 'media', label: 'Prioridad media', value: composicion.media, fill: '#f59e0b' },
    { name: 'baja', label: 'Bajo riesgo', value: composicion.baja, fill: '#10b981' },
  ]

  const filasVisibles = severidadFiltro ? filas.filter((f) => f.nivel === severidadFiltro) : filas

  if (isLoading || !data) {
    return <p className="text-sm text-slate-400">Cargando Faro…</p>
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Faro</h1>
        <p className="text-sm text-slate-500">
          Las cuentas que más necesitan gestión hoy, ordenadas por prioridad · {label}
        </p>
      </div>

      {esGerente && (
        <Card className="p-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-500 font-medium">Vendedor</label>
          <select
            value={vendedorSeleccionado}
            onChange={(e) => setVendedorSeleccionado(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Todos">Todos</option>
            {vendedores.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Card>
      )}

      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Composición de la cartera por prioridad {vendedorSeleccionado !== 'Todos' ? `· ${vendedorSeleccionado}` : ''}
          </h2>
          {severidadFiltro && (
            <button
              onClick={() => setSeveridadFiltro(null)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Mostrando sólo {severidadEstilos[severidadFiltro].label.toLowerCase()}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Combina caída de venta vs. {isAnnual ? 'año anterior' : 'mes anterior'}, mora vencida y días sin contacto · tildá para filtrar la lista.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
          <div className="h-44 w-full sm:w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataSeveridad}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  onClick={(d) => toggleSeveridad(d.name)}
                  cursor="pointer"
                >
                  {dataSeveridad.map((d) => (
                    <Cell key={d.name} fill={d.fill} opacity={severidadFiltro && severidadFiltro !== d.name ? 0.35 : 1} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, _n, entry) => [`${v} clientes`, entry.payload.label]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {dataSeveridad.map((d) => (
              <button
                key={d.name}
                onClick={() => toggleSeveridad(d.name)}
                className={`w-full flex items-center gap-2 text-sm text-left rounded-lg px-2 py-1.5 transition-colors ${
                  severidadFiltro === d.name ? `bg-slate-50 ring-1 ${severidadEstilos[d.name].ring}` : 'hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                <span className="font-semibold text-slate-700">{d.label}</span>
                <span className="text-slate-500">
                  {d.value} cliente{d.value === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Cuentas a gestionar</h2>
          {esGerente &&
            vendedorSeleccionado !== 'Todos' &&
            (() => {
              const mensaje = construirInformeWhatsApp(vendedorSeleccionado, filas, isAnnual)
              const url = whatsappUrl(vendedorSeleccionado, whatsappPorNombre, mensaje)
              return (
                url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                  >
                    <MessageCircle size={14} />
                    Enviar informe por WhatsApp
                  </a>
                )
              )
            })()}
        </div>
        <p className="text-xs text-slate-400 mb-3">Ordenadas de mayor a menor prioridad · {filasVisibles.length} cliente{filasVisibles.length === 1 ? '' : 's'}</p>

        {filasVisibles.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No hay cuentas en esta categoría.</p>
        ) : (
          <div className="space-y-2">
            {filasVisibles.map((f) => {
              const estilo = severidadEstilos[f.nivel]
              const abierto = expandido === f.codigo
              const razones = razonesDe(f, isAnnual)

              return (
                <div key={f.codigo} className="rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <button onClick={() => setExpandido(abierto ? null : f.codigo)} className="w-full text-left p-3.5 flex items-start gap-3">
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${estilo.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-800 truncate">{f.razonSocial}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${estilo.badge}`}>{f.score}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                        <span>
                          {f.codigo} {vendedorSeleccionado === 'Todos' ? ` · ${f.vendedorNombre}` : ''}
                        </span>
                        {vendedorSeleccionado === 'Todos' &&
                          (() => {
                            const mensaje = `Hola ${f.vendedorNombre.split(' ')[0]}! Vi en Faro que ${f.razonSocial} necesita atención${
                              razones[0] ? ` (${razones[0]})` : ''
                            } — ¿le diste una vuelta?`
                            const url = whatsappUrl(f.vendedorNombre, whatsappPorNombre, mensaje)
                            return (
                              url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-emerald-500 hover:text-emerald-700 shrink-0"
                                  title={`Escribirle por WhatsApp a ${f.vendedorNombre}`}
                                >
                                  <MessageCircle size={13} />
                                </a>
                              )
                            )
                          })()}
                      </p>
                      {razones.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {razones.map((r) => (
                            <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-600">
                              {r}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Sin alertas</span>
                      )}
                    </div>
                    {abierto ? <ChevronUp size={16} className="text-slate-400 shrink-0 mt-1" /> : <ChevronDown size={16} className="text-slate-400 shrink-0 mt-1" />}
                  </button>

                  {abierto && (
                    <div className="px-3.5 pb-3.5 pt-0 border-t border-slate-100 mt-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                        <div className="p-2.5 rounded-lg bg-slate-50">
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                            <TrendingDown size={12} /> Venta del período
                          </p>
                          <p className="text-sm font-semibold text-slate-700">{formatCurrency(f.venta)}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50">
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                            <Wallet size={12} /> Mora
                          </p>
                          <p className="text-sm font-semibold text-slate-700">
                            {f.mora.saldoTotal > 0 ? formatCurrency(f.mora.saldoTotal) : 'Sin deuda'}
                          </p>
                          <p className="text-[11px] text-slate-400">{f.mora.cantidad > 0 ? `${f.mora.cantidad} comprobante(s) · ${f.mora.diasMax} días` : '—'}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50">
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                            <Clock size={12} /> Último contacto
                          </p>
                          <p className="text-sm font-semibold text-slate-700">{f.diasSinContacto === null ? 'Nunca' : `Hace ${f.diasSinContacto} días`}</p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50">
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1.5">
                          <Tag size={12} /> Líneas habituales{f.venta === 0 ? ' · sin actividad este período' : ''}
                        </p>
                        {f.lineasHabituales.length === 0 ? (
                          <p className="text-xs text-slate-400">Sin datos.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {f.lineasHabituales.map((l) => (
                              <span key={l} className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                                {l}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50">
                        <p className="text-[11px] text-slate-400 mb-1">Condición comercial</p>
                        {f.descuentoVigente ? (
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold text-indigo-700">{f.descuentoVigente.descuento.toFixed(2)}%</span> de descuento sobre{' '}
                            {f.descuentoVigente.linea} · vigente desde {f.descuentoVigente.vigenteDesde}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">Sin descuento pactado, lista de precios estándar.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
