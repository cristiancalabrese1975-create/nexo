import type { FastifyInstance } from 'fastify'
import { db } from '../../db/client'
import { agregarPorLinea, ventaDiaria } from '../../core/consultas-venta'
import { objetivoPorLinea } from '../../core/consultas-objetivo'
import { clasificarPorAcumulado } from '../../core/abc'
import { NotFoundError } from '../../core/errors'
import { cargarEmpresa, leerComparar, leerModo, leerPeriodos, valorSegunModo } from '../../core/query-helpers'
import { assertTenant } from '../../core/tenant'
import { lineaPorId, listarLineas, topProductosLinea } from './queries'

export async function lineasRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const comparar = leerComparar(query)
    const modo = leerModo(query)

    const [maestro, venta, objetivo, ventaComparar] = await Promise.all([
      listarLineas(db, ctx.empresaId),
      agregarPorLinea(db, ctx.empresaId, periodos),
      objetivoPorLinea(db, ctx.empresaId, periodos),
      comparar.length ? agregarPorLinea(db, ctx.empresaId, comparar) : Promise.resolve([]),
    ])
    const ventaPorId = new Map(venta.map((v) => [v.id, v]))
    const ventaCompararPorId = new Map(ventaComparar.map((v) => [v.id, v]))

    const items = maestro.map((l) => {
      const v = ventaPorId.get(l.id)
      const actual = v ? valorSegunModo(v.monto, v.unidades, modo) : 0
      const objetivoLinea = objetivo[l.id] ?? 0
      const avance = objetivoLinea > 0 ? Math.round((actual / objetivoLinea) * 100) : null
      const vAnt = ventaCompararPorId.get(l.id)
      const anterior = vAnt ? valorSegunModo(vAnt.monto, vAnt.unidades, modo) : 0
      const evolucionPct = anterior > 0 ? Math.round((actual / anterior - 1) * 100) : actual > 0 ? 100 : 0
      return {
        id: l.id,
        codigo: l.codigo,
        nombre: l.nombre,
        direccion: l.direccionNombre,
        venta: actual,
        objetivo: modo === 'unidades' ? null : objetivoLinea,
        avance,
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

    const fila = assertTenant(await lineaPorId(db, id), ctx, 'Línea', id)
    const topProductos = await topProductosLinea(db, ctx.empresaId, id, periodos)
    return {
      linea: { id: fila.id, codigo: fila.codigo, nombre: fila.nombre },
      periodos: periodos.map((p) => p.key),
      topProductos: topProductos.map((p) => ({ productoId: p.productoId, monto: p.monto })),
    }
  })

  app.get('/:id/diario', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const { id } = request.params as { id: string }
    const query = request.query as Record<string, unknown>
    const year = Number(query.year)
    const month = Number(query.month)
    if (!year || !month) throw new NotFoundError('year/month requeridos')
    assertTenant(await lineaPorId(db, id), ctx, 'Línea', id)

    const dias = await ventaDiaria(db, ctx.empresaId, year, month, { lineaId: id })
    return { dias }
  })
}
