// Agregaciones reutilizables sobre venta_item / mv_venta_mensual. Todos
// los módulos de lectura (resumen, clientes, líneas, productos) arman sus
// respuestas combinando estas funciones — es el reemplazo directo de los
// objetos `ventas...PorPeriodo` generados en src/data/mockData.js.
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { mvVentaMensual } from '../db/schema/views'
import { ventaItem } from '../db/schema'
import { diasEnMes, primerDiaDelMes, type Periodo } from './periodos'

export interface AgregadoVenta {
  id: string
  monto: number
  unidades: number
}

function toFechas(periodos: Periodo[]): string[] {
  return periodos.map(primerDiaDelMes)
}

async function agregarPor(
  db: Database,
  empresaId: string,
  periodos: Periodo[],
  columna: typeof mvVentaMensual.clienteId | typeof mvVentaMensual.lineaId | typeof mvVentaMensual.productoId | typeof mvVentaMensual.vendedorId,
): Promise<AgregadoVenta[]> {
  if (periodos.length === 0) return []
  const filas = await db
    .select({
      id: columna,
      monto: sql<string>`COALESCE(SUM(${mvVentaMensual.monto}), 0)`,
      unidades: sql<string>`COALESCE(SUM(${mvVentaMensual.unidades}), 0)`,
    })
    .from(mvVentaMensual)
    .where(and(eq(mvVentaMensual.empresaId, empresaId), inArray(mvVentaMensual.periodo, toFechas(periodos))))
    .groupBy(columna)

  return filas.filter((f) => f.id !== null).map((f) => ({ id: f.id as string, monto: Number(f.monto), unidades: Number(f.unidades) }))
}

export const agregarPorCliente = (db: Database, empresaId: string, periodos: Periodo[]) =>
  agregarPor(db, empresaId, periodos, mvVentaMensual.clienteId)

export const agregarPorLinea = (db: Database, empresaId: string, periodos: Periodo[]) =>
  agregarPor(db, empresaId, periodos, mvVentaMensual.lineaId)

export const agregarPorProducto = (db: Database, empresaId: string, periodos: Periodo[]) =>
  agregarPor(db, empresaId, periodos, mvVentaMensual.productoId)

export const agregarPorVendedor = (db: Database, empresaId: string, periodos: Periodo[]) =>
  agregarPor(db, empresaId, periodos, mvVentaMensual.vendedorId)

export async function totalEmpresa(db: Database, empresaId: string, periodos: Periodo[]): Promise<{ monto: number; unidades: number }> {
  if (periodos.length === 0) return { monto: 0, unidades: 0 }
  const [fila] = await db
    .select({
      monto: sql<string>`COALESCE(SUM(${mvVentaMensual.monto}), 0)`,
      unidades: sql<string>`COALESCE(SUM(${mvVentaMensual.unidades}), 0)`,
    })
    .from(mvVentaMensual)
    .where(and(eq(mvVentaMensual.empresaId, empresaId), inArray(mvVentaMensual.periodo, toFechas(periodos))))
  return { monto: Number(fila?.monto ?? 0), unidades: Number(fila?.unidades ?? 0) }
}

/** Serie mensual (un valor por mes) para un rango contiguo de períodos — usada por el gráfico anual del Dashboard. */
export async function serieMensualEmpresa(db: Database, empresaId: string, periodos: Periodo[]) {
  if (periodos.length === 0) return []
  const filas = await db
    .select({
      periodo: mvVentaMensual.periodo,
      monto: sql<string>`COALESCE(SUM(${mvVentaMensual.monto}), 0)`,
      unidades: sql<string>`COALESCE(SUM(${mvVentaMensual.unidades}), 0)`,
    })
    .from(mvVentaMensual)
    .where(and(eq(mvVentaMensual.empresaId, empresaId), inArray(mvVentaMensual.periodo, toFechas(periodos))))
    .groupBy(mvVentaMensual.periodo)

  const porPeriodo = new Map(filas.map((f) => [f.periodo, { monto: Number(f.monto), unidades: Number(f.unidades) }]))
  return periodos.map((p) => {
    const fecha = primerDiaDelMes(p)
    const valores = porPeriodo.get(fecha) ?? { monto: 0, unidades: 0 }
    return { ...p, venta: valores.monto, unidades: valores.unidades }
  })
}

export interface DiaVenta {
  day: number
  venta: number
  unidades: number
}

/** Distribución diaria dentro de un mes — completa los días sin venta con 0, igual que genDistribucionDiaria del frontend. */
export async function ventaDiaria(
  db: Database,
  empresaId: string,
  year: number,
  month: number,
  filtro: { clienteId?: string; lineaId?: string; productoId?: string } = {},
): Promise<DiaVenta[]> {
  const condiciones = [eq(ventaItem.empresaId, empresaId), sql`date_trunc('month', ${ventaItem.fecha}) = ${primerDiaDelMes({ year, month, key: '' })}`]
  if (filtro.clienteId) condiciones.push(eq(ventaItem.clienteId, filtro.clienteId))
  if (filtro.lineaId) condiciones.push(eq(ventaItem.lineaId, filtro.lineaId))
  if (filtro.productoId) condiciones.push(eq(ventaItem.productoId, filtro.productoId))

  const filas = await db
    .select({
      fecha: ventaItem.fecha,
      monto: sql<string>`COALESCE(SUM(${ventaItem.monto}), 0)`,
      unidades: sql<string>`COALESCE(SUM(${ventaItem.cantidad}), 0)`,
    })
    .from(ventaItem)
    .where(and(...condiciones))
    .groupBy(ventaItem.fecha)

  const porFecha = new Map(filas.map((f) => [f.fecha, { monto: Number(f.monto), unidades: Number(f.unidades) }]))
  const dias = diasEnMes(year, month)
  return Array.from({ length: dias }, (_, i) => {
    const day = i + 1
    const fechaISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const valores = porFecha.get(fechaISO) ?? { monto: 0, unidades: 0 }
    return { day, venta: valores.monto, unidades: valores.unidades }
  })
}
