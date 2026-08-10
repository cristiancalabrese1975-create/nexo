import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency } from '../../utils/format'

export function TrendCell({ current, previous }) {
  if (current === 0 && previous === 0) {
    return <span className="text-slate-400">—</span>
  }
  const up = current >= previous
  const Icon = current === previous ? Minus : up ? TrendingUp : TrendingDown
  const color = current === previous ? 'text-slate-400' : up ? 'text-emerald-500' : 'text-rose-500'
  return (
    <span className="inline-flex items-center gap-1.5 justify-end w-full">
      <Icon size={14} className={color} />
      <span className="font-medium text-slate-700">{formatCurrency(current)}</span>
    </span>
  )
}
