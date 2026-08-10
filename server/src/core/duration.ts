// Parser mínimo de duraciones tipo '15m' / '30d' / '1h' — mismo formato
// que aceptan JWT_ACCESS_TTL / JWT_REFRESH_TTL de @fastify/jwt, para
// poder calcular la fecha de expiración de sesion_refresh sin depender
// del contenido del JWT.
const UNIDADES: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

export function parseDurationMs(valor: string): number {
  const m = /^(\d+)\s*(s|m|h|d)$/.exec(valor.trim())
  if (!m) throw new Error(`Duración inválida: '${valor}'. Formato esperado: '15m', '1h', '30d'.`)
  const cantidad = Number(m[1])
  const unidad = m[2] as keyof typeof UNIDADES
  return cantidad * UNIDADES[unidad]!
}
