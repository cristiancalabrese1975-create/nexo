// Datos de ejemplo (ficticios) para la demo visual de Nexo.
// La estructura está inspirada en un panel real de gestión comercial,
// pero todos los nombres, montos y series mensuales fueron generados
// para la demo (incluye un año 2024 "sombra" sólo para poder comparar
// interanualmente contra 2025).

import { PERIODS, indexOfPeriod, periodKey, diasEnMes, seedFromString, seededRandom } from './periods'

// ---------------------------------------------------------------------
// Usuarios / login simulado
// ---------------------------------------------------------------------
export const usuarios = [
  { dni: '30111222', clave: '1234', nombre: 'Marina Sosa', rol: 'vendedor', iniciales: 'MS', whatsapp: '5491122223333' },
  { dni: '28555777', clave: '1234', nombre: 'Lucas Ferreyra', rol: 'vendedor', iniciales: 'LF', whatsapp: '5492214445566' },
  { dni: '32999444', clave: '1234', nombre: 'Ezequiel Paz', rol: 'vendedor', iniciales: 'EP', whatsapp: '5493514447788' },
  { dni: '25444888', clave: 'gerente', nombre: 'Roberto Aguirre', rol: 'gerente', iniciales: 'RA', whatsapp: '5491133335555' },
]

export const vendedores = usuarios.filter((u) => u.rol === 'vendedor').map((u) => u.nombre)

// Link de WhatsApp para contactar directo a un vendedor (o al gerente) del
// equipo, con un mensaje ya armado según el contexto desde donde se abre —
// mismo criterio "sin backend" que el resto de los enlaces de wa.me de la
// app. Devuelve null si esa persona no tiene WhatsApp cargado.
export function whatsappVendedor(nombreVendedor, mensaje) {
  const u = usuarios.find((x) => x.nombre === nombreVendedor)
  if (!u?.whatsapp) return null
  return `https://wa.me/${u.whatsapp}?text=${encodeURIComponent(mensaje)}`
}

// ---------------------------------------------------------------------
// Clientes + series mensuales de venta
// ---------------------------------------------------------------------
const baseVentaPorCategoria = { Mayorista: 650_000, Distribuidor: 380_000, Minorista: 170_000 }

export const clientes = [
  { codigo: 'C0041', razonSocial: 'Ferretería Del Centro SRL', categoria: 'Mayorista', vendedorAsignado: 'Marina Sosa' },
  { codigo: 'C0110', razonSocial: 'Corralón San Martín', categoria: 'Distribuidor', vendedorAsignado: 'Marina Sosa' },
  { codigo: 'C0133', razonSocial: 'Grupo Constructor Andes', categoria: 'Mayorista', vendedorAsignado: 'Ezequiel Paz' },
  { codigo: 'C0138', razonSocial: 'Hogar & Deco', categoria: 'Minorista', vendedorAsignado: 'Ezequiel Paz' },
  { codigo: 'C0201', razonSocial: 'Materiales Rivadavia', categoria: 'Distribuidor', vendedorAsignado: 'Lucas Ferreyra' },
  { codigo: 'C0202', razonSocial: 'Bazar Industrial SA', categoria: 'Mayorista', vendedorAsignado: 'Marina Sosa' },
  { codigo: 'C0209', razonSocial: 'Distribuidora Norte', categoria: 'Distribuidor', vendedorAsignado: 'Lucas Ferreyra' },
  { codigo: 'C0309', razonSocial: 'Electro Sur', categoria: 'Minorista', vendedorAsignado: 'Ezequiel Paz' },
  { codigo: 'C0439', razonSocial: 'Insumos del Litoral', categoria: 'Mayorista', vendedorAsignado: 'Ezequiel Paz' },
  { codigo: 'C0472', razonSocial: 'Casa Roca', categoria: 'Minorista', vendedorAsignado: 'Lucas Ferreyra' },
  { codigo: 'C0528', razonSocial: 'Corralón La Estrella', categoria: 'Distribuidor', vendedorAsignado: 'Marina Sosa' },
  { codigo: 'C0558', razonSocial: 'Grupo Empresarial Cuyo', categoria: 'Mayorista', vendedorAsignado: 'Lucas Ferreyra' },
  { codigo: 'C0562', razonSocial: 'Ferretería Patagonia', categoria: 'Minorista', vendedorAsignado: 'Ezequiel Paz' },
  { codigo: 'C0594', razonSocial: 'Depósito Belgrano', categoria: 'Distribuidor', vendedorAsignado: 'Lucas Ferreyra' },
  { codigo: 'C0598', razonSocial: 'Materiales del Oeste', categoria: 'Mayorista', vendedorAsignado: 'Marina Sosa' },
]

function genSerieVenta(seed, base) {
  return PERIODS.map((p, i) => {
    const trend = 1 + (i / PERIODS.length) * 0.22
    const seasonal = 1 + 0.13 * Math.sin((i / 12) * Math.PI * 2 + seed)
    const noise = 0.8 + seededRandom(seed * 131 + i * 7) * 0.4
    const venta = Math.max(0, Math.round((base * trend * seasonal * noise) / 1000) * 1000)
    return { ...p, venta }
  })
}

export const ventasClientesPorPeriodo = {}
clientes.forEach((c) => {
  const seed = seedFromString(c.codigo)
  ventasClientesPorPeriodo[c.codigo] = genSerieVenta(seed, baseVentaPorCategoria[c.categoria])
})

// Precio promedio por cliente (para poder expresar todo también en unidades).
const precioPromedioPorCategoria = { Mayorista: 9200, Distribuidor: 6100, Minorista: 3200 }
clientes.forEach((c) => {
  const seed = seedFromString(`${c.codigo}-precio`)
  c.precioPromedio = Math.round(precioPromedioPorCategoria[c.categoria] * (0.82 + seededRandom(seed) * 0.4))
})
export const clientesPorCodigo = Object.fromEntries(clientes.map((c) => [c.codigo, c]))

