import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError, UnauthorizedError } from '../core/errors'
import { verifyAccessToken } from '../core/tokens'
import type { Rol } from '../core/tenant'

/**
 * Decora `fastify.authenticate` (preHandler que exige un access token
 * válido en el header Authorization y llena `request.authCtx`) y
 * `fastify.requireRole([...])` (preHandler factory para rutas
 * restringidas por rol). Se usan así:
 *
 *   app.get('/ruta', { preHandler: [app.authenticate] }, handler)
 *   app.get('/solo-gerente', { preHandler: [app.authenticate, app.requireRole(['gerente'])] }, handler)
 */
export default fp(async function authenticatePlugin(app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Falta el token de acceso.')
    const payload = verifyAccessToken(header.slice('Bearer '.length))
    request.authCtx = { empresaId: payload.empresaId, usuarioId: payload.usuarioId, rol: payload.rol }
  })

  app.decorate('requireRole', (roles: Rol[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      if (!roles.includes(request.authCtx.rol)) {
        throw new ForbiddenError(`Esta acción requiere rol: ${roles.join(' o ')}.`)
      }
    }
  })
})
