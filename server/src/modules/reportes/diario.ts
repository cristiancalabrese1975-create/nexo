import { and, eq, sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { ventaItem } from '../../db/schema'
import { primerDiaDelMes } from '../../core/periodos'

/**
 * Ledger día a día de un mes puntual, sin agrupar por ninguna dimensión —
 * el frontend agrupa por cliente/línea/producto según qué vista esté
 * mirando, igual que hacían `serieDiariaCliente/Linea/Sku` en el mock,
 * pero ahora sobre filas reales en vez de generadas.
 */
export async function ventaDiariaLedger(db: Database, empresaId: string, year: number, month: number) {
  const primerDia = primerDiaDelMes({ year, month, key: '' })
  return db
    .select({
      fecha: ventaItem.fecha,
      clienteId: ventaItem.clienteId,
      lineaId: ventaItem.lineaId,
      productoId: ventaItem.productoId,
      monto: ventaItem.monto,
      cantidad: ventaItem.cantidad,
    })
    .from(ventaItem)
    .where(and(eq(ventaItem.empresaId, empresaId), sql`date_trunc('month', ${ventaItem.fecha})::date = ${primerDia}`))
}
