import type { FastifyInstance } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { usuario, cliente } from '../../db/schema'
import { cargarEmpresa, leerModo, leerPeriodos, valorSegunModo } from '../../core/query-helpers'
import { hoyDeLaEmpresa } from '../../core/periodos'
import { agregarPorVendedor } from '../../core/consultas-venta'
import { objetivoPorVendedor } from '../../core/consultas-objetivo'
import { clientesAGestionarHoy } from '../../core/consultas-gestion'
import { ventaTodosLosClientes } from '../clientes/queries'

async function vendedoresDeLaEmpresa(empresaId: string) {
  return db
    .select({ id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido })
    .from(usuario)
    .where(and(eq(usuario.empresaId, empresaId), eq(usuario.rol, 'vendedor'), eq(usuario.activo, true)))
}

export async function gerencialRoutes(app: FastifyInstance) {
  const soloGerencia = [app.authenticate, app.requireRole(['gerente', 'admin_empresa'])]

  app.get('/ranking', { preHandler: soloGerencia }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const modo = leerModo(query)

    const [vendedores, venta, objetivo] = await Promise.all([
      vendedoresDeLaEmpresa(ctx.empresaId),
      agregarPorVendedor(db, ctx.empresaId, periodos),
      objetivoPorVendedor(db, ctx.empresaId, periodos),
    ])
    const ventaPorId = new Map(venta.map((v) => [v.id, v]))

    const items = vendedores
      .map((v) => {
        const val = ventaPorId.get(v.id)
        const ventaValor = val ? valorSegunModo(val.monto, val.unidades, modo) : 0
        const objetivoValor = objetivo[v.id] ?? 0
        const avance = objetivoValor > 0 ? Math.round((ventaValor / objetivoValor) * 100) : null
        return { id: v.id, nombre: `${v.nombre} ${v.apellido}`, venta: ventaValor, objetivo: objetivoValor, avance }
      })
      .sort((a, b) => b.venta - a.venta)

    return { periodos: periodos.map((p) => p.key), modo, items }
  })

  app.get('/distribucion', { preHandler: soloGerencia }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const modo = leerModo(query)

    const [vendedores, venta] = await Promise.all([vendedoresDeLaEmpresa(ctx.empresaId), agregarPorVendedor(db, ctx.empresaId, periodos)])
    const ventaPorId = new Map(venta.map((v) => [v.id, v]))
    const items = vendedores.map((v) => {
      const val = ventaPorId.get(v.id)
      return { id: v.id, nombre: `${v.nombre} ${v.apellido}`, venta: val ? valorSegunModo(val.monto, val.unidades, modo) : 0 }
    })
    return { periodos: periodos.map((p) => p.key), modo, items }
  })

  app.get('/pendientes', { preHandler: soloGerencia }, async (request) => {
    const ctx = request.authCtx
    const empresaRow = await cargarEmpresa(db, ctx)
    const hoy = hoyDeLaEmpresa(empresaRow)
    const [vendedores, aGestionar] = await Promise.all([vendedoresDeLaEmpresa(ctx.empresaId), clientesAGestionarHoy(db, ctx, hoy)])

    const porVendedor = new Map<string, number>()
    for (const g of aGestionar) porVendedor.set(g.vendedorId, (porVendedor.get(g.vendedorId) ?? 0) + 1)

    return {
      hoy,
      items: vendedores.map((v) => ({ id: v.id, nombre: `${v.nombre} ${v.apellido}`, pendientes: porVendedor.get(v.id) ?? 0 })),
    }
  })

  app.get('/cartera/:vendedorId', { preHandler: soloGerencia }, async (request) => {
    const ctx = request.authCtx
    const { vendedorId } = request.params as { vendedorId: string }
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const modo = leerModo(query)

    const [clientesDelVendedor, venta] = await Promise.all([
      db
        .select({ id: cliente.id, codigo: cliente.codigo, razonSocial: cliente.razonSocial })
        .from(cliente)
        .where(and(eq(cliente.empresaId, ctx.empresaId), eq(cliente.vendedorId, vendedorId), eq(cliente.activo, true))),
      ventaTodosLosClientes(db, ctx.empresaId, periodos),
    ])

    const items = clientesDelVendedor.map((c) => {
      const v = venta.get(c.id)
      return { id: c.id, codigo: c.codigo, razonSocial: c.razonSocial, venta: v ? valorSegunModo(v.monto, v.unidades, modo) : 0 }
    })
    return { periodos: periodos.map((p) => p.key), modo, items }
  })
}
