export function formatCurrency(value) {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(Math.round(value))
  return `${sign}$${abs.toLocaleString('es-AR')}`
}

export function formatPercent(value, { infinite = false } = {}) {
  if (infinite) return 'Infinito'
  return `${Math.round(value)}%`
}

export function formatNumber(value) {
  return Math.round(value).toLocaleString('es-AR')
}

export function formatUnidades(value) {
  const sign = value < 0 ? '-' : ''
  return `${sign}${formatNumber(Math.abs(value))} u.`
}

export function formatValor(value, modo) {
  return modo === 'unidades' ? formatUnidades(value) : formatCurrency(value)
}
