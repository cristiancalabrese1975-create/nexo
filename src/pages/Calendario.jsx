import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Phone, MapPin, Video, Link as LinkIcon, CalendarClock, Users, AlertTriangle, PhoneCall } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { GestionFormModal } from '../components/agenda/GestionFormModal'
import { useAuth } from '../context/AuthContext'
import { useAgenda } from '../context/AgendaContext'
import { vendedores, clientes, comprobantes, diasTranscurridos, HOY_DEMO_ISO } from '../data/mockData'
import { MONTH_ABBR } from '../data/periods'
import { formatCurrency } from '../utils/format'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const HORAS = Array.from({ length: 11 }, (_, i) => i + 8) // 08 a 18 hs
const iconosPorTipo = { Visita: MapPin, Llamada: Phone, Videollamada: Video }

function fechaLarga(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function horaNum(hhmm) {
  return Number(hhmm.split(':')[0])
}

function lunesDe(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`)
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return d
}

function construirSemana(lunes) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes)
    d.setDate(d.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { iso, dayNum: d.getDate(), monthAbbr: MONTH_ABBR[d.getMonth()], nombre: DIAS_SEMANA[i] }
  })
}

export default function Calendario() {
  const { user } = useAuth()
  const { actividades } = useAgenda()
  const esVendedor = user?.rol === 'vendedor'

  const [weekStart, setWeekStart] = useState(() => lunesDe(HOY_DEMO_ISO))
  const [filtroVendedor, setFiltroVendedor] = useState(esVendedor ? user.nombre : 'Todos')
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formDefaults, setFormDefaults] = useState({ fecha: HOY_DEMO_ISO, hora: '09:00', clienteCodigo: '', tipo: undefined, notas: undefined })

  function irSemanaAnterior() {
    setWeekStart((d) => {
      const nd = new Date(d)
      nd.setDate(nd.getDate() - 7)
      return nd
    })
  }
  function irSemanaSiguiente() {
    setWeekStart((d) => {
      const nd = new Date(d)
      nd.setDate(nd.getDate() + 7)
      return nd
    })
  }
  function irHoy() {
    setWeekStart(lunesDe(HOY_DEMO_ISO))
  }

  function abrirNueva(fecha, hora) {
    setFormDefaults({ fecha, hora: `${String(hora).padStart(2, '0')}:00`, clienteCodigo: '', tipo: undefined, notas: undefined })
    setFormOpen(true)
  }

  function abrirReclamo(cuenta) {
    const cliente = clientes.find((c) => c.razonSocial === cuenta.cliente)
    setFormDefaults({
      fecha: HOY_DEMO_ISO,
      hora: '09:00',
      clienteCodigo: cliente?.codigo ?? '',
      tipo: 'Llamada',
      notas: `Reclamar pago de ${formatCurrency(cuenta.saldo)} vencido hace ${cuenta.dias} días (comprobante ${cuenta.comprobante}).`,
    })
    setFormOpen(true)
  }

  const actividadesFiltradas = useMemo(
    () => actividades.filter((a) => filtroVendedor === 'Todos' || a.vendedor === filtroVendedor),
    [actividades, filtroVendedor],
  )

  const dias = useMemo(() => construirSemana(weekStart), [weekStart])

  const actividadesSemana = useMemo(() => {
    const isos = new Set(dias.map((d) => d.iso))
    return actividadesFiltradas.filter((a) => isos.has(a.fecha))
  }, [actividadesFiltradas, dias])

  const realizadasSemana = actividadesSemana.filter((a) => a.estado === 'Realizada')
  const agendadasSemana = actividadesSemana.filter((a) => a.estado !== 'Realizada')
  const clientesGestionadosSemana = new Set(realizadasSemana.map((a) => a.clienteCodigo)).size

  const rangoLabel = `${dias[0].dayNum} ${dias[0].monthAbbr} – ${dias[6].dayNum} ${dias[6].monthAbbr} ${weekStart.getFullYear()}`

  // Cuentas vencidas: foto de hoy del saldo pendiente con mora, sin depender
  // de la semana que se esté mirando arriba — respeta el filtro de vendedor
  // igual que el resto de la página.
  const cuentasVencidas = useMemo(() => {
    return comprobantes
      .filter((c) => c.vencido && c.saldo > 0)
      .filter((c) => filtroVendedor === 'Todos' || clientes.find((cl) => cl.razonSocial === c.cliente)?.vendedorAsignado === filtroVendedor)
      .map((c) => ({ ...c, dias: diasTranscurridos(c.fecha) }))
      .sort((a, b) => b.saldo - a.saldo)
  }, [filtroVendedor])

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Clientes gestionados</p>
          <p className="text-xl font-bold text-slate-900">{clientesGestionadosSemana}</p>
          <p className="text-[11px] text-slate-400 mt-1">Semana del {rangoLabel}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Gestionado (verde)</p>
          <p className="text-xl font-bold text-emerald-600">{realizadasSemana.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Por vencer (rojo)</p>
          <p className="text-xl font-bold text-rose-600">{agendadasSemana.length}</p>
        </Card>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        {!esVendedor && (
          <>
            <label className="text-sm text-slate-500 font-medium">Vendedor</label>
            <select
              value={filtroVendedor}
              onChange={(e) => setFiltroVendedor(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Todos">Todos</option>
              {vendedores.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={irSemanaAnterior} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-slate-800 text-center whitespace-nowrap">{rangoLabel}</span>
          <button onClick={irSemanaSiguiente} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Semana siguiente">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={irHoy}
            className="ml-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2.5 py-1.5"
          >
            Hoy
          </button>
        </div>
      </Card>

      <Card className="p-3 md:p-4">
        <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-3 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Gestionado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-400" /> Por vencer / pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded border-2 border-indigo-400" /> Hoy (demo)
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="grid grid-cols-[56px_repeat(7,minmax(112px,1fr))] min-w-[850px]">
            <div className="sticky left-0 bg-white z-10" />
            {dias.map((d) => {
              const esHoy = d.iso === HOY_DEMO_ISO
              return (
                <div
                  key={d.iso}
                  className={`text-center py-2 border-b border-slate-100 ${esHoy ? 'bg-indigo-50' : ''}`}
                >
                  <p className={`text-xs font-semibold ${esHoy ? 'text-indigo-700' : 'text-slate-600'}`}>{d.nombre}</p>
                  <p className={`text-[11px] ${esHoy ? 'text-indigo-500' : 'text-slate-400'}`}>
                    {String(d.dayNum).padStart(2, '0')} {d.monthAbbr}
                  </p>
                </div>
              )
            })}

            {HORAS.map((hora) => (
              <div key={hora} className="contents">
                <div className="sticky left-0 bg-white z-10 text-[11px] text-slate-400 text-right pr-2 pt-1 border-t border-slate-50">
                  {String(hora).padStart(2, '0')}:00
                </div>
                {dias.map((d) => {
                  const items = actividadesSemana.filter((a) => a.fecha === d.iso && horaNum(a.hora) === hora)
                  const esHoy = d.iso === HOY_DEMO_ISO
                  return (
                    <div
                      key={d.iso + hora}
                      className={`group relative min-h-[52px] border-t border-l border-slate-50 last:border-r px-1 py-1 ${
                        esHoy ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      {items.map((a) => {
                        const Icon = iconosPorTipo[a.tipo] ?? Phone
                        const gestionado = a.estado === 'Realizada'
                        return (
                          <button
                            key={a.id}
                            onClick={() => setActividadSeleccionada(a)}
                            className={`w-full text-left rounded-md border px-1.5 py-1 mb-1 text-[10px] leading-tight transition-colors ${
                              gestionado
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 border-rose-300 text-rose-800 hover:bg-rose-200'
                            }`}
                          >
                            <span className="flex items-center gap-1 font-semibold truncate">
                              <Icon size={10} className="shrink-0" />
                              <span className="truncate">{a.cliente}</span>
                            </span>
                            <span className="block truncate opacity-80">{a.vendedor}</span>
                          </button>
                        )
                      })}
                      <button
                        onClick={() => abrirNueva(d.iso, hora)}
                        className="opacity-0 group-hover:opacity-100 w-full h-5 flex items-center justify-center text-slate-300 hover:text-indigo-500 transition-opacity"
                        aria-label={`Nueva gestión ${d.iso} ${hora}:00`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {actividadSeleccionada && (
        <Card className="p-4 md:p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">{actividadSeleccionada.cliente}</h2>
              <p className="text-xs text-slate-400">
                {fechaLarga(actividadSeleccionada.fecha)} · {actividadSeleccionada.hora} hs
              </p>
            </div>
            <button onClick={() => setActividadSeleccionada(null)} className="text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                actividadSeleccionada.estado === 'Realizada' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {actividadSeleccionada.estado}
            </span>
            <span className="text-xs text-slate-500">
              {actividadSeleccionada.tipo === 'Videollamada' ? `Videollamada (${actividadSeleccionada.plataforma})` : actividadSeleccionada.tipo} ·{' '}
              {actividadSeleccionada.vendedor}
            </span>
          </div>
          {actividadSeleccionada.notas && <p className="text-sm text-slate-600 mb-1.5">{actividadSeleccionada.notas}</p>}
          {actividadSeleccionada.enlace && (
            <p className="text-xs text-violet-600 mb-1.5 flex items-center gap-1 truncate">
              <LinkIcon size={12} className="shrink-0" />
              <span className="truncate font-mono">{actividadSeleccionada.enlace}</span>
            </p>
          )}
          {actividadSeleccionada.proximaGestion && (
            <p className="text-xs text-indigo-600 flex items-center gap-1">
              <CalendarClock size={12} />
              Próxima gestión: {fechaLarga(actividadSeleccionada.proximaGestion)}
            </p>
          )}
        </Card>
      )}

      {!esVendedor && clientesGestionadosSemana > 0 && (
        <Card className="p-4 md:p-5">
          <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <Users size={13} /> Clientes gestionados esta semana
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(realizadasSemana.map((a) => a.cliente))].map((nombre) => (
              <span key={nombre} className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">
                {nombre}
              </span>
            ))}
          </div>
        </Card>
      )}

      {cuentasVencidas.length > 0 && (
        <Card className="p-4 md:p-5">
          <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Cuentas vencidas
          </p>
          <div className="space-y-1.5">
            {cuentasVencidas.map((c) => (
              <div key={c.comprobante} className="flex items-center gap-3 bg-rose-50/60 rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 truncate">{c.cliente}</p>
                  <p className="text-[11px] text-slate-400">{c.comprobante} · vencido hace {c.dias} días</p>
                </div>
                <span className="text-sm font-medium text-rose-600 shrink-0">{formatCurrency(c.saldo)}</span>
                <button
                  onClick={() => abrirReclamo(c)}
                  className="shrink-0 flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-full px-2 py-1 transition-colors"
                >
                  <PhoneCall size={11} /> Reclamar
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <GestionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaultClienteCodigo={formDefaults.clienteCodigo}
        defaultFecha={formDefaults.fecha}
        defaultHora={formDefaults.hora}
        defaultTipo={formDefaults.tipo}
        defaultNotas={formDefaults.notas}
        esVendedor={esVendedor}
        nombreVendedor={user?.nombre}
      />
    </div>
  )
}
