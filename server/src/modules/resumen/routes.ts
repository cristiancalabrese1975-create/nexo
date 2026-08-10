import type { FastifyInstance } from 'fastify'
import { db } from '../../db/client'
import { cargarEmpresa, leerModo } from '../../core/query-helpers'
import { parsePeriodoKey, rangoPeriodos, type Periodo } from '../../core/periodos'
import { ValidationError } from '../../core/errors'
import { serieInflacion, serieResumen } from './queries'

function leerRango(query: Record<string, unknown>, fallbackHasta: Periodo): { desde: Periodo; hasta: Periodo } {
  const hasta = typeof query.hasta === 'string' ? parsePeriodoKey(query.hasta) : fallbackHasta
  const desde =
    typeof query.desde === 'string'
      ? parsePeriodoKey(query.desde)
      : // por defecto, 24 meses hacia atrás — cubre el año en curso + el anterior para YoY
        (() => {
          let { year, month } = hasta
          month -= 23
          while (month < 1) {
            month += 12
            year -= 1
          }
          return { year, month, key: `${year}-${String(month).padStart(2, '0')}` }
        })()
  if (desde.year > hasta.year || (desde.year === hasta.year && desde.month > hasta.month)) {
    throw new ValidationError('`desde` no puede ser posterior a `hasta`.')
  }
  return { desde, hasta }
}

export async function resumenRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const empresaRow = await cargarEmpresa(db, ctx)
    const query = request.query as Record<string, unknown>
    const modo = leerModo(query)

    const hoy = empresaRow.fechaReferencia ?? new Date().toISOString().slice(0, 10)
    const [y, m] = hoy.split('-')
    const { desde, hasta } = leerRango(query, parsePeriodoKey(`${y}-${m}`))
    const periodos = rangoPeriodos(desde, hasta)

    const [serie, inflacion] = await Promise.all([
      serieResumen(db, ctx.empresaId, periodos),
      serieInflacion(db, ctx.empresaId, periodos),
    ])

    return {
      modo,
      hoy,
      periodos: serie.map((p) => ({
        year: p.year,
        month: p.month,
        key: p.key,
        venta: p.venta,
        unidades: p.unidades,
        objetivo: p.objetivo,
        avance: p.avance,
      })),
      inflacion: periodos.map((p) => ({ key: p.key, valorPct: inflacion[`${p.year}-${String(p.month).padStart(2, '0')}-01`] ?? null })),
    }
  })
}
