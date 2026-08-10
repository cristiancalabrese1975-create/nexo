import type { Database } from '../db/client'
import { auditoria } from '../db/schema'
import type { AuthContext } from './tenant'

export async function registrarAuditoria(
  db: Database,
  ctx: AuthContext,
  entidad: string,
  entidadId: string,
  accion: 'crear' | 'actualizar' | 'eliminar',
  cambios?: unknown,
) {
  await db.insert(auditoria).values({
    empresaId: ctx.empresaId,
    usuarioId: ctx.usuarioId,
    entidad,
    entidadId,
    accion,
    cambios: cambios as object | undefined,
  })
}
