import type { FastifyInstance } from 'fastify'
import { AppError } from '../core/errors'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((rawErr, request, reply) => {
    if (rawErr instanceof AppError) {
      reply.status(rawErr.statusCode).send({ error: rawErr.code, message: rawErr.message })
      return
    }

    const err = rawErr as Error & { statusCode?: number; validation?: unknown }

    // Errores de validación de esquema de Fastify (JSON schema de rutas).
    if (err.validation) {
      reply.status(400).send({ error: 'validation_error', message: err.message, detalles: err.validation })
      return
    }

    request.log.error(err)
    reply.status(err.statusCode ?? 500).send({
      error: 'internal_error',
      message: 'Ocurrió un error inesperado. Ya quedó registrado.',
    })
  })

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: 'not_found', message: `Ruta no encontrada: ${request.method} ${request.url}` })
  })
}
