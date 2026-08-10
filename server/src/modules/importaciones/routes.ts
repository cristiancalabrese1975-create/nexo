import type { FastifyInstance } from 'fastify'
import ExcelJS from 'exceljs'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { importacion, importacionError } from '../../db/schema'
import { ValidationError } from '../../core/errors'
import { assertTenant } from '../../core/tenant'
import { sha256 } from '../../core/crypto'
import { refrescarVentaMensual } from '../../core/refrescarVentaMensual'
import { procesarVentas } from './procesar-ventas'
import { procesarVendedores } from './procesar-vendedores'

const TIPOS_SOPORTADOS = new Set(['ventas', 'vendedores'])

export async function importacionesRoutes(app: FastifyInstance) {
  const soloAdmin = [app.authenticate, app.requireRole(['gerente', 'admin_empresa'])]

  app.get('/', { preHandler: soloAdmin }, async (request) => {
    const ctx = request.authCtx
    const items = await db
      .select()
      .from(importacion)
      .where(eq(importacion.empresaId, ctx.empresaId))
      .orderBy(desc(importacion.iniciadaEn))
    return { items }
  })

  app.get('/:id', { preHandler: soloAdmin }, async (request) => {
    const ctx = request.authCtx
    const { id } = request.params as { id: string }
    const [fila] = await db.select().from(importacion).where(eq(importacion.id, id)).limit(1)
    assertTenant(fila, ctx, 'Importación', id)
    const errores = await db.select().from(importacionError).where(eq(importacionError.importacionId, id))
    return { importacion: fila, errores }
  })

  app.post('/', { preHandler: soloAdmin }, async (request, reply) => {
    const ctx = request.authCtx
    let tipo: string | undefined
    let archivoNombre: string | undefined
    let buffer: Buffer | undefined

    for await (const part of request.parts()) {
      if (part.type === 'field' && part.fieldname === 'tipo') tipo = String(part.value)
      if (part.type === 'file' && part.fieldname === 'archivo') {
        archivoNombre = part.filename
        buffer = await part.toBuffer()
      }
    }

    if (!tipo || !TIPOS_SOPORTADOS.has(tipo)) {
      throw new ValidationError(`Tipo de importación inválido o no soportado. Usar: ${[...TIPOS_SOPORTADOS].join(', ')}.`)
    }
    if (!buffer || !archivoNombre) throw new ValidationError('Falta el archivo .xlsx (campo "archivo").')

    const archivoHash = sha256(buffer.toString('base64'))

    const [importacionFila] = await db
      .insert(importacion)
      .values({
        empresaId: ctx.empresaId,
        tipo: tipo as 'ventas' | 'vendedores',
        archivoNombre,
        archivoHash,
        estado: 'procesando',
        usuarioId: ctx.usuarioId,
      })
      .returning()
    const importacionId = importacionFila!.id

    const workbook = new ExcelJS.Workbook()
    try {
      // exceljs declara su propio tipo Buffer (no importado de 'node:buffer'),
      // por eso el cast: en runtime es un Buffer de Node normal.
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
    } catch {
      await db
        .update(importacion)
        .set({ estado: 'fallida', finalizadaEn: new Date() })
        .where(eq(importacion.id, importacionId))
      throw new ValidationError('El archivo no es un .xlsx válido.')
    }
    const worksheet = workbook.worksheets[0]
    if (!worksheet) throw new ValidationError('El archivo no tiene ninguna hoja.')

    const resultado =
      tipo === 'ventas'
        ? await procesarVentas(db, ctx.empresaId, importacionId, worksheet)
        : await procesarVendedores(db, ctx.empresaId, worksheet)

    if (resultado.errores.length > 0) {
      await db.insert(importacionError).values(
        resultado.errores.map((e) => ({ importacionId, fila: e.fila, columna: e.columna, valor: e.valor, mensaje: e.mensaje })),
      )
    }

    const filasError = resultado.errores.length
    const estado = filasError === 0 ? 'completada' : resultado.filasOk > 0 ? 'completada_con_errores' : 'fallida'

    await db
      .update(importacion)
      .set({
        estado,
        filasTotal: resultado.filasTotal,
        filasOk: resultado.filasOk,
        filasError,
        finalizadaEn: new Date(),
      })
      .where(eq(importacion.id, importacionId))

    if (tipo === 'ventas' && resultado.filasOk > 0) {
      await refrescarVentaMensual(db)
    }

    reply.status(201)
    return {
      importacionId,
      estado,
      filasTotal: resultado.filasTotal,
      filasOk: resultado.filasOk,
      filasError,
      errores: resultado.errores.slice(0, 50), // primeros 50 en la respuesta; el resto vía GET /:id
      credenciales: 'credenciales' in resultado ? resultado.credenciales : undefined,
    }
  })
}