export function ventaClienteRango(codigo, indices) {
  const serie = ventasClientesPorPeriodo[codigo]
  return indices.reduce((acc, i) => acc + (serie[i]?.venta ?? 0), 0)
}

export function ventaVendedorRango(vendedor, indices) {
  return clientes
    .filter((c) => c.vendedorAsignado === vendedor)
    .reduce((acc, c) => acc + ventaClienteRango(c.codigo, indices), 0)
}

// Valor de un cliente en pesos o en unidades según el modo elegido.
export function valorCliente(codigo, indices, modo = 'pesos') {
  const pesos = ventaClienteRango(codigo, indices)
  if (modo === 'unidades') {
    const precio = clientesPorCodigo[codigo]?.precioPromedio || 1
    return Math.round(pesos / precio)
  }
  return pesos
}

// ---------------------------------------------------------------------
// Distribución diaria (para el reporte "por días" dentro de un mes)
// ---------------------------------------------------------------------
function genDistribucionDiaria(seed, year, month, total) {
  const dias = diasEnMes(year, month)
  const pesos = Array.from({ length: dias }, (_, d) => {
    const day = d + 1
    const finde = [0, 6].includes(new Date(year, month - 1, day).getDay())
    const base = finde ? 0.32 : 1
    const noise = 0.55 + seededRandom(seed * 211 + day * 13) * 0.9
    return base * noise
  })
  const sumaPesos = pesos.reduce((a, b) => a + b, 0) || 1
  let acumulado = 0
  return pesos.map((p, i) => {
    const day = i + 1
    const esUltimo = day === pesos.length
    const valor = esUltimo ? Math.max(0, total - acumulado) : Math.max(0, Math.round((total * p) / sumaPesos))
    acumulado += valor
    return { day, venta: valor }
  })
}

export function ventaClienteDiaria(codigo, year, month) {
  const index = indexOfPeriod(periodKey(year, month))
  const total = ventasClientesPorPeriodo[codigo]?.[index]?.venta ?? 0
  return genDistribucionDiaria(seedFromString(`${codigo}-${year}-${month}`), year, month, total)
}

export function serieDiariaCliente(codigo, year, month, modo = 'pesos') {
  const dias = ventaClienteDiaria(codigo, year, month)
  if (modo === 'unidades') {
    const precio = clientesPorCodigo[codigo]?.precioPromedio || 1
    return dias.map((d) => ({ ...d, venta: Math.round(d.venta / precio) }))
  }
  return dias
}

// ---------------------------------------------------------------------
// Líneas de producto: venta + objetivo mensual
// ---------------------------------------------------------------------
export const lineas = [
  { id: 'l1', nombre: 'Electrodomésticos', direccion: 'DIR BSAS/INT', ventaBase: 2_172_318, objetivoBase: 2_715_602 },
  { id: 'l2', nombre: 'Climatización', direccion: 'DIR BSAS/INT', ventaBase: 1_450_261, objetivoBase: 2_614_465 },
  { id: 'l3', nombre: 'Herramientas', direccion: 'DIR BSAS/INT', ventaBase: 1_073_811, objetivoBase: 950_000 },
  { id: 'l4', nombre: 'Iluminación', direccion: 'DIR NORTE', ventaBase: 604_439, objetivoBase: 655_059 },
  { id: 'l5', nombre: 'Ferretería general', direccion: 'DIR NORTE', ventaBase: 1_262_768, objetivoBase: 1_653_495 },
  { id: 'l6', nombre: 'Pinturería', direccion: 'DIR NORTE', ventaBase: 1_375_111, objetivoBase: 1_636_858 },
  { id: 'l7', nombre: 'Jardín y exterior', direccion: 'DIR CUYO', ventaBase: 872_542, objetivoBase: 1_615_722 },
  { id: 'l8', nombre: 'Materiales eléctricos', direccion: 'DIR CUYO', ventaBase: 2_373_903, objetivoBase: 2_363_945 },
  { id: 'l9', nombre: 'Sanitarios', direccion: 'DIR CUYO', ventaBase: 817_749, objetivoBase: 2_363_945 },
  { id: 'l10', nombre: 'Construcción en seco', direccion: 'DIR SUR', ventaBase: 1_305_322, objetivoBase: 2_591_048 },
  { id: 'l11', nombre: 'Fijaciones', direccion: 'DIR SUR', ventaBase: 663_470, objetivoBase: 2_370_302 },
]

function genObjetivo(seed, base) {
  return PERIODS.map((p, i) => {
    const trend = 1 + (i / PERIODS.length) * 0.1
    const noise = 0.97 + seededRandom(seed * 53 + i * 3) * 0.06
    const objetivo = Math.round((base * trend * noise) / 1000) * 1000
    return { ...p, objetivo }
  })
}

// Precio promedio por línea (ticket típico de cada rubro).
const precioPromedioLinea = {
  l1: 42_000, // Electrodomésticos
  l2: 35_000, // Climatización
  l3: 8_500, // Herramientas
  l4: 3_800, // Iluminación
  l5: 2_600, // Ferretería general
  l6: 3_200, // Pinturería
  l7: 4_800, // Jardín y exterior
  l8: 1_900, // Materiales eléctricos
  l9: 7_200, // Sanitarios
  l10: 1_700, // Construcción en seco
  l11: 320, // Fijaciones
}
lineas.forEach((l) => {
  l.precioPromedio = precioPromedioLinea[l.id]
})
export const lineasPorId = Object.fromEntries(lineas.map((l) => [l.id, l]))

// Líneas que cada cliente suele comprar (asociación simulada, determinística
// a partir del código de cliente — no tenemos ventas por SKU en esta demo,
// así que esto sirve como aproximación de "qué le suele comprar cada uno").
function generarLineasPreferidas(codigo) {
  const seedBase = seedFromString(`${codigo}-lineas`)
  const cantidad = 2 + Math.floor(seededRandom(seedBase) * 3) // 2 a 4 líneas
  const disponibles = lineas.map((l) => l.nombre)
  const elegidas = []
  let s = seedBase
  while (elegidas.length < cantidad && disponibles.length) {
    s = s * 1.37 + 7
    const idx = Math.floor(seededRandom(s) * disponibles.length)
    elegidas.push(disponibles.splice(idx, 1)[0])
  }
  return elegidas
}
export const lineasPreferidasPorCliente = Object.fromEntries(
  clientes.map((c) => [c.codigo, generarLineasPreferidas(c.codigo)]),
)

