// Operación: lo que el vendedor y el gerente escriben día a día. Hoy vive
// sólo en memoria del navegador (AgendaContext, useState de Pipeline.jsx)
// y se pierde al recargar — esto es lo que lo persiste.
import { date, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { index, uniqueIndex } from 'drizzle-orm/pg-core'
import { idColumn, timestamps } from './_shared'
import { empresa, usuario } from './tenancy'
import { cliente, lineaProducto, producto } from './comercial'

export const tipoEtapa = pgEnum('tipo_etapa', ['abierta', 'ganada', 'perdida'])

export const etapaPipeline = pgTable(
  'etapa_pipeline',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    orden: integer('orden').notNull().default(0),
    color: text('color'),
    tipo: tipoEtapa('tipo').notNull().default('abierta'),
  },
  (t) => [uniqueIndex('etapa_pipeline_empresa_codigo_unq').on(t.empresaId, t.codigo)],
)

export const oportunidad = pgTable(
  'oportunidad',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => cliente.id, { onDelete: 'cascade' }),
    vendedorId: uuid('vendedor_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    etapaId: uuid('etapa_id')
      .notNull()
      .references(() => etapaPipeline.id, { onDelete: 'restrict' }),
    valor: numeric('valor', { precision: 16, scale: 2 }).notNull(),
    fechaEstimadaCierre: date('fecha_estimada_cierre'),
    fechaCierre: date('fecha_cierre'),
    motivoPerdida: text('motivo_perdida'),
    creadaPor: uuid('creada_por').references(() => usuario.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('oportunidad_empresa_etapa_idx').on(t.empresaId, t.etapaId),
    index('oportunidad_empresa_vendedor_idx').on(t.empresaId, t.vendedorId),
  ],
)

export const oportunidadMovimiento = pgTable('oportunidad_movimiento', {
  id: idColumn(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresa.id, { onDelete: 'cascade' }),
  oportunidadId: uuid('oportunidad_id')
    .notNull()
    .references(() => oportunidad.id, { onDelete: 'cascade' }),
  etapaDesde: uuid('etapa_desde').references(() => etapaPipeline.id, { onDelete: 'set null' }),
  etapaHasta: uuid('etapa_hasta')
    .notNull()
    .references(() => etapaPipeline.id, { onDelete: 'restrict' }),
  usuarioId: uuid('usuario_id').references(() => usuario.id, { onDelete: 'set null' }),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
})

export const tipoGestion = pgEnum('tipo_gestion', ['visita', 'llamada', 'videollamada', 'email', 'whatsapp'])
export const estadoGestion = pgEnum('estado_gestion', ['pendiente', 'realizada', 'reprogramada', 'cancelada'])

export const gestion = pgTable(
  'gestion',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => cliente.id, { onDelete: 'cascade' }),
    vendedorId: uuid('vendedor_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    oportunidadId: uuid('oportunidad_id').references(() => oportunidad.id, { onDelete: 'set null' }),
    tipo: tipoGestion('tipo').notNull(),
    estado: estadoGestion('estado').notNull().default('pendiente'),
    fecha: date('fecha').notNull(),
    hora: text('hora'),
    notas: text('notas'),
    proximaGestion: date('proxima_gestion'),
    plataforma: text('plataforma'),
    enlaceReunion: text('enlace_reunion'),
    creadaPor: uuid('creada_por').references(() => usuario.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('gestion_empresa_cliente_fecha_idx').on(t.empresaId, t.clienteId, t.fecha),
    index('gestion_empresa_vendedor_fecha_idx').on(t.empresaId, t.vendedorId, t.fecha),
  ],
)

export const condicionComercial = pgTable(
  'condicion_comercial',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => cliente.id, { onDelete: 'cascade' }),
    lineaId: uuid('linea_id').references(() => lineaProducto.id, { onDelete: 'cascade' }),
    productoId: uuid('producto_id').references(() => producto.id, { onDelete: 'cascade' }),
    descuentoPct: numeric('descuento_pct', { precision: 5, scale: 2 }).notNull().default('0'),
    vigenteDesde: date('vigente_desde').notNull(),
    vigenteHasta: date('vigente_hasta'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('condicion_comercial_empresa_cliente_idx').on(t.empresaId, t.clienteId)],
)
