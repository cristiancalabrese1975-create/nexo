// Validación de variables de entorno. Si falta o está mal alguna, el
// servidor no arranca — mejor fallar acá que a mitad de un request.
import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgres', {
    message: 'DATABASE_URL debe ser una cadena de conexión de Postgres (postgres:// o postgresql://)',
  }),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  IMPORT_MAX_FILE_SIZE: z.coerce.number().int().positive().default(10 * 1024 * 1024),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas o faltantes:')
  console.error(parsed.error.flatten().fieldErrors)
  console.error('\nRevisá server/.env.example y creá un server/.env con esos valores.')
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
