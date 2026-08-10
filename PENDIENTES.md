# CRM 3.0 — Checklist del proyecto

_Última actualización: 2026-08-07_

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

---

## ⬜ Pendiente

### 🚀 Infraestructura / Deploy
- [ ] Hospedar en un hosting real (Vercel/Netlify/VPS) — hoy sólo corre en esta PC.
- [ ] Backend + base de datos real. **Hoy no existe backend**: todos los datos (ventas, clientes, cobranzas, agenda) son generados por fórmulas en el frontend al cargar la página.
- [ ] Persistencia de lo que carga el vendedor: hoy las gestiones nuevas y las videollamadas agendadas **se pierden al recargar la página** (no hay dónde guardarlas todavía).
- [ ] Comprar un dominio propio.
- [ ] Definir estrategia de backup una vez que haya base de datos real.

### 🔌 Integraciones reales (hoy simuladas)
- [ ] Zoom/Teams real: hoy el enlace es generado al azar y no crea una reunión real ni le llega nada al cliente. Falta conectar la API oficial de cada plataforma (requiere cuenta/credenciales de desarrollador) + envío de invitación real (email o WhatsApp).
- [ ] Notificaciones reales de "a gestionar hoy" fuera de la app (push al celular o email) — hoy sólo se ve dentro de la app.
- [ ] Login real: hoy el DNI/clave está escrito en el propio código (visible en el navegador) — sirve para la demo, pero no es seguro para producción. Hay que migrar a autenticación real (backend + contraseñas hasheadas, o un proveedor como Auth0/Firebase).
- [ ] Conexión con los datos reales de la empresa (ERP, planilla de ventas, sistema de facturación) en vez de los datos de ejemplo.
- [ ] Envío de reportes por email (ej. resumen semanal al gerente).

### ⚖️ Legal / Negocio
- [ ] Términos y condiciones y política de privacidad (la app maneja datos de clientes y vendedores).
- [ ] Definir el modelo de precios/licencia para vender el CRM a otras empresas (por vendedor, por empresa, mensual/anual).
- [ ] Definir figura legal para facturar el servicio.
- [ ] Pensar **multi-empresa**: hoy todos los datos son de una sola empresa ficticia. Si se vende a varias empresas, cada una necesita sus datos completamente aislados.

### 🧩 Producto / Funcionalidades
- [ ] Exportar reportes a Excel/PDF.
- [ ] Historial de auditoría (quién cambió qué y cuándo).
- [ ] Permisos más finos (hoy sólo hay 2 roles: Vendedor y Gerente).
- [ ] Carga de archivos/fotos desde la Agenda (ej. foto de la visita, comprobante firmado).
- [ ] App instalable en el celular (PWA) para que el vendedor la use en la calle sin depender del navegador.
- [ ] Piloto con una empresa real antes de salir a vender a más clientes.

---

## Cómo lo uso
Cada vez que resolvemos algo de esta lista, lo paso a "✅ Ya construido". Si surge una idea nueva que no encaramos en el momento, la agrego acá para no perderla.
