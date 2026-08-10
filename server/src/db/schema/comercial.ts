// Maestros comerciales: qué categorías, direcciones, líneas, productos y
// clientes maneja cada empresa. Todo lo que en la demo estaba hardcodeado
// (Mayorista/Distribuidor/Minorista, DIR BSAS/INT, las 11 líneas...) pasa
// a ser dato cargable por empresa.
import { boolean, numeric, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { integer } from 'drizzle-orm/pg-core'
import { idColumn, timestamps } from './_shared'
import { empresa, usuario } from './tenancy'

export const categoriaCliente = pgTable(
  'categoria_cliente',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    orden: integer('orden').notNull().default(0),
  },
  (t) => [uniqueIndex('categoria_cliente_empresa_nombre_unq').on(t.empresaId, t.nombre)],
)

export const direccionComercial = pgTable(
  'direccion_comercial',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
  },
  (t) => [uniqueIndex('direccion_comercial_empresa_nombre_unq').on(t.empresaId, t.nombre)],
)

export const lineaProducto = pgTable(
  'linea_producto',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    direccionId: uuid('direccion_id').references(() => direccionComercial.id, { onDelete: 'set null' }),
    activa: boolean('activa').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('linea_producto_empresa_codigo_unq').on(t.empresaId, t.codigo)],
)

export const producto = pgTable(
  'producto',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    lineaId: uuid('linea_id')
      .notNull()
      .references(() => lineaProducto.id, { onDelete: 'cascade' }),
    precioLista: numeric('precio_lista', { precision: 14, scale: 2 }),
    unidadMedida: text('unidad_medida').notNull().default('unidad'),
    activo: boolean('activo').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('producto_empresa_codigo_unq').on(t.empresaId, t.codigo)],
)

export const cliente = pgTable(
  'cliente',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    codigo: text('codigo').notNull(),
    razonSocial: text('razon_social').notNull(),
    cuit: text('cuit'),
    categoriaId: uuid('categoria_id').references(() => categoriaCliente.id, { onDelete: 'set null' }),
    vendedorId: uuid('vendedor_id').references(() => usuario.id, { onDelete: 'set null' }),
    email: text('email'),
    telefono: text('telefono'),
    direccion: text('direccion'),
    activo: boolean('activo').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('cliente_empresa_codigo_unq').on(t.empresaId, t.codigo)],
)
