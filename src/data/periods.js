// Utilidades de período (año/mes) + generador pseudoaleatorio determinístico
// para los datos de ejemplo. Incluye un año 2024 "sombra" (no seleccionable
// en el filtro) que sólo se usa como base de comparación interanual para 2025.

function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function seedFromString(str) {
  return (hashSeed(str) % 997) / 97
}

export function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Años que el usuario puede elegir en el filtro.
export const YEARS = [2025, 2026]
// Años incluidos en la serie interna — coincide 1:1 con el rango de datos
// reales que carga el seed (server/src/seed/seed-demo.ts): 2025 completo +
// 2026 hasta "hoy". Ya no hay año 2024 "sombra": con datos reales, la
// comparación interanual funciona sola apenas hay 12 meses de historia
// (para 2025 se muestra "sin datos", igual que antes para el primer año).
const ALL_YEARS = [2025, 2026]

function monthsInYear(year) {
  return year === 2026 ? 8 : 12 // "hoy" es agosto de 2026
}

export const PERIODS = ALL_YEARS.flatMap((year) =>
  Array.from({ length: monthsInYear(year) }, (_, i) => {
    const month = i + 1
    return {
      year,
      month,
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `${MONTH_ABBR[month - 1]} ${year}`,
    }
  }),
)

export const CURRENT_PERIOD = PERIODS[PERIODS.length - 1]

const indexByKey = new Map(PERIODS.map((p, i) => [p.key, i]))

export function periodKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function indexOfPeriod(key) {
  return indexByKey.get(key) ?? -1
}

export function monthsForYear(year) {
  return PERIODS.filter((p) => p.year === year)
}

export function previousYearIndex(index) {
  const target = index - 12
  return target >= 0 ? target : null
}

// Etiqueta corta para columnas de tabla, ej. "Ago '26".
export function periodShortLabel(p) {
  return `${MONTH_ABBR[p.month - 1]} '${String(p.year).slice(-2)}`
}

export function diasEnMes(year, month) {
  return new Date(year, month, 0).getDate()
}

export function esHabil(date) {
  const dia = date.getDay()
  return dia !== 0 && dia !== 6
}

// Índice (posición en PERIODS) del mes al que pertenece una fecha 'YYYY-MM-DD'.
export function indexOfFecha(fechaISO) {
  const [y, m] = fechaISO.split('-')
  return indexOfPeriod(`${y}-${m}`)
}

// Días hábiles (lunes a viernes) transcurridos y restantes de un mes,
// tomando `hoyISO` ('YYYY-MM-DD') como fecha de referencia.
export function diasHabilesInfo(year, month, hoyISO) {
  const totalDias = diasEnMes(year, month)
  let totalHabiles = 0
  let transcurridos = 0
  for (let d = 1; d <= totalDias; d++) {
    const fecha = new Date(year, month - 1, d)
    if (!esHabil(fecha)) continue
    totalHabiles++
    const fechaISO = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (fechaISO <= hoyISO) transcurridos++
  }
  return { totalHabiles, transcurridos, restantes: totalHabiles - transcurridos }
}
