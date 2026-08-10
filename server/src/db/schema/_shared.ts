// Helpers compartidos por todas las tablas: PK uuid v7 (ordenable por
// tiempo, a diferencia de uuid v4) y columnas de auditoría de fila.
import { timestamp, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

export const idColumn = () => uuid('id').primaryKey().$defaultFn(() => uuidv7())

export const timestamps = {
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
}
