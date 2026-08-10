// Scoring de priorización — port 1:1 de scoreOportunidad y
// scoreDesvioCliente en src/data/mockData.js. Los pesos (40/30/30) quedan
// como constantes con nombre porque son argumento de venta: se van a
// querer ajustar por cliente instalado.
export const PESO_OPORTUNIDAD = { etapa: 0.4, monto: 0.3, actividad: 0.3 } as const
export const PESO_DESVIO_CLIENTE = { caida: 0.4, mora: 0.3, sinContacto: 0.3 } as const

const ETAPA_SCORE: Record<string, number> = { prospecto: 10, contactado: 30, propuesta: 55, negociacion: 75 }

function scoreActividad(dias: number | null): number {
  if (dias === null) return 0
  if (dias <= 7) return 100
  if (dias <= 14) return 75
  if (dias <= 30) return 50
  if (dias <= 60) return 25
  return 0
}

export interface OportunidadScoreInput {
  etapaTipo: 'abierta' | 'ganada' | 'perdida'
  etapaCodigo: string
  valor: number
  maxValorOportunidad: number
  diasSinContacto: number | null
  ultimaGestionFecha?: string | null
}

export interface OportunidadScoreResult {
  score: number
  diasSinContacto: number | null
  ultimaGestionFecha: string | null
}

export function scoreOportunidad(input: OportunidadScoreInput): OportunidadScoreResult | null {
  if (input.etapaTipo !== 'abierta') return null

  const etapaScore = ETAPA_SCORE[input.etapaCodigo] ?? 0
  const montoScore =
    input.maxValorOportunidad > 0 ? Math.min(100, Math.round((input.valor / input.maxValorOportunidad) * 100)) : 0
  const actividadScore = scoreActividad(input.diasSinContacto)

  const score = Math.round(
    etapaScore * PESO_OPORTUNIDAD.etapa + montoScore * PESO_OPORTUNIDAD.monto + actividadScore * PESO_OPORTUNIDAD.actividad,
  )
  return { score, diasSinContacto: input.diasSinContacto, ultimaGestionFecha: input.ultimaGestionFecha ?? null }
}

function scoreCaida(evolucionPct: number): number {
  return evolucionPct >= 0 ? 0 : Math.min(100, Math.round(Math.abs(evolucionPct)))
}

function scoreMora(diasMax: number, saldoTotal: number): number {
  if (saldoTotal <= 0) return 0
  if (diasMax <= 15) return 20
  if (diasMax <= 30) return 45
  if (diasMax <= 60) return 70
  if (diasMax <= 90) return 90
  return 100
}

function scoreSinContacto(dias: number | null): number {
  if (dias === null) return 100
  if (dias <= 7) return 0
  if (dias <= 14) return 25
  if (dias <= 30) return 50
  if (dias <= 60) return 75
  return 100
}

export interface DesvioClienteInput {
  evolucionPct: number
  mora: { diasMax: number; saldoTotal: number }
  diasSinContacto: number | null
}

export function scoreDesvioCliente(input: DesvioClienteInput): number {
  const caidaScore = scoreCaida(input.evolucionPct)
  const moraScore = scoreMora(input.mora.diasMax, input.mora.saldoTotal)
  const contactoScore = scoreSinContacto(input.diasSinContacto)
  return Math.round(
    caidaScore * PESO_DESVIO_CLIENTE.caida + moraScore * PESO_DESVIO_CLIENTE.mora + contactoScore * PESO_DESVIO_CLIENTE.sinContacto,
  )
}
