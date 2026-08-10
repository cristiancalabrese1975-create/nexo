import { and, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
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

/** Genera el id + hash de una nueva sesión de refresh. El JWT en sí lo firma la ruta (necesita `app.refreshSign`). */
export async function crearRegistroSesion(db: Database, usuarioId: string, tokenPlano: string, meta: SesionMeta) {
  const id = uuidv7()
  await db.insert(sesionRefresh).values({
    id,
    usuarioId,
    tokenHash: sha256(tokenPlano),
    expiraEn: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL)),
    userAgent: meta.userAgent,
    ip: meta.ip,
  })
  return id
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
