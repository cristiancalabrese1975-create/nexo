import Fastify from 'fastify'
import { env } from './env'
import { registerPlugins } from './plugins'
import { authRoutes } from './modules/auth/routes'
import { resumenRoutes } from './modules/resumen/routes'
import { clientesRoutes } from './modules/clientes/routes'
import { lineasRoutes } from './modules/lineas/routes'
import { productosRoutes } from './modules/productos/routes'
import { cobranzasRoutes } from './modules/cobranzas/routes'
import { descuentosRoutes } from './modules/descuentos/routes'
import { faroRoutes } from './modules/faro/routes'
import { gerencialRoutes } from './modules/gerencial/routes'
import { oportunidadesRoutes } from './modules/oportunidades/routes'
import { gestionesRoutes } from './modules/gestiones/routes'
import { agendaRoutes } from './modules/gestiones/agenda-routes'
import { importacionesRoutes } from './modules/importaciones/routes'

export async function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
        : true,
  })

  await registerPlugins(app)

  app.get('/health', async () => ({ ok: true, env: env.NODE_ENV }))

  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' })
      await api.register(resumenRoutes, { prefix: '/resumen' })
      await api.register(clientesRoutes, { prefix: '/clientes' })
      await api.register(lineasRoutes, { prefix: '/lineas' })
      await api.register(productosRoutes, { prefix: '/productos' })
      await api.register(cobranzasRoutes, { prefix: '/cobranzas' })
      await api.register(descuentosRoutes, { prefix: '/descuentos' })
      await api.register(faroRoutes, { prefix: '/faro' })
      await api.register(gerencialRoutes, { prefix: '/gerencial' })
      await api.register(oportunidadesRoutes, { prefix: '/oportunidades' })
      await api.register(gestionesRoutes, { prefix: '/gestiones' })
      await api.register(agendaRoutes, { prefix: '/agenda' })
      await api.register(importacionesRoutes, { prefix: '/importaciones' })
    },
    { prefix: '/api/v1' },
  )

  return app
}
