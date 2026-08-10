import { createHash } from 'node:crypto'

/** Hash no reversible del refresh token para guardar en sesion_refresh — nunca se guarda el token en texto plano. */
export function sha256(valor: string): string {
  return createHash('sha256').update(valor).digest('hex')
}
