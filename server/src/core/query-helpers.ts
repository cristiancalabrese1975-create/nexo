import { eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { empresa } from '../db/schema'
import { NotFoundError, ValidationError } from './errors'
import { hoyDeLaEmpresa, parsePeriodoKey, parsePeriodosQuery, type Periodo } from './periodos'
import type { AuthContext } from './tenant'

export async function cargarEmpresa(db: Database, ctx: AuthContext) {
  const [fila] = await db.select().from(empresa).where(eq(empresa.id, ctx.empresaId)).limit(1)
  if (!fila) throw new NotFoundError('Empresa', ctx.empresaId)
  return fila
}

/** Lee `?periodos=` de la query, con fallback al mes de "hoy" de la empresa (fecha_referencia u hoy real). */
export function leerPeriodos(query: Record<string, unknown>, empresaRow: { fechaReferencia: string | null }): Periodo[] {
  const hoy = hoyDeLaEmpresa(empresaRow)
  const [y, m] = hoy.split('-')
  const fallback = parsePeriodoKey(`${y}-${m}`)
  const raw = typeof query.periodos === 'string' ? query.periodos : undefined
  return parsePeriodosQuery(raw, fallback)
}

/** Lee `?comparar=` — a diferencia de `periodos`, es opcional y sin fallback (sin comparación si no viene). */
export function leerComparar(query: Record<string, unknown>): Periodo[] {
  const raw = typeof query.comparar === 'string' ? query.comparar : undefined
  if (!raw) return []
  return parsePeriodosQuery(raw, { year: 0, month: 0, key: '' }).filter((p) => p.year !== 0)
}

export function leerModo(query: Record<string, unknown>): 'pesos' | 'unidades' {
  const modo = query.modo
  if (modo === 'unidades') return 'unidades'
  if (modo === undefined || modo === 'pesos') return 'pesos'
  throw new ValidationError(`modo inválido: '${String(modo)}'. Usar 'pesos' o 'unidades'.`)
}

export function valorSegunModo(monto: number, unidades: number, modo: 'pesos' | 'unidades'): number {
  return modo === 'unidades' ? unidades : monto
}
