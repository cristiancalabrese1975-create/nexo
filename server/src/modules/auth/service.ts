import { and, eq, isNull } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { sesionRefresh, usuario } from '../../db/schema'
import { UnauthorizedError } from '../../core/errors'
import { sha256 } from '../../core/crypto'
import { parseDurationMs } from '../../core/duration'
import { env } from '../../env'
import { hashPassword, verifyPassword } from './password'

export interface SesionMeta {
  userAgent?: string
  ip?: string
}

/** Busca por DNI entre usuarios activos (de cualquier empresa — el login no pide empresa) y valida la clave. */
export async function autenticarPorDni(db: Database, dni: string, clave: string) {
  const [fila] = await db
    .select()
    .from(usuario)
    .where(and(eq(usuario.dni, dni.trim()), eq(usuario.activo, true)))
    .limit(1)

  // Mismo mensaje exista o no el usuario — no filtramos si el DNI está cargado.
  if (!fila) throw new UnauthorizedError('DNI o clave incorrectos.')
  const claveOk = await verifyPassword(fila.passwordHash, clave)
  if (!claveOk) throw new UnauthorizedError('DNI o clave incorrectos.')

  await db.update(usuario).set({ ultimoLogin: new Date() }).where(eq(usuario.id, fila.id))
  return fila
}

/**
 * Guarda el hash de una sesión de refresh, usando como id de la fila el
 * mismo `sid` que la ruta ya firmó dentro del JWT — tienen que ser el
 * mismo valor, porque `validarSesion` busca la fila por ese id a partir
 * de lo que trae el token. Antes se generaba un id nuevo acá adentro
 * (independiente del `sid` del JWT), así que el refresh nunca encontraba
 * la fila y fallaba siempre con "Sesión inválida.", para cualquier
 * usuario, en cualquier entorno.
 */
export async function crearRegistroSesion(db: Database, usuarioId: string, sid: string, tokenPlano: string, meta: SesionMeta) {
  await db.insert(sesionRefresh).values({
    id: sid,
    usuarioId,
    tokenHash: sha256(tokenPlano),
    expiraEn: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL)),
    userAgent: meta.userAgent,
    ip: meta.ip,
  })
  return sid
}

/** Valida que la sesión exista, no esté revocada, no haya vencido, y que el token coincida con el hash guardado. */
export async function validarSesion(db: Database, sesionId: string, tokenPlano: string) {
  const [fila] = await db.select().from(sesionRefresh).where(eq(sesionRefresh.id, sesionId)).limit(1)
  if (!fila) throw new UnauthorizedError('Sesión inválida.')
  if (fila.revocadaEn) throw new UnauthorizedError('Sesión cerrada.')
  if (fila.expiraEn.getTime() < Date.now()) throw new UnauthorizedError('Sesión vencida.')
  if (fila.tokenHash !== sha256(tokenPlano)) throw new UnauthorizedError('Sesión inválida.')
  return fila
}

export async function revocarSesion(db: Database, sesionId: string) {
  await db.update(sesionRefresh).set({ revocadaEn: new Date() }).where(eq(sesionRefresh.id, sesionId))
}

/** Cierra todas las sesiones activas del usuario — útil si se lo desactiva o cambia de clave. */
export async function revocarTodasLasSesiones(db: Database, usuarioId: string) {
  await db
    .update(sesionRefresh)
    .set({ revocadaEn: new Date() })
    .where(and(eq(sesionRefresh.usuarioId, usuarioId), isNull(sesionRefresh.revocadaEn)))
}

export async function actualizarClave(db: Database, usuarioId: string, claveNueva: string) {
  const passwordHash = await hashPassword(claveNueva)
  await db.update(usuario).set({ passwordHash }).where(eq(usuario.id, usuarioId))
  await revocarTodasLasSesiones(db, usuarioId)
}
