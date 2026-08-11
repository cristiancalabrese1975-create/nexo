import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { cliente, categoriaCliente, usuario, lineaProducto, direccionComercial, producto, ventaItem } from '../../db/schema'
import { primerDiaDelMes, type Periodo } from '../../core/periodos'

/** Cartera completa de la empresa, sin scope de vendedor — mismo alcance que tenían Líneas/SKU/Resumen Gerencial en la demo original. */
export async function listarClientesTodos(db: Database, empresaId: string) {
  return db
    .select({
      id: cliente.id,
      codigo: cliente.codigo,
      razonSocial: cliente.razonSocial,
      categoriaNombre: categoriaCliente.nombre,
      vendedorId: cliente.vendedorId,
      vendedorNombre: sql<string>`${usuario.nombre} || ' ' || ${usuario.apellido}`,
    })
    .from(cliente)
    .leftJoin(categoriaCliente, eq(categoriaCliente.id, cliente.categoriaId))
    .leftJoin(usuario, eq(usuario.id, cliente.vendedorId))
    .where(and(eq(cliente.empresaId, empresaId), eq(cliente.activo, true)))
}

export async function listarLineasTodas(db: Database, empresaId: string) {
  return db
    .select({ id: lineaProducto.id, nombre: lineaProducto.nombre, direccionNombre: direccionComercial.nombre })
    .from(lineaProducto)
    .leftJoin(direccionComercial, eq(direccionComercial.id, lineaProducto.direccionId))
    .where(and(eq(lineaProducto.empresaId, empresaId), eq(lineaProducto.activa, true)))
}

export async function listarProductosTodos(db: Database, empresaId: string) {
  return db
    .select({ id: producto.id, codigo: producto.codigo, nombre: producto.nombre, lineaId: producto.lineaId, lineaNombre: lineaProducto.nombre })
    .from(producto)
    .leftJoin(lineaProducto, eq(lineaProducto.id, producto.lineaId))
    .where(and(eq(producto.empresaId, empresaId), eq(producto.activo, true)))
}

export async function listarVendedoresRoster(db: Database, empresaId: string) {
  return db
    .select({ id: usuario.id, nombre: sql<string>`${usuario.nombre} || ' ' || ${usuario.apellido}`, whatsapp: usuario.whatsapp })
    .from(usuario)
    .where(and(eq(usuario.empresaId, empresaId), eq(usuario.rol, 'vendedor'), eq(usuario.activo, true)))
}

/** Líneas que compró cada cliente en el rango (venta > 0), sin límite artificial — reemplazo dinámico de lineasPreferidasPorCliente. */
export async function lineasPorClienteTodos(db: Database, empresaId: string, periodos: Periodo[]): Promise<Record<string, string[]>> {
  if (periodos.length === 0) return {}
  const fechas = periodos.map(primerDiaDelMes)
  const filas = await db
    .select({ clienteId: ventaItem.clienteId, lineaId: ventaItem.lineaId, monto: sql<string>`SUM(${ventaItem.monto})`.mapWith(Number) })
    .from(ventaItem)
    .where(and(eq(ventaItem.empresaId, empresaId), inArray(sql`date_trunc('month', ${ventaItem.fecha})::date`, fechas)))
    .groupBy(ventaItem.clienteId, ventaItem.lineaId)
    .orderBy(sql`SUM(${ventaItem.monto}) DESC`)

  const out: Record<string, string[]> = {}
  for (const f of filas) {
    if (f.monto <= 0) continue
    ;(out[f.clienteId] ??= []).push(f.lineaId)
  }
  return out
}

/** SKU que compró cada cliente en el rango — reemplazo dinámico de skusPreferidosPorCliente. */
export async function skusPorClienteTodos(db: Database, empresaId: string, periodos: Periodo[]): Promise<Record<string, string[]>> {
  if (periodos.length === 0) return {}
  const fechas = periodos.map(primerDiaDelMes)
  const filas = await db
    .select({ clienteId: ventaItem.clienteId, productoId: ventaItem.productoId, monto: sql<string>`SUM(${ventaItem.monto})`.mapWith(Number) })
    .from(ventaItem)
    .where(and(eq(ventaItem.empresaId, empresaId), inArray(sql`date_trunc('month', ${ventaItem.fecha})::date`, fechas)))
    .groupBy(ventaItem.clienteId, ventaItem.productoId)
    .orderBy(sql`SUM(${ventaItem.monto}) DESC`)

  const out: Record<string, string[]> = {}
  for (const f of filas) {
    if (f.monto <= 0 || !f.productoId) continue
    ;(out[f.clienteId] ??= []).push(f.productoId)
  }
  return out
}
