// Clasificación A/B/C por facturación ACUMULADA — port 1:1 de
// `clasificarPorAcumulado` en src/data/mockData.js, para que el ranking
// que ve el usuario dé exactamente los mismos valores que la demo.
// Opera sobre filas ya agregadas por SQL (SUM(monto) por entidad); acá
// sólo se hace el ordenamiento y el corte 50/80, igual que el frontend.
export interface ItemConVenta {
  key: string
  venta: number
}

export type TierABC = 'A' | 'B' | 'C'

export function clasificarPorAcumulado(items: ItemConVenta[]): Record<string, TierABC> {
  const ordenados = [...items].sort((a, b) => b.venta - a.venta)
  const total = ordenados.reduce((acc, o) => acc + o.venta, 0)
  const tiers: Record<string, TierABC> = {}
  let acumulado = 0
  for (const o of ordenados) {
    const pctAntes = total > 0 ? acumulado / total : 0
    tiers[o.key] = pctAntes < 0.5 ? 'A' : pctAntes < 0.8 ? 'B' : 'C'
    acumulado += o.venta
  }
  return tiers
}
