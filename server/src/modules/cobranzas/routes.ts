import type { FastifyInstance } from 'fastify'
import { db } from '../../db/client'
import { cargarEmpresa, leerPeriodos } from '../../core/query-helpers'
import { diasTranscurridos, hoyDeLaEmpresa } from '../../core/periodos'
import { cobranzasACuenta, comprobantesEnPeriodo, saldoPendienteTotal } from './queries'

export async function cobranzasRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const ctx = request.authCtx
    const query = request.query as Record<string, unknown>
    const empresaRow = await cargarEmpresa(db, ctx)
    const periodos = leerPeriodos(query, empresaRow)
    const umbralDias = Number(query.umbralDias ?? 30)
    const hoy = hoyDeLaEmpresa(empresaRow)

    const [comprobantes, pendientes, aCuenta] = await Promise.all([
      comprobantesEnPeriodo(db, ctx, periodos),
      saldoPendienteTotal(db, ctx),
      cobranzasACuenta(db, ctx.empresaId),
    ])

    const comprobantesConMora = comprobantes.map((c) => {
      const referencia = c.fechaVencimiento ?? c.fechaEmision
      const dias = diasTranscurridos(referencia, hoy)
      return { ...c, dias, vencidoDinamico: Number(c.saldo) > 0 && dias > umbralDias }
    })

    const saldoTotal = comprobantesConMora.reduce((acc, c) => acc + Number(c.saldo), 0)
    const vencido = comprobantesConMora.reduce((acc, c) => acc + (c.vencidoDinamico ? Number(c.saldo) : 0), 0)
    const pctVencido = saldoTotal > 0 ? (vencido / saldoTotal) * 100 : 0

    // Mora: TODO el saldo pendiente (sin filtro de período), agrupado por cliente.
    const porCliente = new Map<string, { clienteId: string; cliente: string; saldo: number; diasMax: number; comprobantes: number }>()
    for (const c of pendientes) {
      const referencia = c.fechaVencimiento ?? c.fechaEmision
      const dias = diasTranscurridos(referencia, hoy)
      if (dias <= umbralDias) continue
      const actual = porCliente.get(c.clienteId) ?? { clienteId: c.clienteId, cliente: c.clienteNombre, saldo: 0, diasMax: 0, comprobantes: 0 }
      actual.saldo += Number(c.saldo)
      actual.diasMax = Math.max(actual.diasMax, dias)
      actual.comprobantes += 1
      porCliente.set(c.clienteId, actual)
    }
    const clientesEnMora = [...porCliente.values()]
    const montoEnMora = clientesEnMora.reduce((acc, c) => acc + c.saldo, 0)

    return {
      periodos: periodos.map((p) => p.key),
      umbralDias,
      aCuenta,
      saldoTotal,
      vencido,
      pctVencido,
      comprobantes: comprobantesConMora,
      clientesEnMora,
      montoEnMora,
    }
  })
}
