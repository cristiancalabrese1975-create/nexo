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

-- REFRESH ... CONCURRENTLY exige un índice único sobre la vista.
-- COALESCE de los FK nullable (vendedor/producto) a un uuid fijo porque
-- un índice único no distingue NULL = NULL.
CREATE UNIQUE INDEX IF NOT EXISTS mv_venta_mensual_unq
  ON mv_venta_mensual (
    empresa_id,
    periodo,
    cliente_id,
    COALESCE(vendedor_id, '00000000-0000-0000-0000-000000000000'),
    linea_id,
    COALESCE(producto_id, '00000000-0000-0000-0000-000000000000')
  );

CREATE INDEX IF NOT EXISTS mv_venta_mensual_periodo_idx  ON mv_venta_mensual (empresa_id, periodo);
CREATE INDEX IF NOT EXISTS mv_venta_mensual_cliente_idx  ON mv_venta_mensual (empresa_id, cliente_id, periodo);
CREATE INDEX IF NOT EXISTS mv_venta_mensual_linea_idx    ON mv_venta_mensual (empresa_id, linea_id, periodo);
CREATE INDEX IF NOT EXISTS mv_venta_mensual_producto_idx ON mv_venta_mensual (empresa_id, producto_id, periodo);
CREATE INDEX IF NOT EXISTS mv_venta_mensual_vendedor_idx ON mv_venta_mensual (empresa_id, vendedor_id, periodo);
