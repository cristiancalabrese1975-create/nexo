import type { FastifyInstance } from 'fastify'
import { randomInt } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { cliente, gestion, usuario } from '../../db/schema'
import { ValidationError } from '../../core/errors'
import { registrarAuditoria } from '../../core/auditoria'
import { crearGestionSchema } from './schemas'

function generarEnlaceReunion(plataforma: 'Zoom' | 'Teams'): string {
  const id = randomInt(100_000_000, 999_999_999)
  return plataforma === 'Teams' ? `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${id}%40thread.v2/0` : `https://zoom.us/j/${id}`
}

export async function gestionesRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const condiciones = [eq(gestion.empresaId, ctx.empresaId)]
    if (ctx.rol === 'vendedor') condiciones.push(eq(gestion.vendedorId, ctx.usuarioId))
    if (typeof query.clienteId === 'string') condiciones.push(eq(gestion.clienteId, query.clienteId))

    const items = await db
      .select({
        id: gestion.id,
        clienteId: gestion.clienteId,
        clienteNombre: cliente.razonSocial,
        vendedorId: gestion.vendedorId,
        vendedorNombre: usuario.nombre,
        tipo: gestion.tipo,
        estado: gestion.estado,
        fecha: gestion.fecha,
        hora: gestion.hora,
        notas: gestion.notas,
        proximaGestion: gestion.proximaGestion,
        plataforma: gestion.plataforma,
        enlaceReunion: gestion.enlaceReunion,
      })
      .from(gestion)
      .innerJoin(cliente, eq(cliente.id, gestion.clienteId))
      .innerJoin(usuario, eq(usuario.id, gestion.vendedorId))
      .where(and(...condiciones))
      .orderBy(desc(gestion.fecha), desc(gestion.hora))

    return { items }
  })

  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const ctx = request.authCtx
    const parsed = crearGestionSchema.safeParse(request.body)
    if (!parsed.success) throw new ValidationError('Datos de gestión inválidos.', parsed.error.flatten())
    const body = parsed.data

    const vendedorId = ctx.rol === 'vendedor' ? ctx.usuarioId : (body.vendedorId ?? ctx.usuarioId)
    const esVideollamada = body.tipo === 'videollamada'
    const plataforma = esVideollamada ? (body.plataforma ?? 'Zoom') : undefined
    const enlaceReunion = esVideollamada ? generarEnlaceReunion(plataforma!) : undefined

    const [creada] = await db
      .insert(gestion)
      .values({
        empresaId: ctx.empresaId,
        clienteId: body.clienteId,
        vendedorId,
        oportunidadId: body.oportunidadId,
        tipo: body.tipo,
        estado: body.estado,
        fecha: body.fecha,
        hora: body.hora,
        notas: body.notas?.trim(),
        proximaGestion: body.estado === 'realizada' ? body.proximaGestion : undefined,
        plataforma,
        enlaceReunion,
        creadaPor: ctx.usuarioId,
      })
      .returning()

    await registrarAuditoria(db, ctx, 'gestion', creada!.id, 'crear', body)
    reply.status(201)
    return creada
  })
}
