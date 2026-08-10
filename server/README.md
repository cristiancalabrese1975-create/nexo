# Nexo — Backend

API, base de datos y lógica de negocio de Nexo. Node 24 + TypeScript + Fastify 5 + Drizzle ORM + PostgreSQL, multi-empresa desde el modelo de datos.

Ver el plan completo de arquitectura en `[.claude/plans]` del repo (o pedirle a Claude "mostrame el plan de backend"). Resumen rápido para levantarlo:

## 1. Base de datos

No hay Postgres instalado en esta máquina (sin Docker). La forma más simple es [Neon](https://neon.tech) (plan free, sin tarjeta):

1. Crear una cuenta y un proyecto en neon.tech.
2. Copiar la cadena de conexión (botón "Connection string").

También sirve cualquier otro Postgres 14+ (Railway, Render, RDS, una instalación local si más adelante se instala Docker/Postgres).

## 2. Variables de entorno

```bash
cp server/.env.example server/.env
```

Completar `DATABASE_URL` con la cadena de Neon (u otra), y generar los dos secretos de JWT:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

(correr dos veces, uno para `JWT_ACCESS_SECRET` y otro para `JWT_REFRESH_SECRET`).

## 3. Instalar, migrar y sembrar

```bash
cd server
npm install
npm run db:migrate   # crea las 20 tablas + la vista materializada mv_venta_mensual
npm run seed          # carga la empresa demo (misma data que la demo visual, ahora persistida)
```

El seed imprime al final los DNI/clave de prueba (vendedor y gerente) — son los mismos que ya se ven en la pantalla de Login.

## 4. Levantar el servidor

```bash
npm run dev      # tsx watch, puerto 4000 por defecto
```

`GET http://localhost:4000/health` debería devolver `{ ok: true }`.

## 5. Conectar el frontend

En la raíz del proyecto (no en `server/`), crear `.env` con:

```
VITE_API_URL=http://localhost:4000/api/v1
```

y correr `npm run dev` como siempre. Con el backend arriba, el Login ya autentica contra la base de datos real.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga automática |
| `npm run build` / `npm start` | Build de producción + arranque |
| `npm run db:generate` | Genera una migración nueva a partir de cambios en `src/db/schema/` |
| `npm run db:migrate` | Aplica migraciones pendientes + el SQL de vistas materializadas |
| `npm run db:studio` | Explorador visual de la base (Drizzle Studio) |
| `npm run seed` | Carga los datos de demo |
| `npm run typecheck` | `tsc --noEmit` |

## Qué falta para producción

- **Deploy**: Railway o Render para la API, Neon ya sirve como base productiva. Ver `PENDIENTES.md` en la raíz.
- **RLS de Postgres** como segunda capa de aislamiento multi-empresa (hoy el aislamiento es a nivel de aplicación vía `core/tenant.ts`, ya cubre todos los módulos, pero RLS es defensa en profundidad).
- **Objetivo por cliente** (`ambito='cliente'` en la tabla `objetivo`) no tiene endpoint todavía — la columna existe, el módulo no la usa aún.
- **Envío de emails/WhatsApp reales** para invitaciones de videollamada — hoy, igual que en la demo, el enlace se genera pero no se envía nada.
