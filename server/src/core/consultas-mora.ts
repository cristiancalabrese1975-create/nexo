import { and, eq, gt } from 'drizzle-orm'
import type { Database } from '../db/client'
import { cliente, comprobanteCC } from '../db/schema'
import { diasTranscurridos } from './periodos'
import type { AuthContext } from './tenant'

export interface MoraCliente {
  saldoTotal: number
  diasMax: number
  cantidad: number
}

/** Mora de TODOS los clientes visibles, sin importar el período (foto de hoy) — usado por Cobranzas y Faro. */
export async function moraPorCliente(db: Database, ctx: AuthContext, hoy: string): Promise<Map<string, MoraCliente>> {
  const condiciones = [eq(comprobanteCC.empresaId, ctx.empresaId), gt(comprobanteCC.saldo, '0')]
  if (ctx.rol === 'vendedor') condiciones.push(eq(cliente.vendedorId, ctx.usuarioId))

  const filas = await db
    .select({
      clienteId: comprobanteCC.clienteId,
      saldo: comprobanteCC.saldo,
      fechaEmision: comprobanteCC.fechaEmision,
      fechaVencimiento: comprobanteCC.fechaVencimiento,
    })
    .from(comprobanteCC)
    .innerJoin(cliente, eq(cliente.id, comprobanteCC.clienteId))
    .where(and(...condiciones))

  const out = new Map<string, MoraCliente>()
  for (const f of filas) {
    const referencia = f.fechaVencimiento ?? f.fechaEmision
    const dias = diasTranscurridos(referencia, hoy)
    const actual = out.get(f.clienteId) ?? { saldoTotal: 0, diasMax: 0, cantidad: 0 }
    actual.saldoTotal += Number(f.saldo)
    actual.diasMax = Math.max(actual.diasMax, dias)
    actual.cantidad += 1
    out.set(f.clienteId, actual)
  }
  return out
}
