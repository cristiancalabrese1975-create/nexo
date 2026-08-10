import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export function SortableTh({ label, sortKey, sort, onSort, align = 'left', className = '' }) {
  const active = sort?.key === sortKey
  const Icon = active ? (sort.dir === 'desc' ? ChevronDown : ChevronUp) : ChevronsUpDown

  return (
    <th className={`font-medium select-none ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-slate-700 transition-colors ${
          active ? 'text-slate-800' : ''
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <Icon size={12} className={active ? 'text-indigo-600' : 'text-slate-300'} />
      </button>
    </th>
  )
}
