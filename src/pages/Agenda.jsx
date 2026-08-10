import { useMemo, useState } from 'react'
import { Phone, MapPin, Video, Plus, X, AlertTriangle, CalendarClock, Link as LinkIcon } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { GestionFormModal } from '../components/agenda/GestionFormModal'
import { usePeriod } from '../context/PeriodContext'
import { useAuth } from '../context/AuthContext'
import { useAgenda } from '../context/AgendaContext'
import { vendedores, indexOfFecha, clientesAGestionarHoy, HOY_DEMO_ISO } from '../data/mockData'

const estadoStyles = {
  Realizada: 'bg-emerald-50 text-emerald-700',
  Pendiente: 'bg-amber-50 text-amber-700',
  Reprogramada: 'bg-slate-100 text-slate-600',
}

const iconosPorTipo = { Visita: MapPin, Llamada: Phone, Videollamada: Video }

function fechaLarga(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Agenda() {
  const { user } = useAuth()
  const { selectedIndices, label } = usePeriod()
  const { actividades } = useAgenda()
  const esVendedor = user?.rol === 'vendedor'

  const [filtroVendedor, setFiltroVendedor] = useState(esVendedor ? user.nombre : 'Todos')
  const [formOpen, setFormOpen] = useState(false)
  const [clienteForm, setClienteForm] = useState('')
  const [confirmacion, setConfirmacion] = useState(null)

  const pendientesHoy = useMemo(() => {
    const vendedorFiltro = esVendedor ? user.nombre : filtroVendedor === 'Todos' ? null : filtroVendedor
    return clientesAGestionarHoy(vendedorFiltro)
  }, [actividades, esVendedor, user, filtroVendedor])

  const filtradas = useMemo(() => {
    return actividades
      .filter((a) => selectedIndices.includes(indexOfFecha(a.fecha)))
      .filter((a) => filtroVendedor === 'Todos' || a.vendedor === filtroVendedor)
      .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`))
  }, [actividades, selectedIndices, filtroVendedor])

  const visitasRealizadas = filtradas.filter((a) => a.tipo === 'Visita' && a.estado === 'Realizada').length
  const llamadasRealizadas = filtradas.filter((a) => a.tipo === 'Llamada' && a.estado === 'Realizada').length
  const pendientes = filtradas.filter((a) => a.estado === 'Pendiente' || a.estado === 'Reprogramada').length

  function abrirForm(clienteCodigo = '') {
    setClienteForm(clienteCodigo)
    setFormOpen(true)
  }

  function handleSaved(nueva) {
    if (nueva.enlace) {
      setConfirmacion({ cliente: nueva.cliente, fecha: nueva.fecha, hora: nueva.hora, plataforma: nueva.plataforma, enlace: nueva.enlace })
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Gestiones de: <span className="font-medium text-slate-700">{label}</span>
        </p>
        <button
          onClick={() => abrirForm()}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nueva gestión
        </button>
      </div>

      {confirmacion && (
        <Card className="p-4 md:p-5 border-indigo-200 bg-indigo-50/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Video size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-900">
                  Invitación de {confirmacion.plataforma} agendada con {confirmacion.cliente}
                </p>
                <p className="text-xs text-indigo-700 mt-0.5">
                  {fechaLarga(confirmacion.fecha)} · {confirmacion.hora} hs · <span className="font-mono">{confirmacion.enlace}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Demo: la invitación es simulada. En producción esto crea la reunión real vía la API de {confirmacion.plataforma} y le llega al cliente por email/calendario.
                </p>
              </div>
            </div>
            <button onClick={() => setConfirmacion(null)} className="text-indigo-400 hover:text-indigo-700 shrink-0">
              <X size={18} />
            </button>
          </div>
        </Card>
      )}

      {pendientesHoy.length > 0 && (
        <Card className="p-4 md:p-5 border-amber-200 bg-amber-50/60">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              {pendientesHoy.length} cliente{pendientesHoy.length > 1 ? 's' : ''} a gestionar hoy
            </p>
          </div>
          <div className="space-y-2">
            {pendientesHoy.map(({ cliente, motivo, ultima, fechaReferencia }) => {
              const vencida = fechaReferencia < HOY_DEMO_ISO
              return (
                <button
                  key={cliente.codigo}
                  onClick={() => abrirForm(cliente.codigo)}
                  className="w-full flex items-center justify-between gap-3 bg-white rounded-lg border border-amber-100 px-3 py-2.5 text-left hover:border-amber-300 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800 truncate">{cliente.razonSocial}</p>
                      {!esVendedor && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {cliente.vendedorAsignado}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {motivo === 'programada'
                        ? `${ultima.tipo} agendada para el ${fechaLarga(ultima.fecha)}`
                        : `Seguimiento de "${ultima.tipo.toLowerCase()}" del ${fechaLarga(ultima.fecha)}, previsto para el ${fechaLarga(fechaReferencia)}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      vencida ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {vencida ? 'Vencida' : 'Hoy'}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Visitas realizadas</p>
          <p className="text-xl font-bold text-slate-900">{visitasRealizadas}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Llamadas realizadas</p>
          <p className="text-xl font-bold text-slate-900">{llamadasRealizadas}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Pendientes</p>
          <p className="text-xl font-bold text-amber-600">{pendientes}</p>
        </Card>
      </div>

      {!esVendedor && (
        <Card className="p-4 flex flex-wrap items-center gap-3">
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
          <span className="text-xs text-slate-400 ml-auto">{filtradas.length} gestiones</span>
        </Card>
      )}

      <div className="space-y-2.5">
        {filtradas.length === 0 && (
          <Card className="p-8 text-center text-slate-400 text-sm">No hay gestiones registradas en este período.</Card>
        )}
        {filtradas.map((a) => {
          const Icon = iconosPorTipo[a.tipo] ?? Phone
          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
                    a.tipo === 'Visita'
                      ? 'bg-indigo-50 text-indigo-600'
                      : a.tipo === 'Videollamada'
                        ? 'bg-violet-50 text-violet-600'
                        : 'bg-sky-50 text-sky-600'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-800">{a.cliente}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoStyles[a.estado]}`}>
                      {a.estado}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {a.tipo === 'Videollamada' ? `Videollamada (${a.plataforma})` : a.tipo} · {a.vendedor} · {fechaLarga(a.fecha)} · {a.hora} hs
                  </p>
                  {a.notas && <p className="text-sm text-slate-600 mt-1.5">{a.notas}</p>}
                  {a.enlace && (
                    <p className="text-xs text-violet-600 mt-1.5 flex items-center gap-1 truncate">
                      <LinkIcon size={12} className="shrink-0" />
                      <span className="truncate font-mono">{a.enlace}</span>
                    </p>
                  )}
                  {a.proximaGestion && (
                    <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                      <CalendarClock size={12} />
                      Próxima gestión: {fechaLarga(a.proximaGestion)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <GestionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaultClienteCodigo={clienteForm}
        defaultFecha={HOY_DEMO_ISO}
        esVendedor={esVendedor}
        nombreVendedor={user?.nombre}
        onSaved={handleSaved}
      />
    </div>
  )
}
