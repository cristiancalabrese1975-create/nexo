import { sql } from 'drizzle-orm'
import type { Database } from '../db/client'

/** Refresca mv_venta_mensual sin bloquear lecturas. Se llama al cerrar cada importación de ventas. */
export async function refrescarVentaMensual(db: Database) {
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_venta_mensual`)
}
