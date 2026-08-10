// Infraestructura de datos: qué se importó, qué falló al importar, y
// quién cambió qué. Sin esto, "el Excel falló" es inaccionable para el
// cliente y no hay forma de auditar cambios.
import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { idColumn } from './_shared'
import { empresa, usuario } from './tenancy'

export const tipoImportacion = pgEnum('tipo_importacion', [
  'ventas',
  'vendedores',
  'clientes',
  'cuenta_corriente',
  'objetivos',
])

export const estadoImportacion = pgEnum('estado_importacion', [
  'pendiente',
  'procesando',
  'completada',
  'completada_con_errores',
  'fallida',
])

export const accionAuditoria = pgEnum('accion_auditoria', ['crear', 'actualizar', 'eliminar'])

export const importacion = pgTable('importacion', {
  id: idColumn(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresa.id, { onDelete: 'cascade' }),
  tipo: tipoImportacion('tipo').notNull(),
  archivoNombre: text('archivo_nombre').notNull(),
  archivoHash: text('archivo_hash').notNull(),
  estado: estadoImportacion('estado').notNull().default('pendiente'),
  filasTotal: integer('filas_total').notNull().default(0),
  filasOk: integer('filas_ok').notNull().default(0),
  filasError: integer('filas_error').notNull().default(0),
  usuarioId: uuid('usuario_id').references(() => usuario.id, { onDelete: 'set null' }),
  iniciadaEn: timestamp('iniciada_en', { withTimezone: true }).notNull().defaultNow(),
  finalizadaEn: timestamp('finalizada_en', { withTimezone: true }),
})

export const importacionError = pgTable('importacion_error', {
  id: idColumn(),
  importacionId: uuid('importacion_id')
    .notNull()
    .references(() => importacion.id, { onDelete: 'cascade' }),
  fila: integer('fila').notNull(),
  columna: text('columna'),
  valor: text('valor'),
  mensaje: text('mensaje').notNull(),
})

export const auditoria = pgTable('auditoria', {
  id: idColumn(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresa.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id').references(() => usuario.id, { onDelete: 'set null' }),
  entidad: text('entidad').notNull(),
  entidadId: text('entidad_id').notNull(),
  accion: accionAuditoria('accion').notNull(),
  cambios: jsonb('cambios'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
})