// Clasificación A/B/C por facturación ACUMULADA (no por cantidad de
// población): ordenamos de mayor a menor venta y vamos sumando — A es el
// tramo que concentra el primer 50% de la facturación, B es el tramo
// siguiente hasta completar el 80% (la misma Regla 80/20 de la demo), y C es
// el 20% restante. Mismo criterio para clientes, líneas y SKU en toda la
// aplicación, siempre sobre la población completa (no el filtro activo),
// para que el ranking sea estable.
function clasificarPorAcumulado(itemsConVenta) {
  const ordenados = [...itemsConVenta].sort((a, b) => b.venta - a.venta)
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

export function clasificarClientesABC(indices) {
  return clasificarPorAcumulado(clientes.map((c) => ({ key: c.codigo, venta: ventaClienteRango(c.codigo, indices) })))
}

export const ventasLineasPorPeriodo = {}
export const objetivoLineasPorPeriodo = {}
lineas.forEach((l) => {
  const seed = seedFromString(l.id)
  ventasLineasPorPeriodo[l.id] = genSerieVenta(seed, l.ventaBase)
  objetivoLineasPorPeriodo[l.id] = genObjetivo(seed, l.objetivoBase)
})

export function ventaLineaRango(id, indices) {
  const serie = ventasLineasPorPeriodo[id]
  return indices.reduce((acc, i) => acc + (serie[i]?.venta ?? 0), 0)
}

export function objetivoLineaRango(id, indices) {
  const serie = objetivoLineasPorPeriodo[id]
  return indices.reduce((acc, i) => acc + (serie[i]?.objetivo ?? 0), 0)
}

export function valorLinea(id, indices, modo = 'pesos') {
  const pesos = ventaLineaRango(id, indices)
  if (modo === 'unidades') {
    const precio = lineasPorId[id]?.precioPromedio || 1
    return Math.round(pesos / precio)
  }
  return pesos
}

export function ventaLineaDiaria(id, year, month) {
  const index = indexOfPeriod(periodKey(year, month))
  const total = ventasLineasPorPeriodo[id]?.[index]?.venta ?? 0
  return genDistribucionDiaria(seedFromString(`${id}-${year}-${month}`), year, month, total)
}

export function serieDiariaLinea(id, year, month, modo = 'pesos') {
  const dias = ventaLineaDiaria(id, year, month)
  if (modo === 'unidades') {
    const precio = lineasPorId[id]?.precioPromedio || 1
    return dias.map((d) => ({ ...d, venta: Math.round(d.venta / precio) }))
  }
  return dias
}

export function clasificarLineasABC(indices) {
  return clasificarPorAcumulado(lineas.map((l) => ({ key: l.id, venta: ventaLineaRango(l.id, indices) })))
}

// ---------------------------------------------------------------------
// SKU: catálogo de productos individuales dentro de cada línea.
// No tenemos ventas reales por SKU (no hay backend todavía), así que cada
// SKU se genera repartiendo la venta de su línea con una semilla fija —
// mismo criterio que usamos para "días" o "líneas preferidas por cliente".
// ---------------------------------------------------------------------
const NOMBRES_SKU_POR_LINEA = {
  l1: ['Heladera 300L', 'Lavarropas 8kg', 'Microondas 20L', 'Aire Acondicionado 3000F'],
  l2: ['Split 3000F', 'Split 4500F', 'Ventilador de Techo', 'Calefactor Tiro Balanceado'],
  l3: ['Taladro Percutor', 'Amoladora Angular', 'Caja de Herramientas', 'Sierra Circular'],
  l4: ['Tubo LED 18W', 'Reflector LED 100W', 'Lámpara Colgante', 'Cinta LED 5m'],
  l5: ['Candado 40mm', 'Cinta Métrica 5m', 'Set Destornilladores', 'Bisagra Reforzada'],
  l6: ['Látex Interior 20L', 'Esmalte Sintético 4L', 'Rodillo Antigota', 'Pincel N°20'],
  l7: ['Manguera 25m', 'Cortadora de Césped', 'Maceta Grande', 'Regadera 10L'],
  l8: ['Cable 2.5mm x100m', 'Térmica Bipolar', 'Tomacorriente Doble', 'Tablero Eléctrico'],
  l9: ['Inodoro Completo', 'Grifería Monocomando', 'Ducha Eléctrica', 'Flexible 40cm'],
  l10: ['Placa Roca de Yeso', 'Perfil Montante', 'Masilla para Juntas', 'Cinta para Junta'],
  l11: ['Tornillo Autorroscante x100', 'Clavo Punta París x1kg', 'Tuerca Hexagonal x50', 'Arandela Plana x100'],
}

function generarPesosReparto(seedBase, cantidad) {
  const pesos = Array.from({ length: cantidad }, (_, i) => 0.4 + seededRandom(seedBase * 71 + i * 13) * 1.2)
  const total = pesos.reduce((a, b) => a + b, 0)
  return pesos.map((p) => p / total)
}

export const skus = lineas.flatMap((l) => {
  const nombres = NOMBRES_SKU_POR_LINEA[l.id] ?? []
  const seedBase = seedFromString(l.id)
  const pesos = generarPesosReparto(seedBase, nombres.length)
  return nombres.map((nombre, i) => ({
    id: `${l.id}-sku${i + 1}`,
    codigo: `${l.id.toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
    nombre,
    lineaId: l.id,
    lineaNombre: l.nombre,
    ventaBase: Math.round(l.ventaBase * pesos[i]),
    precio: Math.round(l.precioPromedio * (0.7 + seededRandom(seedBase * 31 + i * 5) * 0.7)),
  }))
})
export const skusPorLinea = skus.reduce((acc, s) => {
  ;(acc[s.lineaId] ??= []).push(s)
  return acc
}, {})

export const ventasSkuPorPeriodo = {}
skus.forEach((s) => {
  const seed = seedFromString(s.id)
  ventasSkuPorPeriodo[s.id] = genSerieVenta(seed, s.ventaBase)
})

export function ventaSkuRango(id, indices) {
  const serie = ventasSkuPorPeriodo[id]
  return indices.reduce((acc, i) => acc + (serie[i]?.venta ?? 0), 0)
}

export function valorSku(id, indices, modo = 'pesos') {
  const pesos = ventaSkuRango(id, indices)
  if (modo === 'unidades') {
    const sku = skus.find((s) => s.id === id)
    return Math.round(pesos / (sku?.precio || 1))
  }
  return pesos
}

export function ventaSkuDiaria(id, year, month) {
  const index = indexOfPeriod(periodKey(year, month))
  const total = ventasSkuPorPeriodo[id]?.[index]?.venta ?? 0
  return genDistribucionDiaria(seedFromString(`${id}-${year}-${month}`), year, month, total)
}

export function serieDiariaSku(id, year, month, modo = 'pesos') {
  const dias = ventaSkuDiaria(id, year, month)
  if (modo === 'unidades') {
    const sku = skus.find((s) => s.id === id)
    const precio = sku?.precio || 1
    return dias.map((d) => ({ ...d, venta: Math.round(d.venta / precio) }))
  }
  return dias
}

// Ranking A/B/C de SKUs por venta del período (mismo criterio acumulado que
// clasificarClientesABC y clasificarLineasABC).
export function clasificarSkusABC(indices) {
  return clasificarPorAcumulado(skus.map((s) => ({ key: s.id, venta: ventaSkuRango(s.id, indices) })))
}

// Qué SKUs suele comprar cada cliente: 1-2 por cada línea que ya tiene como
// preferida (lineasPreferidasPorCliente), para que sea coherente con lo que
// ya mostramos en el detalle del vendedor.
export const skusPreferidosPorCliente = Object.fromEntries(
  clientes.map((c) => {
    const seedBase = seedFromString(`${c.codigo}-skus`)
    const lineasPreferidas = lineasPreferidasPorCliente[c.codigo] ?? []
    const elegidos = []
    lineasPreferidas.forEach((nombreLinea, li) => {
      const linea = lineas.find((l) => l.nombre === nombreLinea)
      const disponibles = linea ? (skusPorLinea[linea.id] ?? []) : []
      const cantidad = Math.min(disponibles.length, 1 + Math.round(seededRandom(seedBase + li) * 1))
      const copia = [...disponibles]
      for (let k = 0; k < cantidad && copia.length; k++) {
        const idx = Math.floor(seededRandom(seedBase * 17 + li * 3 + k) * copia.length)
        elegidos.push(copia.splice(idx, 1)[0].id)
      }
    })
    return [c.codigo, elegidos]
  }),
)

// Clientes que compran cada SKU (invertido a partir de lo anterior) — sirve
// para filtrar el catálogo de SKU por vendedor.
export const clientesPorSku = {}
Object.entries(skusPreferidosPorCliente).forEach(([codigoCliente, skuIds]) => {
  skuIds.forEach((skuId) => {
    ;(clientesPorSku[skuId] ??= []).push(codigoCliente)
  })
})

export function vendedoresDelSku(skuId) {
  const codigos = clientesPorSku[skuId] ?? []
  const vends = new Set(
    codigos.map((cod) => clientes.find((c) => c.codigo === cod)?.vendedorAsignado).filter(Boolean),
  )
  return [...vends]
}

// ---------------------------------------------------------------------
// Resumen global por período (para el Dashboard)
// ---------------------------------------------------------------------
export const resumenPorPeriodo = PERIODS.map((p, i) => {
  const venta = clientes.reduce((acc, c) => acc + ventasClientesPorPeriodo[c.codigo][i].venta, 0)
  const objetivo = lineas.reduce((acc, l) => acc + objetivoLineasPorPeriodo[l.id][i].objetivo, 0)
  const avance = objetivo > 0 ? Math.round((venta / objetivo) * 100) : null
  const ventaDiariaProyectada = Math.round((venta - objetivo) / 22)
  return { ...p, venta, objetivo, avance, ventaDiariaProyectada }
})

export function ventaResumenRango(indices) {
  return indices.reduce((acc, i) => acc + (resumenPorPeriodo[i]?.venta ?? 0), 0)
}

// Total de unidades vendidas por período (para el toggle Pesos/Unidades del Dashboard).
export const unidadesPorPeriodo = PERIODS.map((p, i) => {
  const unidades = clientes.reduce(
    (acc, c) => acc + Math.round(ventasClientesPorPeriodo[c.codigo][i].venta / c.precioPromedio),
    0,
  )
  return { ...p, unidades }
})

export function unidadesResumenRango(indices) {
  return indices.reduce((acc, i) => acc + (unidadesPorPeriodo[i]?.unidades ?? 0), 0)
}

// ---------------------------------------------------------------------
// Inflación mensual estimada (para el índice de venta real vs. inflación)
// ---------------------------------------------------------------------
export const inflacionMensual = PERIODS.map((p, i) => {
  const progreso = i / (PERIODS.length - 1)
  const base = 5.6 - progreso * 3.9 // arranca ~5.6% y baja hacia ~1.7%
  const ruido = (seededRandom(i * 17 + 3) - 0.5) * 0.6
  const valor = Math.max(0.6, Math.round((base + ruido) * 10) / 10)
  return { ...p, valor }
})

export function inflacionAcumulada(desdeIndexExclusivo, hastaIndexInclusive) {
  if (desdeIndexExclusivo < -1 || hastaIndexInclusive < desdeIndexExclusivo) return null
  let acumulado = 1
  for (let i = Math.max(0, desdeIndexExclusivo + 1); i <= hastaIndexInclusive; i++) {
    acumulado *= 1 + inflacionMensual[i].valor / 100
  }
  return (acumulado - 1) * 100
}

// ---------------------------------------------------------------------
// Pipeline de ventas
// ---------------------------------------------------------------------
export const etapasPipeline = [
  { id: 'prospecto', nombre: 'Prospecto', color: '#94a3b8' },
  { id: 'contactado', nombre: 'Contactado', color: '#60a5fa' },
  { id: 'propuesta', nombre: 'Propuesta', color: '#fbbf24' },
  { id: 'negociacion', nombre: 'Negociación', color: '#fb923c' },
  { id: 'ganado', nombre: 'Ganado', color: '#4ade80' },
  { id: 'perdido', nombre: 'Perdido', color: '#f87171' },
]

export const oportunidades = [
  { id: 'op1', titulo: 'Reposición trimestral', cliente: 'Ferretería Del Centro SRL', valor: 1_850_000, vendedor: 'Marina Sosa', etapa: 'negociacion', fecha: '2026-08-10' },
  { id: 'op2', titulo: 'Ampliación línea climatización', cliente: 'Distribuidora Norte', valor: 3_200_000, vendedor: 'Lucas Ferreyra', etapa: 'propuesta', fecha: '2026-08-14' },
  { id: 'op3', titulo: 'Apertura de cuenta', cliente: 'Corralón La Estrella', valor: 950_000, vendedor: 'Marina Sosa', etapa: 'prospecto', fecha: '2026-08-20' },
  { id: 'op4', titulo: 'Pedido materiales eléctricos', cliente: 'Grupo Constructor Andes', valor: 2_640_000, vendedor: 'Ezequiel Paz', etapa: 'contactado', fecha: '2026-08-12' },
  { id: 'op5', titulo: 'Renovación anual', cliente: 'Grupo Empresarial Cuyo', valor: 5_100_000, vendedor: 'Lucas Ferreyra', etapa: 'ganado', fecha: '2026-07-30' },
  { id: 'op6', titulo: 'Cotización obra nueva', cliente: 'Hogar & Deco', valor: 1_180_000, vendedor: 'Ezequiel Paz', etapa: 'propuesta', fecha: '2026-08-16' },
  { id: 'op7', titulo: 'Primer pedido', cliente: 'Bazar Industrial SA', valor: 720_000, vendedor: 'Marina Sosa', etapa: 'prospecto', fecha: '2026-08-22' },
  { id: 'op8', titulo: 'Ampliación crédito', cliente: 'Ferretería Patagonia', valor: 1_450_000, vendedor: 'Ezequiel Paz', etapa: 'negociacion', fecha: '2026-08-09' },
  { id: 'op9', titulo: 'Pedido especial iluminación', cliente: 'Electro Sur', valor: 630_000, vendedor: 'Ezequiel Paz', etapa: 'contactado', fecha: '2026-08-13' },
  { id: 'op10', titulo: 'Convenio anual', cliente: 'Depósito Belgrano', valor: 2_980_000, vendedor: 'Lucas Ferreyra', etapa: 'ganado', fecha: '2026-07-28' },
  { id: 'op11', titulo: 'Pedido de temporada', cliente: 'Insumos del Litoral', valor: 1_340_000, vendedor: 'Ezequiel Paz', etapa: 'ganado', fecha: '2025-03-18' },
  { id: 'op12', titulo: 'Reactivación de cuenta', cliente: 'Materiales Rivadavia', valor: 610_000, vendedor: 'Lucas Ferreyra', etapa: 'perdido', fecha: '2025-05-22' },
  { id: 'op13', titulo: 'Compra de insumos', cliente: 'Casa Roca', valor: 480_000, vendedor: 'Lucas Ferreyra', etapa: 'ganado', fecha: '2025-07-11' },
  { id: 'op14', titulo: 'Ampliación de línea', cliente: 'Bazar Industrial SA', valor: 2_100_000, vendedor: 'Marina Sosa', etapa: 'ganado', fecha: '2025-09-05' },
  { id: 'op15', titulo: 'Pedido cancelado', cliente: 'Corralón San Martín', valor: 390_000, vendedor: 'Marina Sosa', etapa: 'perdido', fecha: '2025-10-14' },
  { id: 'op16', titulo: 'Renovación de convenio', cliente: 'Ferretería Patagonia', valor: 1_760_000, vendedor: 'Ezequiel Paz', etapa: 'ganado', fecha: '2025-12-02' },
  { id: 'op17', titulo: 'Nueva cuenta industrial', cliente: 'Materiales del Oeste', valor: 3_450_000, vendedor: 'Marina Sosa', etapa: 'ganado', fecha: '2026-01-20' },
  { id: 'op18', titulo: 'Pedido rechazado', cliente: 'Hogar & Deco', valor: 540_000, vendedor: 'Ezequiel Paz', etapa: 'perdido', fecha: '2026-03-08' },
  { id: 'op19', titulo: 'Ampliación de depósito', cliente: 'Depósito Belgrano', valor: 2_250_000, vendedor: 'Lucas Ferreyra', etapa: 'ganado', fecha: '2026-04-17' },
  { id: 'op20', titulo: 'Cotización perdida', cliente: 'Grupo Constructor Andes', valor: 980_000, vendedor: 'Ezequiel Paz', etapa: 'perdido', fecha: '2026-06-25' },
]

// ---------------------------------------------------------------------
// Lead scoring: prioridad automática de cada oportunidad abierta.
// Combina 3 señales que ya tenemos en el sistema, sin necesidad de
// backend ni de IA: qué tan avanzada está la etapa (40%), el tamaño del
// negocio (30%) y qué tan reciente fue el último contacto con ese
// cliente, según la Agenda (30%). Sólo aplica a oportunidades abiertas
// (ganado/perdido ya están resueltas, no necesitan prioridad).
// ---------------------------------------------------------------------
const ETAPA_SCORE = { prospecto: 10, contactado: 30, propuesta: 55, negociacion: 75 }
const MAX_VALOR_OPORTUNIDAD = Math.max(...oportunidades.map((o) => o.valor))

function scoreActividad(dias) {
  if (dias === null) return 0
  if (dias <= 7) return 100
  if (dias <= 14) return 75
  if (dias <= 30) return 50
  if (dias <= 60) return 25
  return 0
}

export function scoreOportunidad(op) {
  if (op.etapa === 'ganado' || op.etapa === 'perdido') return null

  const etapaScore = ETAPA_SCORE[op.etapa] ?? 0
  const montoScore = Math.min(100, Math.round((op.valor / MAX_VALOR_OPORTUNIDAD) * 100))

  const ultimaGestion = actividadesAgendaSemilla
    .filter((a) => a.cliente === op.cliente && a.fecha <= HOY_DEMO_ISO)
    .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`))[0]
  const dias = ultimaGestion
    ? Math.round((new Date(`${HOY_DEMO_ISO}T00:00:00`) - new Date(`${ultimaGestion.fecha}T00:00:00`)) / 86_400_000)
    : null
  const actividadScore = scoreActividad(dias)

  const score = Math.round(etapaScore * 0.4 + montoScore * 0.3 + actividadScore * 0.3)
  return { score, diasSinContacto: dias, ultimaGestionFecha: ultimaGestion?.fecha ?? null }
}

// ---------------------------------------------------------------------
// Cobranzas
// ---------------------------------------------------------------------
// Fecha de referencia fija de la demo (no usa el reloj real del navegador,
// así el análisis de mora se ve siempre consistente sin importar cuándo se abra el link).
export const HOY_DEMO = new Date(2026, 7, 6)

export function diasTranscurridos(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`)
  return Math.round((HOY_DEMO - fecha) / 86_400_000)
}

export const cobranzasAcuenta = -1_427_387

export const comprobantes = [
  { cliente: 'Ferretería Del Centro SRL', comprobante: 'A0003-00076849', fecha: '2026-07-10', importe: 1_614_366, saldo: 1_614_366, vencido: true },
  { cliente: 'Corralón San Martín', comprobante: 'A0003-00077265', fecha: '2026-07-24', importe: 1_233_650, saldo: 1_233_650, vencido: false },
  { cliente: 'Grupo Constructor Andes', comprobante: 'A0003-00077504', fecha: '2026-08-01', importe: 1_229_600, saldo: 1_229_600, vencido: false },
  { cliente: 'Hogar & Deco', comprobante: 'A0003-00076959', fecha: '2026-07-15', importe: 1_151_448, saldo: 1_151_448, vencido: true },
  { cliente: 'Materiales Rivadavia', comprobante: 'A0003-00077264', fecha: '2026-07-24', importe: 1_025_658, saldo: 1_025_658, vencido: true },
  { cliente: 'Bazar Industrial SA', comprobante: 'A0003-00077505', fecha: '2026-08-01', importe: 856_379, saldo: 856_379, vencido: false },
  { cliente: 'Distribuidora Norte', comprobante: 'A0003-00077027', fecha: '2026-07-17', importe: 850_113, saldo: 850_113, vencido: true },
  { cliente: 'Electro Sur', comprobante: 'A0003-00077547', fecha: '2026-07-18', importe: 815_589, saldo: 815_589, vencido: true },
  { cliente: 'Insumos del Litoral', comprobante: 'A0003-00077158', fecha: '2026-07-22', importe: 748_029, saldo: 748_029, vencido: true },
  { cliente: 'Casa Roca', comprobante: 'A0003-00077111', fecha: '2026-07-21', importe: 741_040, saldo: 704_513, vencido: true },
  { cliente: 'Corralón La Estrella', comprobante: 'B0001-00185675', fecha: '2026-08-04', importe: 699_863, saldo: 699_863, vencido: false },
  { cliente: 'Grupo Empresarial Cuyo', comprobante: 'A0003-00076792', fecha: '2026-07-08', importe: 691_476, saldo: 691_476, vencido: true },
  { cliente: 'Ferretería Patagonia', comprobante: 'B0001-00184103', fecha: '2026-07-23', importe: 660_643, saldo: 660_643, vencido: true },
  { cliente: 'Depósito Belgrano', comprobante: 'A0002-00065210', fecha: '2025-11-12', importe: 980_500, saldo: 0, vencido: false },
  { cliente: 'Materiales del Oeste', comprobante: 'A0002-00061044', fecha: '2025-06-05', importe: 1_420_300, saldo: 0, vencido: false },
  { cliente: 'Grupo Constructor Andes', comprobante: 'A0002-00058877', fecha: '2025-03-20', importe: 875_200, saldo: 0, vencido: false },
  { cliente: 'Electro Sur', comprobante: 'A0002-00070125', fecha: '2026-02-14', importe: 612_400, saldo: 0, vencido: false },
  { cliente: 'Bazar Industrial SA', comprobante: 'A0002-00072980', fecha: '2026-04-09', importe: 530_900, saldo: 530_900, vencido: true },
]

// ---------------------------------------------------------------------
// Descuentos / condiciones comerciales
// ---------------------------------------------------------------------
// Condición comercial vigente de cada cliente. Generada de forma
// determinística (misma técnica que el resto de la demo) para cubrir toda
// la cartera: ~65% de los clientes tiene algún descuento especial pactado
// sobre la línea que más les compra, el resto queda en lista de precios.
export const descuentos = clientes.map((c) => {
  const seed = seedFromString(`${c.codigo}-descuento`)
  const tieneDescuento = seededRandom(seed) > 0.35
  const descuento = tieneDescuento ? Math.round(seededRandom(seed * 3) * 1200) / 100 : 0
  const lineaPreferida = (lineasPreferidasPorCliente[c.codigo] ?? [])[0] ?? lineas[0]?.nombre ?? ''
  const mesesAtras = Math.floor(seededRandom(seed * 7) * 18)
  const idxVigencia = Math.max(0, PERIODS.length - 1 - mesesAtras)
  return {
    grupo: c.codigo,
    razonSocial: c.razonSocial,
    linea: lineaPreferida,
    descuento,
    vigenteDesde: PERIODS[idxVigencia].key,
  }
})

// ---------------------------------------------------------------------
// Agenda del vendedor
// ---------------------------------------------------------------------
// "Hoy" fijo de la demo (mismo criterio que HOY_DEMO de Cobranzas): así el
// aviso de "a gestionar hoy" se ve siempre igual, sin depender del reloj real.
export const HOY_DEMO_ISO = '2026-08-06'

// Fecha y hora del último import de ventas del sistema del cliente (ver
// Nexo_Historial_de_Ventas.xlsx) — hoy es un valor fijo de la demo; con el
// backend real va a reflejar cuándo corrió el último import automático.
export const ULTIMA_ACTUALIZACION_ISO = '2026-08-06T06:02:00'

export function formatUltimaActualizacion(iso) {
  const fecha = new Date(iso)
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (iso.slice(0, 10) === HOY_DEMO_ISO) return `hoy · ${hora}hs`
  const dia = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  return `${dia} · ${hora}hs`
}

export const actividadesAgendaSemilla = [
  { id: 'a1', clienteCodigo: 'C0041', cliente: 'Ferretería Del Centro SRL', vendedor: 'Marina Sosa', tipo: 'Visita', fecha: '2026-08-05', hora: '10:30', estado: 'Realizada', notas: 'Relevamiento de stock y renegociación de plazos de pago.', proximaGestion: '2026-09-05' },
  { id: 'a2', clienteCodigo: 'C0528', cliente: 'Corralón La Estrella', vendedor: 'Marina Sosa', tipo: 'Llamada', fecha: '2026-08-11', hora: '09:15', estado: 'Pendiente', notas: 'Coordinar primera visita de apertura de cuenta.' },
  { id: 'a3', clienteCodigo: 'C0202', cliente: 'Bazar Industrial SA', vendedor: 'Marina Sosa', tipo: 'Visita', fecha: '2026-07-22', hora: '15:00', estado: 'Realizada', notas: 'Presentación de catálogo y condiciones comerciales.', proximaGestion: '2026-08-22' },
  { id: 'a4', clienteCodigo: 'C0598', cliente: 'Materiales del Oeste', vendedor: 'Marina Sosa', tipo: 'Llamada', fecha: '2026-08-14', hora: '11:00', estado: 'Reprogramada', notas: 'Seguimiento de pedido pendiente de confirmación.' },
  { id: 'a5', clienteCodigo: 'C0110', cliente: 'Corralón San Martín', vendedor: 'Marina Sosa', tipo: 'Visita', fecha: '2026-06-10', hora: '14:30', estado: 'Realizada', notas: 'Reclamo por demora en entrega, resuelto en el lugar.', proximaGestion: '2026-07-10' },
  { id: 'a6', clienteCodigo: 'C0209', cliente: 'Distribuidora Norte', vendedor: 'Lucas Ferreyra', tipo: 'Visita', fecha: '2026-08-06', hora: '09:00', estado: 'Realizada', notas: 'Revisión de exhibidores y reposición de línea climatización.', proximaGestion: '2026-09-06' },
  { id: 'a7', clienteCodigo: 'C0558', cliente: 'Grupo Empresarial Cuyo', vendedor: 'Lucas Ferreyra', tipo: 'Llamada', fecha: '2026-08-13', hora: '16:20', estado: 'Pendiente', notas: 'Confirmar renovación de convenio anual.' },
  { id: 'a8', clienteCodigo: 'C0594', cliente: 'Depósito Belgrano', vendedor: 'Lucas Ferreyra', tipo: 'Visita', fecha: '2026-05-18', hora: '10:00', estado: 'Realizada', notas: 'Relevamiento de ampliación de depósito.', proximaGestion: '2026-08-01' },
  { id: 'a9', clienteCodigo: 'C0472', cliente: 'Casa Roca', vendedor: 'Lucas Ferreyra', tipo: 'Llamada', fecha: '2026-08-04', hora: '12:00', estado: 'Realizada', notas: 'Consulta por nueva lista de precios.', proximaGestion: '2026-09-04' },
  { id: 'a10', clienteCodigo: 'C0201', cliente: 'Materiales Rivadavia', vendedor: 'Lucas Ferreyra', tipo: 'Visita', fecha: '2025-11-27', hora: '13:00', estado: 'Realizada', notas: 'Visita de reactivación de cuenta inactiva.', proximaGestion: '2025-12-27' },
  { id: 'a11', clienteCodigo: 'C0133', cliente: 'Grupo Constructor Andes', vendedor: 'Ezequiel Paz', tipo: 'Visita', fecha: '2026-08-03', hora: '11:30', estado: 'Realizada', notas: 'Relevamiento de obra y pedido de materiales eléctricos.', proximaGestion: '2026-09-03' },
  { id: 'a12', clienteCodigo: 'C0562', cliente: 'Ferretería Patagonia', vendedor: 'Ezequiel Paz', tipo: 'Llamada', fecha: '2026-08-05', hora: '10:00', estado: 'Pendiente', notas: 'Seguimiento de solicitud de ampliación de crédito.' },
  { id: 'a13', clienteCodigo: 'C0138', cliente: 'Hogar & Deco', vendedor: 'Ezequiel Paz', tipo: 'Visita', fecha: '2026-03-02', hora: '09:30', estado: 'Realizada', notas: 'Presentación de nueva línea de pinturería.', proximaGestion: '2026-04-02' },
  { id: 'a14', clienteCodigo: 'C0309', cliente: 'Electro Sur', vendedor: 'Ezequiel Paz', tipo: 'Llamada', fecha: '2026-08-02', hora: '15:45', estado: 'Realizada', notas: 'Coordinación de pedido especial de iluminación.', proximaGestion: '2026-09-02' },
  { id: 'a15', clienteCodigo: 'C0439', cliente: 'Insumos del Litoral', vendedor: 'Ezequiel Paz', tipo: 'Visita', fecha: '2025-03-14', hora: '10:15', estado: 'Realizada', notas: 'Cierre de pedido de temporada.', proximaGestion: '2025-04-14' },
  { id: 'a16', clienteCodigo: 'C0041', cliente: 'Ferretería Del Centro SRL', vendedor: 'Marina Sosa', tipo: 'Llamada', fecha: '2025-12-09', hora: '09:00', estado: 'Realizada', notas: 'Balance de fin de año y proyección para el próximo trimestre.', proximaGestion: '2026-01-09' },
  { id: 'a17', clienteCodigo: 'C0558', cliente: 'Grupo Empresarial Cuyo', vendedor: 'Lucas Ferreyra', tipo: 'Visita', fecha: '2025-09-16', hora: '11:00', estado: 'Realizada', notas: 'Auditoría de condiciones comerciales vigentes.', proximaGestion: '2025-10-16' },
  { id: 'a18', clienteCodigo: 'C0138', cliente: 'Hogar & Deco', vendedor: 'Ezequiel Paz', tipo: 'Llamada', fecha: '2026-01-20', hora: '14:00', estado: 'Reprogramada', notas: 'Reprogramar visita por obra en curso.' },
  { id: 'a19', clienteCodigo: 'C0110', cliente: 'Corralón San Martín', vendedor: 'Marina Sosa', tipo: 'Llamada', fecha: '2026-02-11', hora: '10:45', estado: 'Realizada', notas: 'Consulta por devolución de mercadería.', proximaGestion: '2026-03-11' },
  { id: 'a20', clienteCodigo: 'C0472', cliente: 'Casa Roca', vendedor: 'Lucas Ferreyra', tipo: 'Visita', fecha: '2026-06-30', hora: '16:00', estado: 'Pendiente', notas: 'Visita de seguimiento post ampliación de crédito.' },
]

// Para cada cliente, mira su última gestión registrada: si fue una llamada/visita
// ya AGENDADA (Pendiente/Reprogramada) cuya fecha ya llegó o pasó, o si fue una
// gestión Realizada cuya "próxima gestión" ya se cumplió, ese cliente necesita
// una gestión hoy. `vendedorFiltro` es opcional (null = todo el equipo).
export function clientesAGestionarHoy(vendedorFiltro) {
  const base = vendedorFiltro ? clientes.filter((c) => c.vendedorAsignado === vendedorFiltro) : clientes

  return base
    .map((c) => {
      const historial = actividadesAgendaSemilla
        .filter((a) => a.clienteCodigo === c.codigo)
        .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`))
      const ultima = historial[0]
      if (!ultima) return null

      if ((ultima.estado === 'Pendiente' || ultima.estado === 'Reprogramada') && ultima.fecha <= HOY_DEMO_ISO) {
        return { cliente: c, motivo: 'programada', ultima, fechaReferencia: ultima.fecha }
      }
      if (ultima.estado === 'Realizada' && ultima.proximaGestion && ultima.proximaGestion <= HOY_DEMO_ISO) {
        return { cliente: c, motivo: 'seguimiento', ultima, fechaReferencia: ultima.proximaGestion }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.fechaReferencia.localeCompare(b.fechaReferencia))
}

// ---------------------------------------------------------------------
// Faro: score de desvío por cliente
// ---------------------------------------------------------------------
// Deuda vencida (comprobantes con saldo pendiente) de un cliente puntual,
// y hace cuántos días está vencido el más antiguo de esos comprobantes.
export function moraPorCliente(razonSocial) {
  const pendientes = comprobantes.filter((c) => c.cliente === razonSocial && c.saldo > 0)
  const saldoTotal = pendientes.reduce((acc, c) => acc + c.saldo, 0)
  const diasMax = pendientes.reduce((max, c) => Math.max(max, diasTranscurridos(c.fecha)), 0)
  return { saldoTotal, diasMax, cantidad: pendientes.length }
}

// Días desde la última gestión registrada con ese cliente (cualquier tipo o
// estado) — null si nunca se le registró ninguna. Misma lógica que ya usa
// scoreOportunidad, pero por cliente en vez de por oportunidad.
export function diasSinContactoCliente(razonSocial) {
  const ultima = actividadesAgendaSemilla
    .filter((a) => a.cliente === razonSocial && a.fecha <= HOY_DEMO_ISO)
    .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`))[0]
  if (!ultima) return null
  return Math.round((new Date(`${HOY_DEMO_ISO}T00:00:00`) - new Date(`${ultima.fecha}T00:00:00`)) / 86_400_000)
}

// Score de prioridad (0-100) para la solapa Faro: qué tan urgente es
// gestionar a ese cliente hoy. Combina 3 señales que ya existen en el
// sistema — misma filosofía que scoreOportunidad (sin backend ni IA, pesos
// fijos sobre datos reales): 40% caída de venta vs. el período anterior,
// 30% mora vencida, 30% días sin contacto comercial.
function scoreCaida(evolucionPct) {
  return evolucionPct >= 0 ? 0 : Math.min(100, Math.round(Math.abs(evolucionPct)))
}
function scoreMora(diasMax, saldoTotal) {
  if (saldoTotal <= 0) return 0
  if (diasMax <= 15) return 20
  if (diasMax <= 30) return 45
  if (diasMax <= 60) return 70
  if (diasMax <= 90) return 90
  return 100
}
function scoreSinContacto(dias) {
  if (dias === null) return 100
  if (dias <= 7) return 0
  if (dias <= 14) return 25
  if (dias <= 30) return 50
  if (dias <= 60) return 75
  return 100
}
export function scoreDesvioCliente({ evolucionPct, mora, diasSinContacto }) {
  const caidaScore = scoreCaida(evolucionPct)
  const moraScore = scoreMora(mora.diasMax, mora.saldoTotal)
  const contactoScore = scoreSinContacto(diasSinContacto)
  return Math.round(caidaScore * 0.4 + moraScore * 0.3 + contactoScore * 0.3)
}

// ---------------------------------------------------------------------
// Helpers de fecha -> período
// ---------------------------------------------------------------------
export function indexOfFecha(fechaISO) {
  const [y, m] = fechaISO.split('-')
  return indexOfPeriod(`${y}-${m}`)
}
