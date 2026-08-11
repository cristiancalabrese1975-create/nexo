import type { FastifyInstance } from 'fastify'
import { and, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { db } from '../../db/client'
import { cliente, condicionComercial, lineaProducto, usuario, ventaItem } from '../../db/schema'
import { cargarEmpresa, leerComparar, leerModo, leerPeriodos, valorSegunModo } from '../../core/query-helpers'
import { hoyDeLaEmpresa, primerDiaDelMes } from '../../core/periodos'
import { moraPorCliente } from '../../core/consultas-mora'
import { diasSinContactoDesdeMapa, ultimaGestionPorCliente } from '../../core/consultas-gestion'
import { scoreDesvioCliente } from '../../core/scoring'
import { listarClientesVisibles, ventaTodosLosClientes } from '../clientes/queries'
import type { AuthContext } from '../../core/tenant'

async function lineasHabitualesPorCliente(db_: typeof db, ctx: AuthContext, periodos: ReturnType<typeof leerPeriodos>) {
  const fechas = periodos.map(primerDiaDelMes)
  const condiciones = [eq(ventaItem.empresaId, ctx.empresaId), inArray(sql`date_trunc('month', ${ventaItem.fecha})::date`, fechas)]
  if (ctx.rol === 'vendedor') condiciones.push(eq(cliente.vendedorId, ctx.usuarioId))

  const filas = await db_
    .select({ clienteId: ventaItem.clienteId, lineaNombre: lineaProducto.nombre, monto: sql<string>`SUM(${ventaItem.monto})`.mapWith(Number) })
    .from(ventaItem)
    .innerJoin(cliente, eq(cliente.id, ventaItem.clienteId))
    .innerJoin(lineaProducto, eq(lineaProducto.id, ventaItem.lineaId))
    .where(and(...condiciones))
    .groupBy(ventaItem.clienteId, lineaProducto.nombre)
    .orderBy(sql`SUM(${ventaItem.monto}) DESC`)

  const out: Record<string, string[]> = {}
  for (const f of filas) {
    if (f.monto <= 0) continue
    ;(out[f.clienteId] ??= []).push(f.lineaNombre)
  }
  return out
}

async function descuentosVigentesPorCliente(db_: typeof db, ctx: AuthContext, hoy: string) {
  const condiciones = [
    eq(condicionComercial.empresaId, ctx.empresaId),
    lte(condicionComercial.vigenteDesde, hoy),
    or(isNull(condicionComercial.vigenteHasta), gte(condicionComercial.vigenteHasta, hoy)),
  ]
  if (ctx.rol === 'vendedor') condiciones.push(eq(cliente.vendedorId, ctx.usuarioId))

  const filas = await db_
    .select({
      clienteId: condicionComercial.clienteId,
      lineaNombre: lineaProducto.nombre,
      descuentoPct: condicionComercial.descuentoPct,
      vigenteDesde: condicionComercial.vigenteDesde,
    })
    .from(condicionComercial)
    .innerJoin(cliente, eq(cliente.id, condicionComercial.clienteId))
    .leftJoin(lineaProducto, eq(lineaProducto.id, condicionComercial.lineaId))
    .where(and(...condiciones))

  const out: Record<string, { linea: string | null; descuento: number; vigenteDesde: string }> = {}
  for (const f of filas) {
    if (Number(f.descuentoPct) <= 0) continue
    out[f.clienteId] = { linea: f.lineaNombre, descuento: Number(f.descuentoPct), vigenteDesde: f.vigenteDesde }
  }
  return out
}

export async function faroRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const comparar = leerComparar(query)
    const modo = leerModo(query)
    const hoy = hoyDeLaEmpresa(empresaRow)

    const [clientes, ventaActual, ventaAnterior, mora, ultimaGestion, lineasHabituales, descuentosVigentes, vendedoresWhatsapp] = await Promise.all([
      listarClientesVisibles(db, ctx),
      ventaTodosLosClientes(db, ctx.empresaId, periodos),
      comparar.length ? ventaTodosLosClientes(db, ctx.empresaId, comparar) : Promise.resolve(new Map()),
      moraPorCliente(db, ctx, hoy),
      ultimaGestionPorCliente(db, ctx, hoy),
      lineasHabitualesPorCliente(db, ctx, periodos),
      descuentosVigentesPorCliente(db, ctx, hoy),
      db
        .select({ nombre: sql<string>`${usuario.nombre} || ' ' || ${usuario.apellido}`, whatsapp: usuario.whatsapp })
        .from(usuario)
        .where(and(eq(usuario.empresaId, ctx.empresaId), eq(usuario.rol, 'vendedor'), eq(usuario.activo, true))),
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
        lineasHabituales: lineasHabituales[c.id] ?? [],
        descuentoVigente: descuentosVigentes[c.id] ?? null,
      }
    })

    items.sort((a, b) => b.score - a.score)
    return { periodos: periodos.map((p) => p.key), modo, hoy, items, vendedoresWhatsapp }
  })
}
