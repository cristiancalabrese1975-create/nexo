// Tenencia (multi-empresa) y acceso. Toda tabla de negocio del resto del
// esquema cuelga, directa o indirectamente, de `empresa`.
import { boolean, date, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { idColumn, timestamps } from './_shared'

export const rolUsuario = pgEnum('rol_usuario', ['vendedor', 'gerente', 'admin_empresa'])

export const empresa = pgTable('empresa', {
  id: idColumn(),
  nombre: text('nombre').notNull(),
  slug: text('slug').notNull().unique(),
  cuit: text('cuit'),
  timezone: text('timezone').notNull().default('America/Argentina/Buenos_Aires'),
  moneda: text('moneda').notNull().default('ARS'),
  plan: text('plan').notNull().default('trial'),
  activa: boolean('activa').notNull().default(true),
  // Si está seteada, toda la app calcula "hoy" con esta fecha en vez de
  // now() — así la demo comercial queda congelada mientras las empresas
  // reales usan el reloj real. Ver core/periodos.ts::hoyDeLaEmpresa().
  fechaReferencia: date('fecha_referencia'),
  ...timestamps,
})

export const usuario = pgTable(
  'usuario',
  {
    id: idColumn(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresa.id, { onDelete: 'cascade' }),
    dni: text('dni').notNull(),
    passwordHash: text('password_hash').notNull(),
    nombre: text('nombre').notNull(),
    apellido: text('apellido').notNull(),
    email: text('email'),
    whatsapp: text('whatsapp'),
    linkReunion: text('link_reunion'),
    rol: rolUsuario('rol').notNull().default('vendedor'),
    activo: boolean('activo').notNull().default(true),
    ultimoLogin: timestamp('ultimo_login', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('usuario_empresa_dni_unq').on(t.empresaId, t.dni),
    // El login es sólo "DNI + clave", sin pedir empresa — por eso el DNI
    // tiene que ser único entre TODOS los usuarios activos del sistema,
    // no sólo dentro de una empresa. Si dos empresas cargan el mismo DNI
    // (coincidencia posible pero rara), la segunda carga falla con un
    // mensaje claro en vez de pisar silenciosamente el login de la otra.
    uniqueIndex('usuario_dni_activo_unq').on(t.dni).where(sql`${t.activo} = true`),
  ],
)

export const sesionRefresh = pgTable('sesion_refresh', {
  id: idColumn(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
  revocadaEn: timestamp('revocada_en', { withTimezone: true }),
  userAgent: text('user_agent'),
  ip: text('ip'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
})
