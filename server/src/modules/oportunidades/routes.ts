import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { etapaPipeline, oportunidad, oportunidadMovimiento } from '../../db/schema'
import { NotFoundError, ValidationError } from '../../core/errors'
import { assertTenant } from '../../core/tenant'
import { registrarAuditoria } from '../../core/auditoria'
import { hoyDeLaEmpresa } from '../../core/periodos'
import { scoreOportunidad } from '../../core/scoring'
import { cargarEmpresa } from '../../core/query-helpers'
import { ultimaGestionPorCliente, diasSinContactoDesdeMapa } from '../../core/consultas-gestion'
import { actualizarOportunidadSchema, cambiarEtapaSchema, crearOportunidadSchema } from './schemas'
import { listarEtapas, listarOportunidades, oportunidadPorId, primeraEtapaAbierta, valorMaximoOportunidad } from './queries'

export async function oportunidadesRoutes(app: FastifyInstance) {
  app.get('/etapas', { preHandler: [app.authenticate] }, async (request) => {
    const etapas = await listarEtapas(db, request.authCtx.empresaId)
    return { etapas }
  })

  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const empresaRow = await cargarEmpresa(db, ctx)
    const hoy = hoyDeLaEmpresa(empresaRow)

    const [oportunidades, maxValor, ultimaGestion] = await Promise.all([
      listarOportunidades(db, ctx),
      valorMaximoOportunidad(db, ctx.empresaId),
      ultimaGestionPorCliente(db, ctx, hoy),
    ])

    const items = oportunidades.map((o) => {
      const diasSinContacto = diasSinContactoDesdeMapa(ultimaGestion, o.clienteId, hoy)
      const prioridad = scoreOportunidad({
        etapaTipo: o.etapaTipo,
        etapaCodigo: o.etapaCodigo,
        valor: Number(o.valor),
        maxValorOportunidad: maxValor,
        diasSinContacto,
        ultimaGestionFecha: ultimaGestion.get(o.clienteId) ?? null,
      })
      return { ...o, valor: Number(o.valor), prioridad }
    })

    return { hoy, items }
  })

  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const ctx = request.authCtx
    const parsed = crearOportunidadSchema.safeParse(request.body)
    if (!parsed.success) throw new ValidationError('Datos de oportunidad inválidos.', parsed.error.flatten())
    const body = parsed.data

    const vendedorId = ctx.rol === 'vendedor' ? ctx.usuarioId : (body.vendedorId ?? ctx.usuarioId)
    const etapa = body.etapaId
      ? assertTenant(await db.select().from(etapaPipeline).where(eq(etapaPipeline.id, body.etapaId)).then((r) => r[0]), ctx, 'Etapa', body.etapaId)
      : await primeraEtapaAbierta(db, ctx.empresaId)
    if (!etapa) throw new NotFoundError('Etapa inicial de pipeline (¿falta seed?)')

    const [creada] = await db
      .insert(oportunidad)
      .values({
        empresaId: ctx.empresaId,
        titulo: body.titulo,
        clienteId: body.clienteId,
        vendedorId,
        etapaId: etapa.id,
        valor: String(body.valor),
        fechaEstimadaCierre: body.fechaEstimadaCierre,
        creadaPor: ctx.usuarioId,
      })
      .returning()

    await registrarAuditoria(db, ctx, 'oportunidad', creada!.id, 'crear', body)
    reply.status(201)
    return creada
  })

  app.patch('/:id', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const { id } = request.params as { id: string }
    const parsed = actualizarOportunidadSchema.safeParse(request.body)
    if (!parsed.success) throw new ValidationError('Datos inválidos.', parsed.error.flatten())

    const actual = assertTenant(await oportunidadPorId(db, id), ctx, 'Oportunidad', id)
    if (ctx.rol === 'vendedor' && actual.vendedorId !== ctx.usuarioId) throw new NotFoundError('Oportunidad', id)

    const cambios: Record<string, unknown> = {}
    if (parsed.data.titulo !== undefined) cambios.titulo = parsed.data.titulo
    if (parsed.data.valor !== undefined) cambios.valor = String(parsed.data.valor)
    if (parsed.data.fechaEstimadaCierre !== undefined) cambios.fechaEstimadaCierre = parsed.data.fechaEstimadaCierre
    if (parsed.data.motivoPerdida !== undefined) cambios.motivoPerdida = parsed.data.motivoPerdida

    const [actualizada] = await db.update(oportunidad).set(cambios).where(eq(oportunidad.id, id)).returning()
    await registrarAuditoria(db, ctx, 'oportunidad', id, 'actualizar', cambios)
    return actualizada
  })

  app.patch('/:id/etapa', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const { id } = request.params as { id: string }
    const parsed = cambiarEtapaSchema.safeParse(request.body)
    if (!parsed.success) throw new ValidationError('Datos inválidos.', parsed.error.flatten())

    const actual = assertTenant(await oportunidadPorId(db, id), ctx, 'Oportunidad', id)
    if (ctx.rol === 'vendedor' && actual.vendedorId !== ctx.usuarioId) throw new NotFoundError('Oportunidad', id)

    const [nuevaEtapa] = await db.select().from(etapaPipeline).where(eq(etapaPipeline.id, parsed.data.etapaId)).limit(1)
    assertTenant(nuevaEtapa, ctx, 'Etapa', parsed.data.etapaId)

    const empresaRow = await cargarEmpresa(db, ctx)
    const hoy = hoyDeLaEmpresa(empresaRow)
    const esCierre = nuevaEtapa!.tipo === 'ganada' || nuevaEtapa!.tipo === 'perdida'

    const [actualizada] = await db
      .update(oportunidad)
      .set({
        etapaId: nuevaEtapa!.id,
        fechaCierre: esCierre ? hoy : null,
        motivoPerdida: nuevaEtapa!.tipo === 'perdida' ? (parsed.data.motivoPerdida ?? actual.motivoPerdida) : actual.motivoPerdida,
      })
      .where(eq(oportunidad.id, id))
      .returning()

    await db.insert(oportunidadMovimiento).values({
      empresaId: ctx.empresaId,
      oportunidadId: id,
      etapaDesde: actual.etapaId,
      etapaHasta: nuevaEtapa!.id,
      usuarioId: ctx.usuarioId,
    })
    await registrarAuditoria(db, ctx, 'oportunidad', id, 'actualizar', { etapaDesde: actual.etapaId, etapaHasta: nuevaEtapa!.id })

    return actualizada
  })
}
