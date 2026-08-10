import { and, desc, eq, lte, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { cliente, gestion, usuario } from '../db/schema'
import { diasTranscurridos } from './periodos'
import type { AuthContext } from './tenant'

/** Última gestión (cualquier tipo/estado) hasta `hoy`, por cliente — para "días sin contacto". */
export async function ultimaGestionPorCliente(db: Database, ctx: AuthContext, hoy: string): Promise<Map<string, string>> {
  const condiciones = [eq(gestion.empresaId, ctx.empresaId), lte(gestion.fecha, hoy)]
  if (ctx.rol === 'vendedor') condiciones.push(eq(cliente.vendedorId, ctx.usuarioId))

  const filas = await db
    .select({ clienteId: gestion.clienteId, ultima: sql<string>`MAX(${gestion.fecha})` })
    .from(gestion)
    .innerJoin(cliente, eq(cliente.id, gestion.clienteId))
    .where(and(...condiciones))
    .groupBy(gestion.clienteId)

  return new Map(filas.map((f) => [f.clienteId, f.ultima]))
}

export function diasSinContactoDesdeMapa(mapa: Map<string, string>, clienteId: string, hoy: string): number | null {
  const ultima = mapa.get(clienteId)
  return ultima ? diasTranscurridos(ultima, hoy) : null
}

/**
 * Clientes que necesitan una gestión hoy: la última gestión agendada
 * (pendiente/reprogramada) ya venció, o la próxima gestión de la última
 * gestión realizada ya se cumplió. Mismo criterio que
 * clientesAGestionarHoy del frontend.
 */
export async function clientesAGestionarHoy(db: Database, ctx: AuthContext, hoy: string) {
  const condiciones = [eq(gestion.empresaId, ctx.empresaId)]
  if (ctx.rol === 'vendedor') condiciones.push(eq(gestion.vendedorId, ctx.usuarioId))

  // Última gestión por cliente (por fecha+hora desc), traída completa —
  // el volumen de gestiones por cliente es chico, se ordena en memoria.
  const filas = await db
    .select({
      clienteId: gestion.clienteId,
      clienteNombre: cliente.razonSocial,
      vendedorId: gestion.vendedorId,
      vendedorNombre: usuario.nombre,
      tipo: gestion.tipo,
      estado: gestion.estado,
      fecha: gestion.fecha,
      hora: gestion.hora,
      proximaGestion: gestion.proximaGestion,
    })
    .from(gestion)
    .innerJoin(cliente, eq(cliente.id, gestion.clienteId))
    .innerJoin(usuario, eq(usuario.id, gestion.vendedorId))
    .where(and(...condiciones))
    .orderBy(desc(gestion.fecha), desc(gestion.hora))

  const ultimaPorCliente = new Map<string, (typeof filas)[number]>()
  for (const f of filas) if (!ultimaPorCliente.has(f.clienteId)) ultimaPorCliente.set(f.clienteId, f)

  const resultado: Array<{
    clienteId: string
    clienteNombre: string
    vendedorId: string
    vendedorNombre: string
    motivo: 'programada' | 'seguimiento'
    tipoUltima: string
    fechaUltima: string
    fechaReferencia: string
  }> = []
  for (const [clienteId, ultima] of ultimaPorCliente) {
    if ((ultima.estado === 'pendiente' || ultima.estado === 'reprogramada') && ultima.fecha <= hoy) {
      resultado.push({
        clienteId,
        clienteNombre: ultima.clienteNombre,
        vendedorId: ultima.vendedorId,
        vendedorNombre: ultima.vendedorNombre,
        motivo: 'programada',
        tipoUltima: ultima.tipo,
        fechaUltima: ultima.fecha,
        fechaReferencia: ultima.fecha,
      })
    } else if (ultima.estado === 'realizada' && ultima.proximaGestion && ultima.proximaGestion <= hoy) {
      resultado.push({
        clienteId,
        clienteNombre: ultima.clienteNombre,
        vendedorId: ultima.vendedorId,
        vendedorNombre: ultima.vendedorNombre,
        motivo: 'seguimiento',
        tipoUltima: ultima.tipo,
        fechaUltima: ultima.fecha,
        fechaReferencia: ultima.proximaGestion,
      })
    }
  }
  return resultado.sort((a, b) => a.fechaReferencia.localeCompare(b.fechaReferencia))
}
