// Firma/verificación de JWT — reemplaza el mecanismo namespaced de
// @fastify/jwt (su magia de tipos genéricos para nombres de método
// personalizados no vale la fricción acá) por dos pares de funciones
// simples y explícitas sobre `jsonwebtoken`.
import jwt from 'jsonwebtoken'
import { env } from '../env'
import { UnauthorizedError } from './errors'
import type { Rol } from './tenant'

export interface AccessTokenPayload {
  usuarioId: string
  empresaId: string
  rol: Rol
}

export interface RefreshTokenPayload {
  usuarioId: string
  sid: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessTokenPayload
  } catch {
    throw new UnauthorizedError('Token de acceso inválido o vencido.')
  }
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'] })
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as unknown as RefreshTokenPayload
  } catch {
    throw new UnauthorizedError('Sesión inválida o vencida.')
  }
}
