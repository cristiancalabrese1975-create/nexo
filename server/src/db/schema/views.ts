// Forma de columnas de `mv_venta_mensual` (creada a mano en
// db/sql/001_materialized_views.sql) para poder consultarla con la misma
// API tipada de Drizzle. A propósito NO se re-exporta desde
// schema/index.ts: ese archivo es lo que lee drizzle-kit para generar
// migraciones, y una vista materializada no se gestiona como tabla.
import { date, numeric, pgTable, uuid } from 'drizzle-orm/pg-core'

export const mvVentaMensual = pgTable('mv_venta_mensual', {
  empresaId: uuid('empresa_id').notNull(),
  periodo: date('periodo').notNull(),
  clienteId: uuid('cliente_id').notNull(),
  vendedorId: uuid('vendedor_id'),
  lineaId: uuid('linea_id').notNull(),
  productoId: uuid('producto_id'),
  monto: numeric('monto', { precision: 16, scale: 2 }).notNull(),
  unidades: numeric('unidades', { precision: 14, scale: 3 }).notNull(),
})
