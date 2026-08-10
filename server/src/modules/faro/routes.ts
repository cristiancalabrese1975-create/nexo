import type { FastifyInstance } from 'fastify'
import { db } from '../../db/client'
import { cargarEmpresa, leerComparar, leerModo, leerPeriodos, valorSegunModo } from '../../core/query-helpers'
import { hoyDeLaEmpresa } from '../../core/periodos'
import { moraPorCliente } from '../../core/consultas-mora'
import { diasSinContactoDesdeMapa, ultimaGestionPorCliente } from '../../core/consultas-gestion'
import { scoreDesvioCliente } from '../../core/scoring'
import { listarClientesVisibles, ventaTodosLosClientes } from '../clientes/queries'

export async function faroRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const comparar = leerComparar(query)
    const modo = leerModo(query)
    const hoy = hoyDeLaEmpresa(empresaRow)

    const [clientes, ventaActual, ventaAnterior, mora, ultimaGestion] = await Promise.all([
      listarClientesVisibles(db, ctx),
      ventaTodosLosClientes(db, ctx.empresaId, periodos),
      comparar.length ? ventaTodosLosClientes(db, ctx.empresaId, comparar) : Promise.resolve(new Map()),
      moraPorCliente(db, ctx, hoy),
      ultimaGestionPorCliente(db, ctx, hoy),
    ])

    const items = clientes.map((c) => {
      const actual = ventaActual.get(c.id)
      const actualValor = actual ? valorSegunModo(actual.monto, actual.unidades, modo) : 0
      const anterior = ventaAnterior.get(c.id)
      const anteriorValor = anterior ? valorSegunModo(anterior.monto, anterior.unidades, modo) : 0
      const evolucionPct = anteriorValor > 0 ? Math.round((actualValor / anteriorValor - 1) * 100) : actualValor > 0 ? 100 : 0

      const moraCliente = mora.get(c.id) ?? { saldoTotal: 0, diasMax: 0, cantidad: 0 }
      const diasSinContacto = diasSinContactoDesdeMapa(ultimaGestion, c.id, hoy)

      const score = scoreDesvioCliente({ evolucionPct, mora: moraCliente, diasSinContacto })

      return {
        id: c.id,
        codigo: c.codigo,
        razonSocial: c.razonSocial,
        vendedorId: c.vendedorId,
        vendedorNombre: c.vendedorNombre,
        venta: actualValor,
        evolucionPct,
        mora: moraCliente,
        diasSinContacto,
        score,
      }
    })

    items.sort((a, b) => b.score - a.score)
    return { periodos: periodos.map((p) => p.key), modo, hoy, items }
  })
}
