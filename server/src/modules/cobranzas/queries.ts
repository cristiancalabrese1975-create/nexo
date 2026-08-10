import { and, eq, gt, inArray, sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { cliente, comprobanteCC } from '../../db/schema'
import { primerDiaDelMes, type Periodo } from '../../core/periodos'
import type { AuthContext } from '../../core/tenant'

export async function comprobantesEnPeriodo(db: Database, ctx: AuthContext, periodos: Periodo[]) {
  const fechas = periodos.map(primerDiaDelMes)
  const condiciones = [
    eq(comprobanteCC.empresaId, ctx.empresaId),
    inArray(sql`date_trunc('month', ${comprobanteCC.fechaEmision})::date`, fechas),
  ]
  if (ctx.rol === 'vendedor') condiciones.push(eq(cliente.vendedorId, ctx.usuarioId))

  return db
    .select({
      id: comprobanteCC.id,
      clienteId: comprobanteCC.clienteId,
      clienteNombre: cliente.razonSocial,
      numero: comprobanteCC.numero,
      tipo: comprobanteCC.tipo,
      fechaEmision: comprobanteCC.fechaEmision,
      fechaVencimiento: comprobanteCC.fechaVencimiento,
      importe: comprobanteCC.importe,
      saldo: comprobanteCC.saldo,
    })
    .from(comprobanteCC)
    .innerJoin(cliente, eq(cliente.id, comprobanteCC.clienteId))
    .where(and(...condiciones))
}

/** Todo el saldo pendiente de cobro, sin importar el período — la mora es una foto de hoy, mismo criterio que la demo. */
export async function saldoPendienteTotal(db: Database, ctx: AuthContext) {
  const condiciones = [eq(comprobanteCC.empresaId, ctx.empresaId), gt(comprobanteCC.saldo, '0')]
  if (ctx.rol === 'vendedor') condiciones.push(eq(cliente.vendedorId, ctx.usuarioId))

  return db
    .select({
      clienteId: comprobanteCC.clienteId,
      clienteNombre: cliente.razonSocial,
      numero: comprobanteCC.numero,
      fechaEmision: comprobanteCC.fechaEmision,
      fechaVencimiento: comprobanteCC.fechaVencimiento,
      saldo: comprobanteCC.saldo,
    })
    .from(comprobanteCC)
    .innerJoin(cliente, eq(cliente.id, comprobanteCC.clienteId))
    .where(and(...condiciones))
}

export async function cobranzasACuenta(db: Database, empresaId: string) {
  const [fila] = await db
    .select({ total: sql<string>`COALESCE(SUM(${comprobanteCC.saldo}), 0)` })
    .from(comprobanteCC)
    .where(and(eq(comprobanteCC.empresaId, empresaId), eq(comprobanteCC.tipo, 'recibo')))
  return Number(fila?.total ?? 0)
}
