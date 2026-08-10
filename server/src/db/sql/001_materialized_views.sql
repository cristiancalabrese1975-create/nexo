-- Vista materializada de venta mensual. El Dashboard, los rankings ABC y
-- el Resumen Gerencial leen de acá (rápido, un valor por mes); el detalle
-- diario de una pantalla puntual (Clientes, Líneas, SKUs) va directo
-- contra venta_item. Se refresca al cerrar cada importación exitosa —
-- ver server/src/core/refrescarVentaMensual.ts.
--
-- Este archivo se aplica a mano desde db:migrate (drizzle-kit no modela
-- vistas materializadas con refresh concurrente), y es idempotente: se
-- puede correr de nuevo sin romper nada.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_venta_mensual AS
SELECT
  empresa_id,
  date_trunc('month', fecha)::date AS periodo,
  cliente_id,
  vendedor_id,
  linea_id,
  producto_id,
  SUM(monto)    AS monto,
  SUM(cantidad) AS unidades
FROM venta_item
GROUP BY empresa_id, date_trunc('month', fecha), cliente_id, vendedor_id, linea_id, producto_id
WITH DATA;

-- REFRESH ... CONCURRENTLY exige un índice único sobre columnas simples
-- (sin expresiones: nada de COALESCE ni funciones). El GROUP BY de arriba
-- ya garantiza una sola fila por combinación exacta de estas columnas
-- —incluyendo cuando vendedor_id/producto_id son NULL, porque GROUP BY
-- agrupa los NULL entre sí— así que un índice único "plano" es válido acá
-- aunque, a nivel de índice, dos NULL nunca se consideren iguales entre
-- sí (no hace falta que lo hagan: nunca va a haber dos filas así).
DROP INDEX IF EXISTS mv_venta_mensual_unq; -- limpia la versión anterior con COALESCE, si existe
CREATE UNIQUE INDEX IF NOT EXISTS mv_venta_mensual_unq
  ON mv_venta_mensual (empresa_id, periodo, cliente_id, vendedor_id, linea_id, producto_id);

CREATE INDEX IF NOT EXISTS mv_venta_mensual_periodo_idx  ON mv_venta_mensual (empresa_id, periodo);
CREATE INDEX IF NOT EXISTS mv_venta_mensual_cliente_idx  ON mv_venta_mensual (empresa_id, cliente_id, periodo);
CREATE INDEX IF NOT EXISTS mv_venta_mensual_linea_idx    ON mv_venta_mensual (empresa_id, linea_id, periodo);
CREATE INDEX IF NOT EXISTS mv_venta_mensual_producto_idx ON mv_venta_mensual (empresa_id, producto_id, periodo);
CREATE INDEX IF NOT EXISTS mv_venta_mensual_vendedor_idx ON mv_venta_mensual (empresa_id, vendedor_id, periodo);
