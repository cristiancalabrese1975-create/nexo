export function avanceColor(pct) {
  if (pct >= 100) return 'text-emerald-500 bg-emerald-50'
  if (pct >= 70) return 'text-amber-500 bg-amber-50'
  return 'text-rose-500 bg-rose-50'
}

export function avanceDot(pct) {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-rose-500'
}

export function StatusDot({ pct, infinite = false }) {
  const color = infinite ? 'bg-emerald-500' : avanceDot(pct)
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
}
