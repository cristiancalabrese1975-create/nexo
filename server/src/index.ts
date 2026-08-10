import { buildApp } from './app'
import { env } from './env'
import { closeDb } from './db/client'

async function main() {
  const app = await buildApp()

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} recibido, cerrando…`)
    await app.close()
    await closeDb()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main()
