// Reemplazo de src/data/mockData.js con datos reales: recibe la
// respuesta de GET /reportes/base (ver src/api/reportes.js) y expone las
// mismas funciones/formas que el mock (`lineas`, `valorLinea`,
// `clasificarClientesABC`, etc.) para que el resto de cada página no
// tenga que cambiar — sólo el origen del dato cambia, de generado a
// consultado. Los `indices` que reciben estas funciones son posiciones
// dentro de `base.periodos`, que a su vez calza 1:1 con `PERIODS` de
// src/data/periods.js (mismo rango: enero del año anterior a "hoy").
import { clasificarPorAcumulado } from './abc'

// Placeholder seguro para usar como `base` mientras useCatalogoBase()
// todavía está cargando — así los componentes pueden llamar
// createLiveData(base ?? EMPTY_BASE) y mantener el mismo orden de hooks
// en cada render (React exige que los hooks no se salteen condicionalmente;
// with un objeto vacío, todo el cálculo da 0/[] hasta que llegan los datos
// reales, en vez de tener que cortar el render antes de tiempo).
export const EMPTY_BASE = {
  periodos: [],
  hoy: '',
  lineas: [],
  clientes: [],
  skus: [],
  vendedores: [],
  ventaClientePorPeriodo: {},
  ventaLineaPorPeriodo: {},
  objetivoLineaPorPeriodo: {},
  ventaSkuPorPeriodo: {},
  ventaVendedorPorPeriodo: {},
  lineasPorCliente: {},
  skusPorCliente: {},
  objetivoEmpresaPorPeriodo: [],
  ventaEmpresaPorPeriodo: [],
  inflacionPorPeriodo: [],
}

function sumaSerie(serie, indices, modo) {
  if (!serie) return 0
  return indices.reduce((acc, i) => {
    const punto = serie[i]
    if (!punto) return acc
    return acc + (modo === 'unidades' ? punto.unidades : punto.monto)
  }, 0)
}

