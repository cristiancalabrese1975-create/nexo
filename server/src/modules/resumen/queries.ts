import { and, eq, inArray, or, isNull as isNullOp } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { indiceInflacion } from '../../db/schema'
import { serieMensualEmpresa } from '../../core/consultas-venta'
import { serieObjetivoEmpresa } from '../../core/consultas-objetivo'
import { primerDiaDelMes, type Periodo } from '../../core/periodos'

export interface FilaResumen extends Periodo {
  venta: number
  unidades: number
  objetivo: number
  avance: number | null
}

/** Serie mensual completa (venta + unidades + objetivo + avance) — reemplazo directo de resumenPorPeriodo/unidadesPorPeriodo. */
export async function serieResumen(db: Database, empresaId: string, periodos: Periodo[]): Promise<FilaResumen[]> {
  const [venta, objetivoPorMes] = await Promise.all([
    serieMensualEmpresa(db, empresaId, periodos),
    serieObjetivoEmpresa(db, empresaId, periodos),
  ])
  return venta.map((v) => {
    const objetivoMes = objetivoPorMes[primerDiaDelMes(v)] ?? 0
    const avance = objetivoMes > 0 ? Math.round((v.venta / objetivoMes) * 100) : null
    return { ...v, objetivo: objetivoMes, avance }
  })
}

/** Índice de inflación mes a mes para el rango pedido — prioriza el propio de la empresa por sobre el global. */
export async function serieInflacion(db: Database, empresaId: string, periodos: Periodo[]): Promise<Record<string, number>> {
  if (periodos.length === 0) return {}
  const fechas = periodos.map(primerDiaDelMes)
  const filas = await db
    .select({ periodo: indiceInflacion.periodo, valorPct: indiceInflacion.valorPct, empresaId: indiceInflacion.empresaId })
    .from(indiceInflacion)
    .where(and(or(eq(indiceInflacion.empresaId, empresaId), isNullOp(indiceInflacion.empresaId)), inArray(indiceInflacion.periodo, fechas)))

  const out: Record<string, number> = {}
  for (const f of filas) {
    const esPropio = f.empresaId === empresaId
    if (out[f.periodo] === undefined || esPropio) out[f.periodo] = Number(f.valorPct)
  }
  return out
}
