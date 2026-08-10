import type { FastifyInstance } from 'fastify'
import { and, eq, lte, or, isNull, gte } from 'drizzle-orm'
import { db } from '../../db/client'
import { cliente, condicionComercial, lineaProducto } from '../../db/schema'
import { cargarEmpresa, leerModo, leerPeriodos, valorSegunModo } from '../../core/query-helpers'
import { hoyDeLaEmpresa } from '../../core/periodos'
import { agregarPorCliente } from '../../core/consultas-venta'

export async function descuentosRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const modo = leerModo(query)
    const hoy = hoyDeLaEmpresa(empresaRow)

    const condiciones = [
      eq(condicionComercial.empresaId, ctx.empresaId),
      lte(condicionComercial.vigenteDesde, hoy),
      or(isNull(condicionComercial.vigenteHasta), gte(condicionComercial.vigenteHasta, hoy)),
    ]
    if (ctx.rol === 'vendedor') condiciones.push(eq(cliente.vendedorId, ctx.usuarioId))

    const [filas, venta] = await Promise.all([
      db
        .select({
          id: condicionComercial.id,
          clienteId: condicionComercial.clienteId,
          clienteCodigo: cliente.codigo,
          razonSocial: cliente.razonSocial,
          lineaNombre: lineaProducto.nombre,
          descuentoPct: condicionComercial.descuentoPct,
          vigenteDesde: condicionComercial.vigenteDesde,
        })
        .from(condicionComercial)
        .innerJoin(cliente, eq(cliente.id, condicionComercial.clienteId))
        .leftJoin(lineaProducto, eq(lineaProducto.id, condicionComercial.lineaId))
        .where(and(...condiciones)),
      agregarPorCliente(db, ctx.empresaId, periodos),
    ])

    const ventaPorCliente = new Map(venta.map((v) => [v.id, v]))
    return {
      periodos: periodos.map((p) => p.key),
      modo,
      items: filas.map((f) => ({
        id: f.id,
        clienteId: f.clienteId,
        codigo: f.clienteCodigo,
        razonSocial: f.razonSocial,
        linea: f.lineaNombre,
        descuento: Number(f.descuentoPct),
        vigenteDesde: f.vigenteDesde,
        venta: (() => {
          const v = ventaPorCliente.get(f.clienteId)
          return v ? valorSegunModo(v.monto, v.unidades, modo) : 0
        })(),
      })),
    }
  })
}
