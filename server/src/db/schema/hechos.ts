// Hechos: lo que realmente pasó. `venta_item` es la tabla central de todo
// el sistema — una fila por línea de venta, mismo grano que pide
// Nexo_Historial_de_Ventas.xlsx. Todas las series, rankings y ABC que en
// la demo eran arrays generados por fórmula (ventasClientesPorPeriodo,
// ventasLineasPorPeriodo, ventasSkuPorPeriodo, resumenPorPeriodo,
// unidadesPorPeriodo, distribuciones diarias...) se derivan de acá con
// GROUP BY. No se guarda nada que se pueda calcular.
import { bigserial, date, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { index } from 'drizzle-orm/pg-core'
import { idColumn } from './_shared'
import { empresa, usuario } from './tenancy'
import { cliente, lineaProducto, producto } from './comercial'
import { importacion } from './infra'

export const origenVenta = pgEnum('origen_venta', ['import', 'api', 'manual'])

export const ventaItem = pgTable(
  'venta_item',
  {
    // bigserial: es la tabla de mayor volumen del sistema (una fila por
    // renglón de factura); un contador entero simple pesa y ordena mejor
    // que un uuid acá. No se referencia desde ningún lado como FK externa.
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    fecha: date('fecha').notNull(),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => cliente.id, { onDelete: 'restrict' }),
    vendedorId: uuid('vendedor_id').references(() => usuario.id, { onDelete: 'set null' }),
    lineaId: uuid('linea_id')
      .notNull()
      .references(() => lineaProducto.id, { onDelete: 'restrict' }),
    productoId: uuid('producto_id').references(() => producto.id, { onDelete: 'set null' }),
    cantidad: numeric('cantidad', { precision: 14, scale: 3 }).notNull(),
    monto: numeric('monto', { precision: 16, scale: 2 }).notNull(),
    comprobanteNumero: text('comprobante_numero'),
    importacionId: uuid('importacion_id').references(() => importacion.id, { onDelete: 'set null' }),
    origen: origenVenta('origen').notNull().default('manual'),
    // Hash determinístico de (empresa, fecha, cliente, línea, producto,
    // comprobante, cantidad, monto) calculado al importar — reimportar el
    // mismo archivo (o una fila repetida en dos importaciones distintas)
    // no duplica la venta. Ver server/src/modules/importaciones.
    hashFila: text('hash_fila').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('venta_item_empresa_hash_unq').on(t.empresaId, t.hashFila),
    index('venta_item_empresa_fecha_idx').on(t.empresaId, t.fecha),
    index('venta_item_empresa_cliente_fecha_idx').on(t.empresaId, t.clienteId, t.fecha),
    index('venta_item_empresa_linea_fecha_idx').on(t.empresaId, t.lineaId, t.fecha),
    index('venta_item_empresa_producto_fecha_idx').on(t.empresaId, t.productoId, t.fecha),
    index('venta_item_empresa_vendedor_fecha_idx').on(t.empresaId, t.vendedorId, t.fecha),
  ],
)

export const ambitoObjetivo = pgEnum('ambito_objetivo', ['empresa', 'linea', 'vendedor', 'cliente'])

export const objetivo = pgTable(
  'objetivo',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    // Siempre el día 1 del mes — el "período" de toda la app es mensual.
    periodo: date('periodo').notNull(),
    ambito: ambitoObjetivo('ambito').notNull(),
    lineaId: uuid('linea_id').references(() => lineaProducto.id, { onDelete: 'cascade' }),
    vendedorId: uuid('vendedor_id').references(() => usuario.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id').references(() => cliente.id, { onDelete: 'cascade' }),
    monto: numeric('monto', { precision: 16, scale: 2 }).notNull(),
    unidades: numeric('unidades', { precision: 14, scale: 3 }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Nota: Postgres trata NULL <> NULL, así que este índice no impide dos
    // filas 'empresa' (linea/vendedor/cliente null) para el mismo período.
    // La unicidad real para ese caso la garantiza la capa de aplicación
    // (upsert por ámbito en modules/objetivos). Ver core/tenant.ts.
    uniqueIndex('objetivo_empresa_periodo_ambito_unq').on(
      t.empresaId,
      t.periodo,
      t.ambito,
      t.lineaId,
      t.vendedorId,
      t.clienteId,
    ),
    index('objetivo_empresa_periodo_idx').on(t.empresaId, t.periodo),
  ],
)

export const tipoComprobante = pgEnum('tipo_comprobante', ['factura', 'nota_debito', 'nota_credito', 'recibo'])

export const comprobanteCC = pgTable(
  'comprobante_cc',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => cliente.id, { onDelete: 'restrict' }),
    numero: text('numero').notNull(),
    tipo: tipoComprobante('tipo').notNull(),
    fechaEmision: date('fecha_emision').notNull(),
    fechaVencimiento: date('fecha_vencimiento'),
    importe: numeric('importe', { precision: 16, scale: 2 }).notNull(),
    saldo: numeric('saldo', { precision: 16, scale: 2 }).notNull(),
    moneda: text('moneda').notNull().default('ARS'),
    importacionId: uuid('importacion_id').references(() => importacion.id, { onDelete: 'set null' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('comprobante_cc_empresa_numero_unq').on(t.empresaId, t.numero),
    index('comprobante_cc_empresa_cliente_idx').on(t.empresaId, t.clienteId),
  ],
)

export const indiceInflacion = pgTable(
  'indice_inflacion',
  {
    id: idColumn(),
    // Nullable = índice global (ej. INDEC), compartido por todas las
    // empresas que no cargan el suyo propio.
    empresaId: uuid('empresa_id').references(() => empresa.id, { onDelete: 'cascade' }),
    periodo: date('periodo').notNull(),
    valorPct: numeric('valor_pct', { precision: 6, scale: 3 }).notNull(),
    fuente: text('fuente'),
  },
  (t) => [index('indice_inflacion_empresa_periodo_idx').on(t.empresaId, t.periodo)],
)
