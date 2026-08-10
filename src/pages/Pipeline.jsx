import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { AlertTriangle } from 'lucide-react'
import { Column } from '../components/pipeline/Column'
import { Card } from '../components/ui/Card'
import { usePeriod } from '../context/PeriodContext'
import { etapasPipeline, oportunidades as initialOportunidades, indexOfFecha, scoreOportunidad } from '../data/mockData'
import { formatCurrency } from '../utils/format'

const UMBRAL_OPCIONES = [5, 10, 15, 20, 30]

export default function Pipeline() {
  const [oportunidades, setOportunidades] = useState(initialOportunidades)
  const [orden, setOrden] = useState('prioridad') // 'prioridad' | 'fecha'
  const [umbral, setUmbral] = useState(15)
  const { selectedIndices, label } = usePeriod()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over) return
    const nuevaEtapa = over.id
    setOportunidades((prev) =>
      prev.map((op) => (op.id === active.id ? { ...op, etapa: nuevaEtapa } : op)),
    )
  }

  const enPeriodo = useMemo(
    () => oportunidades.filter((o) => selectedIndices.includes(indexOfFecha(o.fecha))),
    [oportunidades, selectedIndices],
  )

  const totalPipeline = enPeriodo
    .filter((o) => o.etapa !== 'ganado' && o.etapa !== 'perdido')
    .reduce((acc, o) => acc + o.valor, 0)
  const totalGanado = enPeriodo.filter((o) => o.etapa === 'ganado').reduce((acc, o) => acc + o.valor, 0)

  // Automatización simple: cualquier oportunidad abierta (en cualquier
  // período) cuyo cliente no tiene contacto reciente registrado en la
  // Agenda. Es el equivalente liviano a los "recordatorios de actividad"
  // de un CRM grande, sin necesitar backend ni triggers reales.
  const estancadas = useMemo(() => {
    return oportunidades
      .filter((o) => o.etapa !== 'ganado' && o.etapa !== 'perdido')
      .map((o) => ({ op: o, prioridad: scoreOportunidad(o) }))
      .filter(({ prioridad }) => prioridad && (prioridad.diasSinContacto === null || prioridad.diasSinContacto > umbral))
      .sort((a, b) => (b.prioridad.diasSinContacto ?? 9999) - (a.prioridad.diasSinContacto ?? 9999))
  }, [oportunidades, umbral])

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Oportunidades de: <span className="font-medium text-slate-700">{label}</span>
      </p>

      <Card className="p-4 md:p-5 border-amber-200 bg-amber-50/60">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              {estancadas.length} oportunidad{estancadas.length !== 1 ? 'es' : ''} sin seguimiento reciente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Alertar si no hay contacto hace más de</label>
            <select
              value={umbral}
              onChange={(e) => setUmbral(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {UMBRAL_OPCIONES.map((d) => (
                <option key={d} value={d}>
                  {d} días
                </option>
              ))}
            </select>
          </div>
        </div>
        {estancadas.length === 0 ? (
          <p className="text-sm text-slate-500">Todas las oportunidades abiertas tienen contacto reciente. 👍</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {estancadas.map(({ op, prioridad }) => (
              <div
                key={op.id}
                className="flex items-center justify-between gap-3 bg-white rounded-lg border border-amber-100 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {op.titulo} <span className="text-slate-400 font-normal">· {op.cliente}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(op.valor)} · {op.vendedor}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {prioridad.diasSinContacto === null ? 'Nunca contactado' : `${prioridad.diasSinContacto} días sin contacto`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Oportunidades abiertas</p>
          <p className="text-xl font-bold text-slate-900">
            {enPeriodo.filter((o) => o.etapa !== 'ganado' && o.etapa !== 'perdido').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Valor en pipeline</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(totalPipeline)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Ganado</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalGanado)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Vendedores activos</p>
          <p className="text-xl font-bold text-slate-900">
            {new Set(enPeriodo.map((o) => o.vendedor)).size}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">Arrastrá las tarjetas entre columnas para actualizar la etapa.</p>
        <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setOrden('prioridad')}
            className={`px-2.5 py-1 rounded-md transition-colors ${orden === 'prioridad' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            Ordenar por prioridad
          </button>
          <button
            onClick={() => setOrden('fecha')}
            className={`px-2.5 py-1 rounded-md transition-colors ${orden === 'fecha' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            Ordenar por fecha
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {etapasPipeline.map((etapa) => {
            const opsEtapa = enPeriodo.filter((o) => o.etapa === etapa.id)
            const ordenadas =
              orden === 'prioridad'
                ? [...opsEtapa].sort((a, b) => (scoreOportunidad(b)?.score ?? -1) - (scoreOportunidad(a)?.score ?? -1))
                : [...opsEtapa].sort((a, b) => a.fecha.localeCompare(b.fecha))
            return <Column key={etapa.id} etapa={etapa} oportunidades={ordenadas} umbral={umbral} />
          })}
        </div>
      </DndContext>
    </div>
  )
}
