// Port del mismo algoritmo que server/src/core/abc.ts — clasificación
// A/B/C por facturación acumulada. Se usa en el frontend para las
// páginas que reciben una matriz cruda (liveData) y clasifican del lado
// del cliente; las páginas con scoring ya resuelto en el servidor
// (Clientes, Faro) usan directamente el `tier` que manda la API.
export function clasificarPorAcumulado(items) {
  const ordenados = [...items].sort((a, b) => b.venta - a.venta)
  const total = ordenados.reduce((acc, o) => acc + o.venta, 0)
  const tiers = {}
  let acumulado = 0
  ordenados.forEach((o) => {
    const pctAntes = total > 0 ? acumulado / total : 0
    tiers[o.key] = pctAntes < 0.5 ? 'A' : pctAntes < 0.8 ? 'B' : 'C'
    acumulado += o.venta
  })
  return tiers
}
