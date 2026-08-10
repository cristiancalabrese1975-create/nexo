import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client'
import { usuario, empresa } from '../../db/schema'
import { UnauthorizedError, ValidationError } from '../../core/errors'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../core/tokens'
import { autenticarPorDni, crearRegistroSesion, revocarSesion, validarSesion } from './service'

const loginSchema = z.object({
  dni: z.string().min(1, 'DNI requerido'),
  clave: z.string().min(1, 'Clave requerida'),
})

const COOKIE_OPTS = {
  path: '/api/v1/auth',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) throw new ValidationError('Datos de login inválidos.', parsed.error.flatten())
    const { dni, clave } = parsed.data

    const usuarioFila = await autenticarPorDni(db, dni, clave)

    const accessToken = signAccessToken({ usuarioId: usuarioFila.id, empresaId: usuarioFila.empresaId, rol: usuarioFila.rol })

    const sid = crypto.randomUUID()
    const refreshToken = signRefreshToken({ usuarioId: usuarioFila.id, sid })
    await crearRegistroSesion(db, usuarioFila.id, refreshToken, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    })

    reply.setCookie('nexo_refresh', refreshToken, COOKIE_OPTS)
    return {
      accessToken,
      usuario: {
        id: usuarioFila.id,
        empresaId: usuarioFila.empresaId,
        dni: usuarioFila.dni,
        nombre: usuarioFila.nombre,
        apellido: usuarioFila.apellido,
        rol: usuarioFila.rol,
        whatsapp: usuarioFila.whatsapp,
      },
    }
  })

  app.post('/refresh', async (request, reply) => {
    const token = request.cookies['nexo_refresh']
    if (!token) throw new UnauthorizedError('No hay sesión activa.')

    const payload = verifyRefreshToken(token)
    await validarSesion(db, payload.sid, token)
    // Rotación: se revoca la sesión usada y se emite una nueva — si un
    // refresh token robado se reusa después de rotado, la próxima
    // validación falla porque ya está revocada.
    await revocarSesion(db, payload.sid)

    const [usuarioFila] = await db.select().from(usuario).where(eq(usuario.id, payload.usuarioId)).limit(1)
    if (!usuarioFila || !usuarioFila.activo) throw new UnauthorizedError('Usuario inactivo.')

    const accessToken = signAccessToken({ usuarioId: usuarioFila.id, empresaId: usuarioFila.empresaId, rol: usuarioFila.rol })
    const nuevoSid = crypto.randomUUID()
    const nuevoRefresh = signRefreshToken({ usuarioId: usuarioFila.id, sid: nuevoSid })
    await crearRegistroSesion(db, usuarioFila.id, nuevoRefresh, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    })

    reply.setCookie('nexo_refresh', nuevoRefresh, COOKIE_OPTS)
    return { accessToken }
  })

  app.post('/logout', async (request, reply) => {
    const token = request.cookies['nexo_refresh']
    if (token) {
      try {
        const payload = verifyRefreshToken(token)
        await revocarSesion(db, payload.sid)
      } catch {
        // token ya inválido/vencido — nada que revocar
      }
    }
    reply.clearCookie('nexo_refresh', { path: '/api/v1/auth' })
    return { ok: true }
  })

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const [usuarioFila] = await db.select().from(usuario).where(eq(usuario.id, request.authCtx.usuarioId)).limit(1)
    if (!usuarioFila) throw new UnauthorizedError()
    const [empresaFila] = await db.select().from(empresa).where(eq(empresa.id, usuarioFila.empresaId)).limit(1)
    return {
      usuario: {
        id: usuarioFila.id,
        dni: usuarioFila.dni,
        nombre: usuarioFila.nombre,
        apellido: usuarioFila.apellido,
        rol: usuarioFila.rol,
        whatsapp: usuarioFila.whatsapp,
      },
      empresa: empresaFila ? { id: empresaFila.id, nombre: empresaFila.nombre, slug: empresaFila.slug } : null,
    }
  })
}
