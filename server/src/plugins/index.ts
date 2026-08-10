import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import multipart from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'
import { env } from '../env'
import authenticatePlugin from './authenticate'
import { registerErrorHandler } from './errorHandler'

export async function registerPlugins(app: FastifyInstance) {
  await app.register(sensible)
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true })
  await app.register(cookie)
  await app.register(multipart, { limits: { fileSize: env.IMPORT_MAX_FILE_SIZE } })
  await app.register(authenticatePlugin)
  registerErrorHandler(app)
}
