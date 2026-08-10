import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import * as schema from './schema'

// Un único pool de conexión para todo el proceso. `max` bajo porque el
// hosting inicial (Railway/Render free-tier) y Neon limitan conexiones
// concurrentes; Neon además pool-ea del lado del servidor.
const queryClient = postgres(env.DATABASE_URL, { max: 10 })

export const db = drizzle(queryClient, { schema })
export type Database = typeof db

export async function closeDb() {
  await queryClient.end({ timeout: 5 })
}
