import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { direccionComercial, lineaProducto, producto, ventaItem } from '../../db/schema'
import { primerDiaDelMes, type Periodo } from '../../core/periodos'

export async function listarLineas(db: Database, empresaId: string) {
  return db
    .select({
      id: lineaProducto.id,
      codigo: lineaProducto.codigo,
      nombre: lineaProducto.nombre,
      direccionId: lineaProducto.direccionId,
      direccionNombre: direccionComercial.nombre,
    })
    .from(lineaProducto)
    .leftJoin(direccionComercial, eq(direccionComercial.id, lineaProducto.direccionId))
    .where(and(eq(lineaProducto.empresaId, empresaId), eq(lineaProducto.activa, true)))
}

export async function lineaPorId(db: Database, id: string) {
  const [fila] = await db.select().from(lineaProducto).where(eq(lineaProducto.id, id)).limit(1)
  return fila
}

export async function topProductosLinea(db: Database, empresaId: string, lineaId: string, periodos: Periodo[], limite = 6) {
  const fechas = periodos.map(primerDiaDelMes)
  return db
    .select({ productoId: ventaItem.productoId, monto: sql<string>`SUM(${ventaItem.monto})`.mapWith(Number) })
    .from(ventaItem)
    .where(
      and(
        eq(ventaItem.empresaId, empresaId),
        eq(ventaItem.lineaId, lineaId),
        inArray(sql`date_trunc('month', ${ventaItem.fecha})::date`, fechas),
      ),
    )
    .groupBy(ventaItem.productoId)
    .orderBy(desc(sql`SUM(${ventaItem.monto})`))
    .limit(limite)
}

export async function listarProductos(db: Database, empresaId: string, lineaId?: string) {
  const condiciones = [eq(producto.empresaId, empresaId), eq(producto.activo, true)]
  if (lineaId) condiciones.push(eq(producto.lineaId, lineaId))
  return db
    .select({
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      lineaId: producto.lineaId,
      lineaNombre: lineaProducto.nombre,
      precioLista: producto.precioLista,
    })
    .from(producto)
    .leftJoin(lineaProducto, eq(lineaProducto.id, producto.lineaId))
    .where(and(...condiciones))
}

export async function productoPorId(db: Database, id: string) {
  const [fila] = await db.select().from(producto).where(eq(producto.id, id)).limit(1)
  return fila
}