export function createLiveData(base) {
  const lineas = base.lineas
  const clientes = base.clientes
  const skus = base.skus
  const vendedores = base.vendedores.map((v) => v.nombre)
  const vendedorPorNombre = Object.fromEntries(base.vendedores.map((v) => [v.nombre, v]))

  // Precio promedio real (monto/unidades acumulado en todo el rango
  // cargado) — reemplaza el `precioPromedio` fijo que el mock guardaba
  // como dato de línea; acá es el promedio ponderado real de venta.
  function precioPromedioLinea(id) {
    const serie = base.ventaLineaPorPeriodo[id] ?? []
    const monto = serie.reduce((acc, p) => acc + p.monto, 0)
    const unidades = serie.reduce((acc, p) => acc + p.unidades, 0)
    return unidades > 0 ? monto / unidades : 1
  }

  function valorLinea(id, indices, modo = 'pesos') {
    return sumaSerie(base.ventaLineaPorPeriodo[id], indices, modo)
  }
  function ventaLineaRango(id, indices) {
    return valorLinea(id, indices, 'pesos')
  }
  function objetivoLineaRango(id, indices) {
    const serie = base.objetivoLineaPorPeriodo[id]
    if (!serie) return 0
    return indices.reduce((acc, i) => acc + (serie[i] ?? 0), 0)
  }

  function valorSku(id, indices, modo = 'pesos') {
    return sumaSerie(base.ventaSkuPorPeriodo[id], indices, modo)
  }
  function ventaSkuRango(id, indices) {
    return valorSku(id, indices, 'pesos')
  }

  function valorCliente(codigo, indices, modo = 'pesos') {
    return sumaSerie(base.ventaClientePorPeriodo[codigo], indices, modo)
  }
  function ventaClienteRango(codigo, indices) {
    return valorCliente(codigo, indices, 'pesos')
  }

  function ventaVendedorRango(nombre, indices) {
    return sumaSerie(base.ventaVendedorPorPeriodo[nombre], indices, 'pesos')
  }

  function clasificarLineasABC(indices) {
    return clasificarPorAcumulado(lineas.map((l) => ({ key: l.id, venta: ventaLineaRango(l.id, indices) })))
  }
  function clasificarSkusABC(indices) {
    return clasificarPorAcumulado(skus.map((s) => ({ key: s.id, venta: ventaSkuRango(s.id, indices) })))
  }
  function clasificarClientesABC(indices) {
    return clasificarPorAcumulado(clientes.map((c) => ({ key: c.codigo, venta: ventaClienteRango(c.codigo, indices) })))
  }

  // lineasPorCliente/skusPorCliente del backend vienen como ids; se
  // resuelven acá a nombre de línea (mismo shape que el mock) y a la
  // lista de SKU (ids, igual que el mock).
  const lineaNombrePorId = Object.fromEntries(lineas.map((l) => [l.id, l.nombre]))
  const lineasPreferidasPorCliente = Object.fromEntries(
    Object.entries(base.lineasPorCliente).map(([codigo, ids]) => [codigo, ids.map((id) => lineaNombrePorId[id]).filter(Boolean)]),
  )
  const skusPreferidosPorCliente = base.skusPorCliente

  const clientesPorSku = {}
  Object.entries(skusPreferidosPorCliente).forEach(([codigoCliente, skuIds]) => {
    skuIds.forEach((skuId) => {
      ;(clientesPorSku[skuId] ??= []).push(codigoCliente)
    })
  })

  function vendedoresDelSku(skuId) {
    const codigos = clientesPorSku[skuId] ?? []
    const vends = new Set(codigos.map((cod) => clientes.find((c) => c.codigo === cod)?.vendedorAsignado).filter(Boolean))
    return [...vends]
  }

  const skusPorLinea = skus.reduce((acc, s) => {
    ;(acc[s.lineaId] ??= []).push(s)
    return acc
  }, {})

  function whatsappVendedor(nombreVendedor, mensaje) {
    const v = vendedorPorNombre[nombreVendedor]
    if (!v?.whatsapp) return null
    return `https://wa.me/${v.whatsapp}?text=${encodeURIComponent(mensaje)}`
  }

  // Resumen a nivel empresa (reemplazo directo de resumenPorPeriodo/unidadesPorPeriodo del mock).
  const resumenPorPeriodo = base.periodos.map((p, i) => {
    const venta = base.ventaEmpresaPorPeriodo[i]?.venta ?? 0
    const objetivo = base.objetivoEmpresaPorPeriodo[i] ?? 0
    const avance = objetivo > 0 ? Math.round((venta / objetivo) * 100) : null
    const ventaDiariaProyectada = Math.round((venta - objetivo) / 22)
    return { ...p, venta, objetivo, avance, ventaDiariaProyectada }
  })
  const unidadesPorPeriodo = base.periodos.map((p, i) => ({ ...p, unidades: base.ventaEmpresaPorPeriodo[i]?.unidades ?? 0 }))

  function ventaResumenRango(indices) {
    return indices.reduce((acc, i) => acc + (resumenPorPeriodo[i]?.venta ?? 0), 0)
  }
  function unidadesResumenRango(indices) {
    return indices.reduce((acc, i) => acc + (unidadesPorPeriodo[i]?.unidades ?? 0), 0)
  }

  // Inflación acumulada compuesta entre dos períodos — mismo criterio que
  // la función homónima del mock (y de server/src/core/periodos.ts).
  function inflacionAcumulada(desdeIndexExclusivo, hastaIndexInclusive) {
    if (desdeIndexExclusivo < -1 || hastaIndexInclusive < desdeIndexExclusivo) return null
    let acumulado = 1
    for (let i = Math.max(0, desdeIndexExclusivo + 1); i <= hastaIndexInclusive; i++) {
      const valor = base.inflacionPorPeriodo[i]
      if (valor === null || valor === undefined) return null
      acumulado *= 1 + valor / 100
    }
    return (acumulado - 1) * 100
  }

  return {
    periodos: base.periodos,
    hoy: base.hoy,
    lineas,
    clientes,
    skus,
    vendedores,
    valorLinea,
    ventaLineaRango,
    precioPromedioLinea,
    objetivoLineaRango,
    valorSku,
    ventaSkuRango,
    valorCliente,
    ventaClienteRango,
    ventaVendedorRango,
    clasificarLineasABC,
    clasificarSkusABC,
    clasificarClientesABC,
    lineasPreferidasPorCliente,
    skusPreferidosPorCliente,
    clientesPorSku,
    vendedoresDelSku,
    skusPorLinea,
    whatsappVendedor,
    resumenPorPeriodo,
    unidadesPorPeriodo,
    ventaResumenRango,
    unidadesResumenRango,
    inflacionAcumulada,
  }
}

// ---------------------------------------------------------------------
// Vista diaria: opera sobre el ledger crudo de GET /reportes/diario (un
// mes puntual, sin agrupar) — mismo criterio que serieDiariaCliente/
// Linea/Sku del mock, ahora agrupando filas reales en vez de generarlas.
// ---------------------------------------------------------------------
function diasEnMes(year, month) {
  return new Date(year, month, 0).getDate()
}

function serieDiariaPorDimension(diario, dimensionKey, id, year, month, modo) {
  const dias = diasEnMes(year, month)
  const porDia = new Map()
  for (const f of diario?.filas ?? []) {
    if (f[dimensionKey] !== id) continue
    const actual = porDia.get(f.day) ?? 0
    porDia.set(f.day, actual + (modo === 'unidades' ? f.cantidad : f.monto))
  }
  return Array.from({ length: dias }, (_, i) => ({ day: i + 1, venta: porDia.get(i + 1) ?? 0 }))
}

export function serieDiariaCliente(diario, codigo, year, month, modo) {
  return serieDiariaPorDimension(diario, 'clienteId', codigo, year, month, modo)
}
export function serieDiariaLinea(diario, id, year, month, modo) {
  return serieDiariaPorDimension(diario, 'lineaId', id, year, month, modo)
}
export function serieDiariaSku(diario, id, year, month, modo) {
  return serieDiariaPorDimension(diario, 'productoId', id, year, month, modo)
}
