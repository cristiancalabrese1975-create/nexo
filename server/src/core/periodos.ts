// Utilidades de período/fecha — equivalente en el servidor de
// src/data/periods.js del frontend. Mismo formato de período ('YYYY-MM')
// para que el query param ?periodos= viaje igual desde PeriodContext.
import { and, eq, gte, isNull, lte, or } from 'drizzle-orm'
import { ValidationError } from './errors'
import type { Database } from '../db/client'
import { indiceInflacion } from '../db/schema'

export interface Periodo {
  year: number
  month: number
  key: string // 'YYYY-MM'
}

const PERIODO_RE = /^(\d{4})-(\d{2})$/

export function parsePeriodoKey(key: string): Periodo {
  const m = PERIODO_RE.exec(key)
  if (!m) throw new ValidationError(`Período inválido: '${key}'. Formato esperado: YYYY-MM.`)
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12) throw new ValidationError(`Mes inválido en período '${key}'.`)
  return { year, month, key }
}

/** Parsea `?periodos=2026-07,2026-08` en una lista de períodos. */
export function parsePeriodosQuery(raw: string | undefined, fallback: Periodo): Periodo[] {
  if (!raw || !raw.trim()) return [fallback]
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parsePeriodoKey)
}

/** Lista contigua de períodos entre `desde` y `hasta` (inclusive) — para series de gráfico, a diferencia de la selección arbitraria de `?periodos=`. */
export function rangoPeriodos(desde: Periodo, hasta: Periodo): Periodo[] {
  const out: Periodo[] = []
  let year = desde.year
  let month = desde.month
  while (year < hasta.year || (year === hasta.year && month <= hasta.month)) {
    out.push({ year, month, key: periodoKey(year, month) })
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }
  return out
}

export function periodoKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function primerDiaDelMes(p: Periodo): string {
  return `${p.year}-${String(p.month).padStart(2, '0')}-01`
}

export function diasEnMes(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function esHabil(fecha: Date): boolean {
  const dia = fecha.getDay()
  return dia !== 0 && dia !== 6
}

export function diasHabilesInfo(year: number, month: number, hoyISO: string) {
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

/**
 * "Hoy" según la empresa: si tiene `fechaReferencia` seteada (la demo
 * comercial, o un cliente que todavía no migró), se usa esa fecha fija;
 * si no, el reloj real. Esto es lo único que mantiene la demo congelada
 * mientras las empresas reales avanzan con el calendario real.
 */
export function hoyDeLaEmpresa(empresa: { fechaReferencia: string | null }): string {
  return empresa.fechaReferencia ?? new Date().toISOString().slice(0, 10)
}

export function diasTranscurridos(fechaISO: string, hoyISO: string): number {
  const fecha = new Date(`${fechaISO}T00:00:00`)
  const hoy = new Date(`${hoyISO}T00:00:00`)
  return Math.round((hoy.getTime() - fecha.getTime()) / 86_400_000)
}

/**
 * Inflación acumulada compuesta entre dos períodos (exclusivo/inclusive,
 * igual semántica que la función homónima del frontend). Prioriza el
 * índice propio de la empresa; si no tiene, cae al índice global
 * (empresaId null).
 */
export async function inflacionAcumulada(
  db: Database,
  empresaId: string,
  desdeExclusivo: Periodo,
  hastaInclusive: Periodo,
): Promise<number | null> {
  const desdeDate = new Date(desdeExclusivo.year, desdeExclusivo.month - 1, 1)
  const hastaDate = new Date(hastaInclusive.year, hastaInclusive.month - 1, 1)
  if (hastaDate < desdeDate) return null

  const filas = await db
    .select({ periodo: indiceInflacion.periodo, valorPct: indiceInflacion.valorPct, empresaId: indiceInflacion.empresaId })
    .from(indiceInflacion)
    .where(
      and(
        or(eq(indiceInflacion.empresaId, empresaId), isNull(indiceInflacion.empresaId)),
        gte(indiceInflacion.periodo, desdeDate.toISOString().slice(0, 10)),
        lte(indiceInflacion.periodo, hastaDate.toISOString().slice(0, 10)),
      ),
    )

  // Un valor por mes: preferí el de la empresa por sobre el global si hay ambos.
  const porMes = new Map<string, number>()
  for (const f of filas) {
    const key = f.periodo
    const esPropio = f.empresaId === empresaId
    if (!porMes.has(key) || esPropio) porMes.set(key, Number(f.valorPct))
  }
  if (porMes.size === 0) return null

  let acumulado = 1
  for (const valor of porMes.values()) acumulado *= 1 + valor / 100
  return (acumulado - 1) * 100
}
