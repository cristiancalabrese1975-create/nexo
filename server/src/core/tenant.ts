// Aislamiento multi-empresa. El empresaId sale siempre del JWT (ver
// modules/auth), nunca de un parámetro del request. Esta es la única
// pieza que los módulos de negocio deberían usar para acotar sus
// consultas — ningún handler debería escribir `eq(tabla.empresaId, ...)`
// a mano fuera de acá, para que el filtro no se pueda olvidar.
import { and, eq, type Column } from 'drizzle-orm'
import { NotFoundError, ForbiddenError } from './errors'

export type Rol = 'vendedor' | 'gerente' | 'admin_empresa'

export interface AuthContext {
  empresaId: string
  usuarioId: string
  rol: Rol
}

/** `eq(tabla.empresaId, ctx.empresaId)`, combinable con `and(...)`. */
export function porEmpresa(columnaEmpresaId: Column, ctx: AuthContext) {
  return eq(columnaEmpresaId, ctx.empresaId)
}

/** Combina el filtro de empresa con condiciones adicionales. */
export function scopedWhere(columnaEmpresaId: Column, ctx: AuthContext, ...extra: Parameters<typeof and>) {
  return and(porEmpresa(columnaEmpresaId, ctx), ...extra)
}

/**
 * Segunda línea de defensa: después de traer una fila por id, confirma
 * que pertenece a la empresa del token. Si alguna consulta se armó mal y
 * devolvió una fila de otra empresa, esto corta acá en vez de filtrar el
 * dato.
 */
export function assertTenant<T extends { empresaId: string }>(
  row: T | undefined | null,
  ctx: AuthContext,
  entidad: string,
  id?: string,
): T {
  if (!row) throw new NotFoundError(entidad, id)
  if (row.empresaId !== ctx.empresaId) throw new NotFoundError(entidad, id)
  return row
}

export function requireRole(ctx: AuthContext, permitidos: Rol[]) {
  if (!permitidos.includes(ctx.rol)) {
    throw new ForbiddenError(`Esta acción requiere rol: ${permitidos.join(' o ')}.`)
  }
}
