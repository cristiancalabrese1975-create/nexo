import type { FastifyInstance } from 'fastify'
import { db } from '../../db/client'
import { clasificarPorAcumulado } from '../../core/abc'
import { NotFoundError } from '../../core/errors'
import { rangoPeriodos, type Periodo } from '../../core/periodos'
import { cargarEmpresa, leerComparar, leerModo, leerPeriodos, valorSegunModo } from '../../core/query-helpers'
import { assertTenant } from '../../core/tenant'
import { ventaDiaria } from '../../core/consultas-venta'
import { clientePorId, listarClientesVisibles, topLineasCliente, ventaTodosLosClientes } from './queries'

export async function clientesRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const comparar = leerComparar(query)
    const modo = leerModo(query)

    const [visibles, ventaEmpresaCompleta, ventaComparar] = await Promise.all([
      listarClientesVisibles(db, ctx),
      ventaTodosLosClientes(db, ctx.empresaId, periodos),
      comparar.length ? ventaTodosLosClientes(db, ctx.empresaId, comparar) : Promise.resolve(new Map()),
    ])

    // El ranking A/B/C y el promedio de referencia se calculan sobre TODA
    // la cartera de la empresa, no sobre lo que ve este usuario — mismo
    // criterio que clasificarClientesABC en la demo (población completa,
    // ranking estable sin importar el filtro de rol activo).
    const itemsParaAbc = [...ventaEmpresaCompleta.entries()].map(([id, v]) => ({ key: id, venta: valorSegunModo(v.monto, v.unidades, modo) }))
    const tiers = clasificarPorAcumulado(itemsParaAbc)
    const totalEmpresaVenta = itemsParaAbc.reduce((acc, i) => acc + i.venta, 0)
    const promedioEmpresa = itemsParaAbc.length ? totalEmpresaVenta / itemsParaAbc.length : 0

    const items = visibles.map((c) => {
      const venta = ventaEmpresaCompleta.get(c.id)
      const actual = venta ? valorSegunModo(venta.monto, venta.unidades, modo) : 0
      const ventaAnt = ventaComparar.get(c.id)
      const anterior = ventaAnt ? valorSegunModo(ventaAnt.monto, ventaAnt.unidades, modo) : 0
      const evolucionPct = anterior > 0 ? Math.round((actual / anterior - 1) * 100) : actual > 0 ? 100 : 0
      return {
        id: c.id,
        codigo: c.codigo,
        razonSocial: c.razonSocial,
        categoria: c.categoriaNombre,
        vendedorId: c.vendedorId,
        vendedorNombre: c.vendedorNombre,
        venta: actual,
        ventaAnterior: comparar.length ? anterior : null,
        evolucionPct: comparar.length ? evolucionPct : null,
        tier: tiers[c.id] ?? 'C',
      }
    })

    return { periodos: periodos.map((p) => p.key), modo, promedioEmpresa, items }
  })

  app.get('/:id', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const { id } = request.params as { id: string }
    const empresaRow = await cargarEmpresa(db, ctx)
    const query = request.query as Record<string, unknown>
    const periodos = leerPeriodos(query, empresaRow)
    const modo = leerModo(query)

    const fila = assertTenant(await clientePorId(db, id), ctx, 'Cliente', id)
    if (ctx.rol === 'vendedor' && fila.vendedorId !== ctx.usuarioId) throw new NotFoundError('Cliente', id)

    // Últimos 6 meses relativos al último período pedido, para "líneas preferidas".
    const ultimo = periodos[periodos.length - 1]!
    let { year, month } = ultimo
    const trailing: Periodo[] = []
    for (let k = 0; k < 6; k++) {
      trailing.unshift({ year, month, key: `${year}-${String(month).padStart(2, '0')}` })
      month -= 1
      if (month < 1) {
        month = 12
        year -= 1
      }
    }
    const topLineas = await topLineasCliente(db, ctx.empresaId, id, trailing)

    return {
      cliente: {
        id: fila.id,
        codigo: fila.codigo,
        razonSocial: fila.razonSocial,
        cuit: fila.cuit,
        categoriaId: fila.categoriaId,
        vendedorId: fila.vendedorId,
        email: fila.email,
        telefono: fila.telefono,
        direccion: fila.direccion,
      },
      periodos: periodos.map((p) => p.key),
      modo,
      topLineas: topLineas.map((l) => ({ lineaId: l.lineaId, monto: l.monto })),
    }
  })

  app.get('/:id/diario', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const { id } = request.params as { id: string }
    const query = request.query as Record<string, unknown>
    const year = Number(query.year)
    const month = Number(query.month)
    if (!year || !month) throw new NotFoundError('year/month requeridos')

    const fila = assertTenant(await clientePorId(db, id), ctx, 'Cliente', id)
    if (ctx.rol === 'vendedor' && fila.vendedorId !== ctx.usuarioId) throw new NotFoundError('Cliente', id)

    const dias = await ventaDiaria(db, ctx.empresaId, year, month, { clienteId: id })
    return { dias }
  })
}
