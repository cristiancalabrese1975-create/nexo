import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Flame, Clock } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import { scoreOportunidad } from '../../data/mockData'

function estiloPrioridad(score) {
  if (score >= 70) return 'bg-emerald-50 text-emerald-700'
  if (score >= 40) return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

function fechaCorta(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export function OpportunityCard({ op, umbral }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: op.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  const iniciales = op.vendedor
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const prioridad = scoreOportunidad(op)
  const vencido = prioridad && umbral != null && (prioridad.diasSinContacto === null || prioridad.diasSinContacto > umbral)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 cursor-grab active:cursor-grabbing touch-none hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-slate-800">{op.titulo}</p>
        {prioridad && (
          <span
            className={`shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${estiloPrioridad(prioridad.score)}`}
            title={
              prioridad.diasSinContacto === null
                ? 'Sin gestiones registradas con este cliente'
                : `Último contacto hace ${prioridad.diasSinContacto} día(s)`
            }
          >
            {prioridad.score >= 70 && <Flame size={10} />}
            {prioridad.score}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-1.5 truncate">{op.cliente}</p>

      {prioridad && (
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <span className={`inline-flex items-center gap-1 text-[10.5px] truncate ${vencido ? 'text-rose-600 font-medium' : 'text-slate-400'}`}>
            <Clock size={10} className="shrink-0" />
            {prioridad.ultimaGestionFecha
              ? `${fechaCorta(prioridad.ultimaGestionFecha)} · ${prioridad.diasSinContacto} d`
              : 'Sin gestiones'}
          </span>
          {vencido && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
              SIN CONTACTO VENCIDO
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-indigo-600">{formatCurrency(op.valor)}</span>
        <div
          className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-semibold"
          title={op.vendedor}
        >
          {iniciales}
        </div>
      </div>
    </div>
  )
}
