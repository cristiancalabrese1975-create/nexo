import type { FastifyInstance } from 'fastify'
import { db } from '../../db/client'
import { cargarEmpresa } from '../../core/query-helpers'
import { parsePeriodoKey, rangoPeriodos } from '../../core/periodos'
import {
  serieMensualMatrizCliente,
  serieMensualMatrizLinea,
  serieMensualMatrizProducto,
  serieMensualMatrizVendedor,
  serieMensualEmpresa,
} from '../../core/consultas-venta'
import { serieObjetivoLinea, serieObjetivoEmpresa } from '../../core/consultas-objetivo'
import {
  lineasPorClienteTodos,
  listarClientesTodos,
  listarLineasTodas,
  listarProductosTodos,
  listarVendedoresRoster,
  skusPorClienteTodos,
} from './queries'
import { ventaDiariaLedger } from './diario'
import { ValidationError } from '../../core/errors'
import { serieInflacion } from '../resumen/queries'

/**
 * Catálogo + matrices mensuales a nivel empresa, sin scope de vendedor —
 * mismo alcance que tenían Líneas, SKU y Resumen Gerencial en la demo
 * original (nunca filtraban por vendedor, a diferencia de Clientes/Faro).
 * Reemplaza de un saque los objetos `ventas...PorPeriodo` +
 * `lineasPreferidasPorCliente`/`skusPreferidosPorCliente` que en el mock
 * vivían generados en memoria.
 */
export async function reportesRoutes(app: FastifyInstance) {
  app.get('/base', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const empresaRow = await cargarEmpresa(db, ctx)
    const query = request.query as Record<string, unknown>

    const hoy = empresaRow.fechaReferencia ?? new Date().toISOString().slice(0, 10)
    const [yStr] = hoy.split('-')
    const anioActual = Number(yStr)
    const hasta = typeof query.hasta === 'string' ? parsePeriodoKey(query.hasta) : parsePeriodoKey(hoy.slice(0, 7))
    const desde = typeof query.desde === 'string' ? parsePeriodoKey(query.desde) : parsePeriodoKey(`${anioActual - 1}-01`)
    const periodos = rangoPeriodos(desde, hasta)

    const [
      clientes,
      lineas,
      productos,
      vendedores,
      ventaCliente,
      ventaLinea,
      objetivoLinea,
      ventaProducto,
      ventaVendedor,
      objetivoEmpresa,
      lineasPorCliente,
      skusPorCliente,
      inflacion,
    ] = await Promise.all([
      listarClientesTodos(db, ctx.empresaId),
      listarLineasTodas(db, ctx.empresaId),
      listarProductosTodos(db, ctx.empresaId),
      listarVendedoresRoster(db, ctx.empresaId),
      serieMensualMatrizCliente(db, ctx.empresaId, periodos),
      serieMensualMatrizLinea(db, ctx.empresaId, periodos),
      serieObjetivoLinea(db, ctx.empresaId, periodos),
      serieMensualMatrizProducto(db, ctx.empresaId, periodos),
      serieMensualMatrizVendedor(db, ctx.empresaId, periodos),
      serieObjetivoEmpresa(db, ctx.empresaId, periodos),
      lineasPorClienteTodos(db, ctx.empresaId, periodos),
      skusPorClienteTodos(db, ctx.empresaId, periodos),
      serieInflacion(db, ctx.empresaId, periodos),
    ])

    return {
      periodos: periodos.map((p) => ({ year: p.year, month: p.month, key: p.key })),
      hoy,
      clientes: clientes.map((c) => ({
        codigo: c.id,
        razonSocial: c.razonSocial,
        categoria: c.categoriaNombre,
        vendedorAsignado: c.vendedorNombre,
      })),
      lineas: lineas.map((l) => ({ id: l.id, nombre: l.nombre, direccion: l.direccionNombre })),
      skus: productos.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, lineaId: p.lineaId, lineaNombre: p.lineaNombre })),
      vendedores: vendedores.map((v) => ({ nombre: v.nombre, whatsapp: v.whatsapp })),
      ventaClientePorPeriodo: ventaCliente,
      ventaLineaPorPeriodo: ventaLinea,
      objetivoLineaPorPeriodo: objetivoLinea,
      ventaSkuPorPeriodo: ventaProducto,
      // Keyed por nombre completo (no por id) para calzar con `vendedores`
      // (array de nombres) que ya usan Skus/Faro/Gerencial en el frontend.
      ventaVendedorPorPeriodo: Object.fromEntries(
        vendedores.map((v) => [v.nombre, ventaVendedor[v.id] ?? periodos.map(() => ({ monto: 0, unidades: 0 }))]),
      ),
      objetivoEmpresaPorPeriodo: periodos.map((p) => objetivoEmpresa[`${p.year}-${String(p.month).padStart(2, '0')}-01`] ?? 0),
      ventaEmpresaPorPeriodo: (await serieMensualEmpresa(db, ctx.empresaId, periodos)).map((v) => ({ venta: v.venta, unidades: v.unidades })),
      lineasPorCliente,
      skusPorCliente,
      inflacionPorPeriodo: periodos.map((p) => inflacion[`${p.year}-${String(p.month).padStart(2, '0')}-01`] ?? null),
    }
  })

  // Ledger día a día de un mes puntual, sin agrupar — Clientes/Líneas/SKU
  // agrupan del lado del cliente según qué vista estén mostrando (mismo
  // patrón que serieDiariaCliente/Linea/Sku en el mock, ahora sobre datos
  // reales). Se pide sólo cuando el usuario abre la vista "Diario".
  app.get('/diario', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const year = Number(query.year)
    const month = Number(query.month)
    if (!year || !month) throw new ValidationError('year/month requeridos')

    const filas = await ventaDiariaLedger(db, ctx.empresaId, year, month)
    return {
      filas: filas.map((f) => ({
        day: Number(f.fecha.slice(8, 10)),
        clienteId: f.clienteId,
        lineaId: f.lineaId,
        productoId: f.productoId,
        monto: Number(f.monto),
        cantidad: Number(f.cantidad),
      })),
    }
  })
}
