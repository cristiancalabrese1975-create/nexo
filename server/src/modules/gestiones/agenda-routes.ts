import type { FastifyInstance } from 'fastify'
import { db } from '../../db/client'
import { cargarEmpresa } from '../../core/query-helpers'
import { hoyDeLaEmpresa } from '../../core/periodos'
import { clientesAGestionarHoy } from '../../core/consultas-gestion'

export async function agendaRoutes(app: FastifyInstance) {
  app.get('/a-gestionar-hoy', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const empresaRow = await cargarEmpresa(db, ctx)
    const hoy = hoyDeLaEmpresa(empresaRow)
    const items = await clientesAGestionarHoy(db, ctx, hoy)
    return { hoy, items }
  })
}
