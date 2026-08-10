export function compareValues(a, b, dir) {
  let cmp
  if (typeof a === 'string' || typeof b === 'string') {
    cmp = String(a ?? '').localeCompare(String(b ?? ''), 'es')
  } else {
    cmp = (a ?? 0) - (b ?? 0)
  }
  return dir === 'asc' ? cmp : -cmp
}

// Alterna asc/desc al re-clickear la misma columna; por defecto arranca en
// descendente (de mayor a menor), que es lo más útil para números de negocio.
export function nextSort(current, key, defaultDir = 'desc') {
  if (current.key !== key) return { key, dir: defaultDir }
  return { key, dir: current.dir === 'desc' ? 'asc' : 'desc' }
}
