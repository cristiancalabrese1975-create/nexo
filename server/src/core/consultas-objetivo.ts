import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { objetivo } from '../db/schema'
import { primerDiaDelMes, type Periodo } from './periodos'

/** Objetivo total de la empresa (ambito='empresa') sumado sobre una lista de períodos. */
export async function objetivoEmpresa(db: Database, empresaId: string, periodos: Periodo[]): Promise<number> {
  if (periodos.length === 0) return 0
  const [fila] = await db
    .select({ total: sql<string>`COALESCE(SUM(${objetivo.monto}), 0)` })
    .from(objetivo)
    .where(
      and(
        eq(objetivo.empresaId, empresaId),
        eq(objetivo.ambito, 'empresa'),
        inArray(objetivo.periodo, periodos.map(primerDiaDelMes)),
      ),
    )
  return Number(fila?.total ?? 0)
}

/** Objetivo por línea (ambito='linea'), sumado sobre una lista de períodos, agrupado por línea. */
export async function objetivoPorLinea(db: Database, empresaId: string, periodos: Periodo[]): Promise<Record<string, number>> {
  if (periodos.length === 0) return {}
  const filas = await db
    .select({ lineaId: objetivo.lineaId, total: sql<string>`COALESCE(SUM(${objetivo.monto}), 0)` })
    .from(objetivo)
    .where(
      and(
        eq(objetivo.empresaId, empresaId),
        eq(objetivo.ambito, 'linea'),
        inArray(objetivo.periodo, periodos.map(primerDiaDelMes)),
      ),
    )
    .groupBy(objetivo.lineaId)
  const out: Record<string, number> = {}
  for (const f of filas) if (f.lineaId) out[f.lineaId] = Number(f.total)
  return out
}

/** Objetivo mensual de empresa (un valor por mes) — para dibujar la serie anual, no sólo el total. */
export async function serieObjetivoEmpresa(db: Database, empresaId: string, periodos: Periodo[]): Promise<Record<string, number>> {
  if (periodos.length === 0) return {}
  const filas = await db
    .select({ periodo: objetivo.periodo, total: sql<string>`COALESCE(SUM(${objetivo.monto}), 0)` })
    .from(objetivo)
    .where(
      and(
        eq(objetivo.empresaId, empresaId),
        eq(objetivo.ambito, 'empresa'),
        inArray(objetivo.periodo, periodos.map(primerDiaDelMes)),
      ),
    )
    .groupBy(objetivo.periodo)
  const out: Record<string, number> = {}
  for (const f of filas) out[f.periodo] = Number(f.total)
  return out
}

export async function objetivoPorVendedor(db: Database, empresaId: string, periodos: Periodo[]): Promise<Record<string, number>> {
  if (periodos.length === 0) return {}
  const filas = await db
    .select({ vendedorId: objetivo.vendedorId, total: sql<string>`COALESCE(SUM(${objetivo.monto}), 0)` })
    .from(objetivo)
    .where(
      and(
        eq(objetivo.empresaId, empresaId),
        eq(objetivo.ambito, 'vendedor'),
        inArray(objetivo.periodo, periodos.map(primerDiaDelMes)),
      ),
    )
    .groupBy(objetivo.vendedorId)
  const out: Record<string, number> = {}
  for (const f of filas) if (f.vendedorId) out[f.vendedorId] = Number(f.total)
  return out
}
