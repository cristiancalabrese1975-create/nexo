import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { cliente, categoriaCliente, usuario, ventaItem } from '../../db/schema'
import { mvVentaMensual } from '../../db/schema/views'
import { primerDiaDelMes, type Periodo } from '../../core/periodos'
import type { AuthContext } from '../../core/tenant'

export async function listarClientesVisibles(db: Database, ctx: AuthContext) {
  const condiciones = [eq(cliente.empresaId, ctx.empresaId), eq(cliente.activo, true)]
  if (ctx.rol === 'vendedor') condiciones.push(eq(cliente.vendedorId, ctx.usuarioId))

  return db
    .select({
      id: cliente.id,
      codigo: cliente.codigo,
      razonSocial: cliente.razonSocial,
      categoriaId: cliente.categoriaId,
      categoriaNombre: categoriaCliente.nombre,
      vendedorId: cliente.vendedorId,
      vendedorNombre: sql<string>`${usuario.nombre} || ' ' || ${usuario.apellido}`,
    })
    .from(cliente)
    .leftJoin(categoriaCliente, eq(categoriaCliente.id, cliente.categoriaId))
    .leftJoin(usuario, eq(usuario.id, cliente.vendedorId))
    .where(and(...condiciones))
}

/** Venta agregada por cliente para TODA la empresa (sin filtro de rol) — necesaria para que el ABC y el promedio de referencia sean estables, igual que en la demo. */
export async function ventaTodosLosClientes(db: Database, empresaId: string, periodos: Periodo[]) {
  if (periodos.length === 0) return new Map<string, { monto: number; unidades: number }>()
  const fechas = periodos.map(primerDiaDelMes)
  const filas = await db
    .select({
      clienteId: ventaItem.clienteId,
      monto: sql<string>`COALESCE(SUM(${ventaItem.monto}), 0)`,
      unidades: sql<string>`COALESCE(SUM(${ventaItem.cantidad}), 0)`,
    })
    .from(ventaItem)
    .where(and(eq(ventaItem.empresaId, empresaId), inArray(sql`date_trunc('month', ${ventaItem.fecha})::date`, fechas)))
    .groupBy(ventaItem.clienteId)
  return new Map(filas.map((f) => [f.clienteId, { monto: Number(f.monto), unidades: Number(f.unidades) }]))
}

/** Matriz mensual venta × cliente, sólo de los clientes visibles para este usuario — alimenta el sparkline de 5 meses en Clientes.jsx. */
export async function serieMensualClientesVisibles(db: Database, ctx: AuthContext, periodos: Periodo[]) {
  if (periodos.length === 0) return {}
  const fechas = periodos.map(primerDiaDelMes)
  const condiciones = [eq(mvVentaMensual.empresaId, ctx.empresaId), inArray(mvVentaMensual.periodo, fechas)]

  const filas = await db
    .select({
      clienteId: mvVentaMensual.clienteId,
      periodo: mvVentaMensual.periodo,
      monto: sql<string>`COALESCE(SUM(${mvVentaMensual.monto}), 0)`,
      unidades: sql<string>`COALESCE(SUM(${mvVentaMensual.unidades}), 0)`,
    })
    .from(mvVentaMensual)
    .innerJoin(cliente, eq(cliente.id, mvVentaMensual.clienteId))
    .where(ctx.rol === 'vendedor' ? and(...condiciones, eq(cliente.vendedorId, ctx.usuarioId)) : and(...condiciones))
    .groupBy(mvVentaMensual.clienteId, mvVentaMensual.periodo)

  const porCliente = new Map<string, Map<string, { monto: number; unidades: number }>>()
  for (const f of filas) {
    if (!porCliente.has(f.clienteId)) porCliente.set(f.clienteId, new Map())
    porCliente.get(f.clienteId)!.set(f.periodo, { monto: Number(f.monto), unidades: Number(f.unidades) })
  }
  const resultado: Record<string, Array<{ monto: number; unidades: number }>> = {}
  for (const [clienteId, porPeriodo] of porCliente) {
    resultado[clienteId] = periodos.map((p) => porPeriodo.get(primerDiaDelMes(p)) ?? { monto: 0, unidades: 0 })
  }
  return resultado
}

export async function clientePorId(db: Database, id: string) {
  const [fila] = await db
    .select({
      id: cliente.id,
      empresaId: cliente.empresaId,
      codigo: cliente.codigo,
      razonSocial: cliente.razonSocial,
      cuit: cliente.cuit,
      categoriaId: cliente.categoriaId,
      vendedorId: cliente.vendedorId,
      email: cliente.email,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      activo: cliente.activo,
    })
    .from(cliente)
    .where(eq(cliente.id, id))
    .limit(1)
  return fila
}

/** Top líneas/productos que compra un cliente en los últimos N meses — reemplazo dinámico de lineasPreferidasPorCliente. */
export async function topLineasCliente(db: Database, empresaId: string, clienteId: string, periodos: Periodo[], limite = 4) {
  const fechas = periodos.map(primerDiaDelMes)
  return db
    .select({
      lineaId: ventaItem.lineaId,
      monto: sql<string>`SUM(${ventaItem.monto})`.mapWith(Number),
    })
    .from(ventaItem)
    .where(
      and(
        eq(ventaItem.empresaId, empresaId),
        eq(ventaItem.clienteId, clienteId),
        inArray(sql`date_trunc('month', ${ventaItem.fecha})::date`, fechas),
      ),
    )
    .groupBy(ventaItem.lineaId)
    .orderBy(desc(sql`SUM(${ventaItem.monto})`))
    .limit(limite)
}
