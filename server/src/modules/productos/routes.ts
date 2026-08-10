import type { FastifyInstance } from 'fastify'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db/client'
import { usuario, ventaItem } from '../../db/schema'
import { agregarPorProducto, ventaDiaria } from '../../core/consultas-venta'
import { clasificarPorAcumulado } from '../../core/abc'
import { NotFoundError } from '../../core/errors'
import { cargarEmpresa, leerComparar, leerModo, leerPeriodos, valorSegunModo } from '../../core/query-helpers'
import { assertTenant } from '../../core/tenant'
import { primerDiaDelMes } from '../../core/periodos'
import { listarProductos, productoPorId } from '../lineas/queries'

export async function productosRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const comparar = leerComparar(query)
    const modo = leerModo(query)
    const lineaId = typeof query.lineaId === 'string' ? query.lineaId : undefined

    const [maestro, venta, ventaComparar] = await Promise.all([
      listarProductos(db, ctx.empresaId, lineaId),
      agregarPorProducto(db, ctx.empresaId, periodos),
      comparar.length ? agregarPorProducto(db, ctx.empresaId, comparar) : Promise.resolve([]),
    ])
    const ventaPorId = new Map(venta.map((v) => [v.id, v]))
    const ventaCompararPorId = new Map(ventaComparar.map((v) => [v.id, v]))

    const items = maestro.map((p) => {
      const v = ventaPorId.get(p.id)
      const actual = v ? valorSegunModo(v.monto, v.unidades, modo) : 0
      const vAnt = ventaCompararPorId.get(p.id)
      const anterior = vAnt ? valorSegunModo(vAnt.monto, vAnt.unidades, modo) : 0
      const evolucionPct = anterior > 0 ? Math.round((actual / anterior - 1) * 100) : actual > 0 ? 100 : 0
      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        lineaId: p.lineaId,
        lineaNombre: p.lineaNombre,
        venta: actual,
        ventaAnterior: comparar.length ? anterior : null,
        evolucionPct: comparar.length ? evolucionPct : null,
      }
    })

    const tiers = clasificarPorAcumulado(items.map((i) => ({ key: i.id, venta: i.venta })))
    return { periodos: periodos.map((p) => p.key), modo, items: items.map((i) => ({ ...i, tier: tiers[i.id] ?? 'C' })) }
  })

  app.get('/:id', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const { id } = request.params as { id: string }
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)

    const fila = assertTenant(await productoPorId(db, id), ctx, 'Producto', id)

    // Vendedores que le vendieron este producto en el rango — reemplazo dinámico de vendedoresDelSku.
    const fechas = periodos.map(primerDiaDelMes)
    const vendedores = await db
      .selectDistinct({ vendedorId: ventaItem.vendedorId, nombre: usuario.nombre, apellido: usuario.apellido })
      .from(ventaItem)
      .leftJoin(usuario, eq(usuario.id, ventaItem.vendedorId))
      .where(
        and(
          eq(ventaItem.empresaId, ctx.empresaId),
          eq(ventaItem.productoId, id),
          inArray(sql`date_trunc('month', ${ventaItem.fecha})::date`, fechas),
        ),
      )

    return {
      producto: { id: fila.id, codigo: fila.codigo, nombre: fila.nombre, lineaId: fila.lineaId, precioLista: fila.precioLista },
      periodos: periodos.map((p) => p.key),
      vendedores: vendedores.filter((v) => v.vendedorId).map((v) => ({ id: v.vendedorId, nombre: `${v.nombre} ${v.apellido}` })),
    }
  })

  app.get('/:id/diario', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const { id } = request.params as { id: string }
    const query = request.query as Record<string, unknown>
    const year = Number(query.year)
    const month = Number(query.month)
    if (!year || !month) throw new NotFoundError('year/month requeridos')
    assertTenant(await productoPorId(db, id), ctx, 'Producto', id)

    const dias = await ventaDiaria(db, ctx.empresaId, year, month, { productoId: id })
    return { dias }
  })
}
