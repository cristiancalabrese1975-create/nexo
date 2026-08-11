# CRM 3.0 — Checklist del proyecto

_Última actualización: 2026-08-11_

Este archivo se actualiza cada vez que resolvemos o agregamos un pendiente. Es el lugar para ver de un vistazo qué falta antes de que esto sea un producto en producción, vendible a empresas reales.

---

## ✅ Ya construido y probado

- Demo visual completa (React + Vite + Tailwind), responsive para notebook, tablet y celular.
- Login por DNI + clave con dos roles: Vendedor y Gerente (accesos de demo visibles en la pantalla de login).
- **Resumen**: venta vs. objetivo, avance %, proyección, gráfico mensual, avance por línea, índice de venta real vs. inflación estimada.
- **Pipeline de ventas**: tablero Kanban (Prospecto → Ganado/Perdido) con drag & drop entre etapas.
- **Agenda del vendedor**: registro de visitas/llamadas/videollamadas, próxima gestión, aviso de "clientes a gestionar hoy" (vencidos en rojo, del día en ámbar) visible también como badge en la campana del Topbar.
- **Videollamadas (Zoom/Teams)** desde la Agenda: genera un enlace y una confirmación — hoy simulado, ver pendientes.
- **Clientes**: cartera con series mensuales reales (nombres de mes, no "mes -1/-2"), vista diaria, tendencia con mini-gráfico rojo/verde, índice de clientes en mejora ajustado por inflación, incremento interanual en pesos.
- **Líneas de producto**: mismo patrón que Clientes (mensual/diario, tendencia).
- **Cobranzas**: comprobantes con antigüedad, análisis de mora con umbral configurable (5 en 5 días), KPIs de vencido dinámicos, drill-down de clientes en mora.
- **Descuentos**: condiciones comerciales vigentes según el período elegido.
- **Resumen Gerencial** (solo rol Gerente): ranking venta vs. objetivo, torta de distribución del equipo, gestiones pendientes por vendedor, drill-down de cartera por vendedor.
- Filtro global de período (año/mes o año completo) aplicado a toda la app.
- Toggle global Pesos $ / Unidades.
- Ordenamiento (mayor a menor) en todas las tablas de datos.
- **Backend real** (`server/`): Node + TypeScript + Fastify + Drizzle + PostgreSQL, **multi-empresa desde el modelo de datos** (toda tabla de negocio aislada por `empresa_id`). Incluye: 20 tablas + vista materializada de venta mensual, login por DNI con contraseñas hasheadas (argon2) + JWT de acceso/refresh reales, permisos por rol (vendedor/gerente/admin), scoring de oportunidades y de desvío de cliente, clasificación ABC, importador de Excel contra las plantillas `Nexo_Historial_de_Ventas.xlsx` / `Nexo_Alta_de_Vendedores.xlsx` (con detección de duplicados y reporte de errores fila por fila), y un seed que carga la misma demo comercial ya persistida. Ver `server/README.md` para levantarlo (necesita una base Postgres — Neon recomendado, no hay Docker instalado en esta PC).
- **Login real**: el DNI/clave ya no vive en el bundle del frontend — autentica contra la base de datos con la clave hasheada.
- **Las 11 pantallas conectadas al backend real — `src/data/mockData.js` ya no existe.** Dashboard, Clientes, Líneas, SKUs, Cobranzas, Descuentos, Faro, Resumen Gerencial, Pipeline, Agenda y Calendario consumen la API real. Las gestiones que carga el vendedor y los movimientos de etapa del Kanban **no se pierden al recargar** — se guardan de verdad. Verificado en el navegador con datos reales, como Vendedor (cartera propia) y como Gerente (todo desbloqueado).

---

## ⬜ Pendiente

### 🚀 Infraestructura / Deploy
- [ ] Hospedar el backend en un hosting real (Railway/Render) y el frontend (Vercel/Netlify) — hoy sólo corren en esta PC. El código ya está listo para ese deploy, sólo falta crear las cuentas y conectar.
- [ ] Provisionar la base de datos real en Neon (o similar) — el esquema y las migraciones están listos, falta crear la cuenta y correr `npm run db:migrate` + `npm run seed` contra una base real (no se pudo verificar en este entorno por no tener acceso a Postgres).
- [ ] Comprar un dominio propio.
- [ ] Definir estrategia de backup una vez que la base esté en producción.

### 🔌 Integraciones reales (hoy simuladas)
- [ ] Zoom/Teams real: hoy el enlace lo sigue generando el propio servidor de forma simulada, no crea una reunión real. Falta conectar la API oficial de cada plataforma (requiere cuenta/credenciales de desarrollador) + envío de invitación real (email o WhatsApp).
- [ ] Notificaciones reales de "a gestionar hoy" fuera de la app (push al celular o email) — hoy sólo se ve dentro de la app.
- [ ] Conexión con los datos reales de la empresa (ERP, planilla de ventas, sistema de facturación) — el importador de Excel ya cubre el caso manual (planillas `Nexo_*.xlsx`); una integración directa con el sistema del cliente es el siguiente escalón.
- [ ] Envío de reportes por email (ej. resumen semanal al gerente).

### ⚖️ Legal / Negocio
- [ ] Términos y condiciones y política de privacidad (la app maneja datos de clientes y vendedores).
- [ ] Definir el modelo de precios/licencia para vender el CRM a otras empresas (por vendedor, por empresa, mensual/anual).
- [ ] Definir figura legal para facturar el servicio.

### 🧩 Producto / Funcionalidades
- [ ] Exportar reportes a Excel/PDF.
- [ ] Historial de auditoría: el backend ya registra quién cambió qué y cuándo (tabla `auditoria`, se completa en cada alta/baja/cambio de etapa) — falta una pantalla en el frontend para consultarlo.
- [ ] Permisos más finos (hoy el backend ya soporta 3 roles — vendedor/gerente/admin_empresa — falta exponer un ABM de usuarios en el frontend).
- [ ] Carga de archivos/fotos desde la Agenda (ej. foto de la visita, comprobante firmado).
- [ ] App instalable en el celular (PWA) para que el vendedor la use en la calle sin depender del navegador.
- [ ] Piloto con una empresa real antes de salir a vender a más clientes.

### 📝 Notas de la migración a datos reales
- **Alcance de cada vendedor, por pantalla**: Clientes, Líneas y SKUs muestran toda la cartera de la empresa a cualquier usuario (mismo comportamiento que tenía la demo original — no filtran por vendedor). Agenda, Faro, Cobranzas y Descuentos sí acotan al vendedor logueado a su propia cartera (una mejora real de seguridad agregada en esta migración, más allá de lo que hacía la demo). Si en algún momento se quiere que Clientes/Líneas/SKUs también respeten el vendedor, es un cambio acotado en `server/src/modules/reportes`.
- El KPI "A cuenta" de Cobranzas da $0 porque el seed no carga comprobantes tipo `recibo` todavía (sólo facturas) — no es un bug, falta ese dato de ejemplo.
- El "Datos al [fecha]" del Topbar hoy muestra la fecha de referencia de la empresa (no hay ninguna importación real corrida todavía) — en cuanto se use el importador de Excel, se puede cambiar para mostrar la fecha de la última importación exitosa.

---

## Cómo lo uso
Cada vez que resolvemos algo de esta lista, lo paso a "✅ Ya construido". Si surge una idea nueva que no encaramos en el momento, la agrego acá para no perderla.
