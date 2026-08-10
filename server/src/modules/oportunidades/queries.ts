import { and, asc, eq, max } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { cliente, etapaPipeline, oportunidad, usuario } from '../../db/schema'
import type { AuthContext } from '../../core/tenant'

export async function listarEtapas(db: Database, empresaId: string) {
  return db.select().from(etapaPipeline).where(eq(etapaPipeline.empresaId, empresaId)).orderBy(asc(etapaPipeline.orden))
}

export async function primeraEtapaAbierta(db: Database, empresaId: string) {
  const [fila] = await db
    .select()
    .from(etapaPipeline)
    .where(and(eq(etapaPipeline.empresaId, empresaId), eq(etapaPipeline.tipo, 'abierta')))
    .orderBy(asc(etapaPipeline.orden))
    .limit(1)
  return fila
}

export async function listarOportunidades(db: Database, ctx: AuthContext) {
  const condiciones = [eq(oportunidad.empresaId, ctx.empresaId)]
  if (ctx.rol === 'vendedor') condiciones.push(eq(oportunidad.vendedorId, ctx.usuarioId))

  return db
    .select({
      id: oportunidad.id,
      titulo: oportunidad.titulo,
      clienteId: oportunidad.clienteId,
      clienteNombre: cliente.razonSocial,
      vendedorId: oportunidad.vendedorId,
      vendedorNombre: usuario.nombre,
      etapaId: oportunidad.etapaId,
      etapaCodigo: etapaPipeline.codigo,
      etapaTipo: etapaPipeline.tipo,
      valor: oportunidad.valor,
      fechaEstimadaCierre: oportunidad.fechaEstimadaCierre,
      fechaCierre: oportunidad.fechaCierre,
      creadoEn: oportunidad.creadoEn,
    })
    .from(oportunidad)
    .innerJoin(cliente, eq(cliente.id, oportunidad.clienteId))
    .innerJoin(usuario, eq(usuario.id, oportunidad.vendedorId))
    .innerJoin(etapaPipeline, eq(etapaPipeline.id, oportunidad.etapaId))
    .where(and(...condiciones))
}

/** Valor máximo entre TODAS las oportunidades de la empresa (sin scope de rol) — normaliza el score de monto, igual que MAX_VALOR_OPORTUNIDAD en la demo. */
export async function valorMaximoOportunidad(db: Database, empresaId: string): Promise<number> {
  const [fila] = await db.select({ max: max(oportunidad.valor) }).from(oportunidad).where(eq(oportunidad.empresaId, empresaId))
  return Number(fila?.max ?? 0)
}

export async function oportunidadPorId(db: Database, id: string) {
  const [fila] = await db.select().from(oportunidad).where(eq(oportunidad.id, id)).limit(1)
  return fila
}
