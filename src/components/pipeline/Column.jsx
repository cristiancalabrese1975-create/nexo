import { useDroppable } from '@dnd-kit/core'
import { OpportunityCard } from './OpportunityCard'
import { formatCurrency } from '../../utils/format'

export function Column({ etapa, oportunidades, umbral }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id })
  const total = oportunidades.reduce((acc, o) => acc + o.valor, 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-2xl border transition-colors ${
        isOver ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-100 border-slate-200'
      }`}
    >
      <div className="p-3 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: etapa.color }} />
          <h3 className="text-sm font-semibold text-slate-700">{etapa.nombre}</h3>
          <span className="ml-auto text-xs font-medium text-slate-400">{oportunidades.length}</span>
        </div>
        <p className="text-xs text-slate-500">{formatCurrency(total)}</p>
      </div>
      <div className="flex-1 px-2 pb-2 space-y-2 min-h-[120px] overflow-y-auto">
        {oportunidades.map((op) => (
          <OpportunityCard key={op.id} op={op} umbral={umbral} />
        ))}
      </div>
    </div>
  )
}
