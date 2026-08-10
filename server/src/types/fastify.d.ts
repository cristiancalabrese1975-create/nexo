import type { AuthContext, Rol } from '../core/tenant'

declare module 'fastify' {
  interface FastifyRequest {
    authCtx: AuthContext
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (roles: Rol[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
