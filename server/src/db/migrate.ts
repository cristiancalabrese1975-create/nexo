// Aplica las migraciones generadas por drizzle-kit y, a continuación, el
// SQL a mano de db/sql/ (vistas materializadas). Es el único script que
// toca el esquema de la base — nunca se corre drizzle-kit push contra
// producción.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { env } from '../env'

async function main() {
  const sql = postgres(env.DATABASE_URL, { max: 1 })
  const db = drizzle(sql)

  console.log('→ Aplicando migraciones de esquema (drizzle-kit)…')
  await migrate(db, { migrationsFolder: join(__dirname, 'migrations') })
  console.log('✔ Migraciones de esquema aplicadas.')

  const sqlDir = join(__dirname, 'sql')
  const archivos = readdirSync(sqlDir).filter((f) => f.endsWith('.sql')).sort()
  for (const archivo of archivos) {
    console.log(`→ Aplicando ${archivo}…`)
    const contenido = readFileSync(join(sqlDir, archivo), 'utf-8')
    await sql.unsafe(contenido)
  }
  console.log('✔ SQL adicional (vistas materializadas) aplicado.')

  await sql.end()
  console.log('✔ Listo.')
}

main().catch((err) => {
  console.error('❌ Falló la migración:', err)
  process.exit(1)
})
