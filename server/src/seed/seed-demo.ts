// Seed de demo: carga la misma empresa, usuarios, clientes, líneas, SKUs,
// pipeline y agenda que hoy vive en src/data/mockData.js, pero como filas
// reales — desde acá la demo comercial corre sobre base de datos.
//
// Importante: NO es un espejo byte-a-byte del mock. El mock generaba
// `ventasClientesPorPeriodo`, `ventasLineasPorPeriodo` y
// `ventasSkuPorPeriodo` como tres series ALEATORIAS INDEPENDIENTES (no
// hay ninguna venta_item subyacente en el mock — son fórmulas separadas
// para cada pantalla, y no suman entre sí). Una base de datos real sólo
// puede tener UNA verdad: acá generamos el total mensual por cliente con
// la misma técnica determinística que el mock (mismos nombres, mismo
// orden de magnitud, misma estacionalidad) y lo repartimos entre sus
// líneas/SKU preferidos — así que los totales por cliente coinciden con
// el espíritu de la demo, pero los totales por línea/SKU son ahora una
// AGREGACIÓN real y consistente del mismo ledger, no una serie aparte.
import 'dotenv/config'
import { and, eq, sql } from 'drizzle-orm'
import { db, closeDb } from '../db/client'
import * as schema from '../db/schema'
import { hashPassword } from '../modules/auth/password'
import { hashFilaVenta } from '../core/hash-fila'
import { rangoPeriodos, primerDiaDelMes, type Periodo } from '../core/periodos'
import { seedFromString, seededRandom } from './rng'

const HOY_DEMO_ISO = '2026-08-06'
const PERIODOS: Periodo[] = rangoPeriodos({ year: 2025, month: 1, key: '2025-01' }, { year: 2026, month: 8, key: '2026-08' })

// ---------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------
const USUARIOS = [
  { dni: '30111222', clave: '1234', nombre: 'Marina', apellido: 'Sosa', rol: 'vendedor' as const, whatsapp: '5491122223333' },
  { dni: '28555777', clave: '1234', nombre: 'Lucas', apellido: 'Ferreyra', rol: 'vendedor' as const, whatsapp: '5492214445566' },
  { dni: '32999444', clave: '1234', nombre: 'Ezequiel', apellido: 'Paz', rol: 'vendedor' as const, whatsapp: '5493514447788' },
  { dni: '25444888', clave: 'gerente', nombre: 'Roberto', apellido: 'Aguirre', rol: 'gerente' as const, whatsapp: '5491133335555' },
]

// ---------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------
const CATEGORIAS = ['Mayorista', 'Distribuidor', 'Minorista'] as const
const BASE_VENTA_CATEGORIA: Record<string, number> = { Mayorista: 650_000, Distribuidor: 380_000, Minorista: 170_000 }
const PRECIO_PROMEDIO_CATEGORIA: Record<string, number> = { Mayorista: 9200, Distribuidor: 6100, Minorista: 3200 }

const CLIENTES = [
  { codigo: 'C0041', razonSocial: 'Ferretería Del Centro SRL', categoria: 'Mayorista', vendedorDni: '30111222' },
  { codigo: 'C0110', razonSocial: 'Corralón San Martín', categoria: 'Distribuidor', vendedorDni: '30111222' },
  { codigo: 'C0133', razonSocial: 'Grupo Constructor Andes', categoria: 'Mayorista', vendedorDni: '32999444' },
  { codigo: 'C0138', razonSocial: 'Hogar & Deco', categoria: 'Minorista', vendedorDni: '32999444' },
  { codigo: 'C0201', razonSocial: 'Materiales Rivadavia', categoria: 'Distribuidor', vendedorDni: '28555777' },
  { codigo: 'C0202', razonSocial: 'Bazar Industrial SA', categoria: 'Mayorista', vendedorDni: '30111222' },
  { codigo: 'C0209', razonSocial: 'Distribuidora Norte', categoria: 'Distribuidor', vendedorDni: '28555777' },
  { codigo: 'C0309', razonSocial: 'Electro Sur', categoria: 'Minorista', vendedorDni: '32999444' },
  { codigo: 'C0439', razonSocial: 'Insumos del Litoral', categoria: 'Mayorista', vendedorDni: '32999444' },
  { codigo: 'C0472', razonSocial: 'Casa Roca', categoria: 'Minorista', vendedorDni: '28555777' },
  { codigo: 'C0528', razonSocial: 'Corralón La Estrella', categoria: 'Distribuidor', vendedorDni: '30111222' },
  { codigo: 'C0558', razonSocial: 'Grupo Empresarial Cuyo', categoria: 'Mayorista', vendedorDni: '28555777' },
  { codigo: 'C0562', razonSocial: 'Ferretería Patagonia', categoria: 'Minorista', vendedorDni: '32999444' },
  { codigo: 'C0594', razonSocial: 'Depósito Belgrano', categoria: 'Distribuidor', vendedorDni: '28555777' },
  { codigo: 'C0598', razonSocial: 'Materiales del Oeste', categoria: 'Mayorista', vendedorDni: '30111222' },
]

// ---------------------------------------------------------------------
// Líneas + direcciones + SKUs
// ---------------------------------------------------------------------
const LINEAS = [
  { codigo: 'l1', nombre: 'Electrodomésticos', direccion: 'DIR BSAS/INT', ventaBase: 2_172_318, objetivoBase: 2_715_602, precioPromedio: 42_000 },
  { codigo: 'l2', nombre: 'Climatización', direccion: 'DIR BSAS/INT', ventaBase: 1_450_261, objetivoBase: 2_614_465, precioPromedio: 35_000 },
  { codigo: 'l3', nombre: 'Herramientas', direccion: 'DIR BSAS/INT', ventaBase: 1_073_811, objetivoBase: 950_000, precioPromedio: 8_500 },
  { codigo: 'l4', nombre: 'Iluminación', direccion: 'DIR NORTE', ventaBase: 604_439, objetivoBase: 655_059, precioPromedio: 3_800 },
  { codigo: 'l5', nombre: 'Ferretería general', direccion: 'DIR NORTE', ventaBase: 1_262_768, objetivoBase: 1_653_495, precioPromedio: 2_600 },
  { codigo: 'l6', nombre: 'Pinturería', direccion: 'DIR NORTE', ventaBase: 1_375_111, objetivoBase: 1_636_858, precioPromedio: 3_200 },
  { codigo: 'l7', nombre: 'Jardín y exterior', direccion: 'DIR CUYO', ventaBase: 872_542, objetivoBase: 1_615_722, precioPromedio: 4_800 },
  { codigo: 'l8', nombre: 'Materiales eléctricos', direccion: 'DIR CUYO', ventaBase: 2_373_903, objetivoBase: 2_363_945, precioPromedio: 1_900 },
  { codigo: 'l9', nombre: 'Sanitarios', direccion: 'DIR CUYO', ventaBase: 817_749, objetivoBase: 2_363_945, precioPromedio: 7_200 },
  { codigo: 'l10', nombre: 'Construcción en seco', direccion: 'DIR SUR', ventaBase: 1_305_322, objetivoBase: 2_591_048, precioPromedio: 1_700 },
  { codigo: 'l11', nombre: 'Fijaciones', direccion: 'DIR SUR', ventaBase: 663_470, objetivoBase: 2_370_302, precioPromedio: 320 },
]

const NOMBRES_SKU_POR_LINEA: Record<string, string[]> = {
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

const comprobantesSeed = [
  { clienteCodigo: 'C0041', numero: 'A0003-00076849', fecha: '2026-07-10', importe: 1_614_366, saldo: 1_614_366 },
  { clienteCodigo: 'C0110', numero: 'A0003-00077265', fecha: '2026-07-24', importe: 1_233_650, saldo: 1_233_650 },
  { clienteCodigo: 'C0133', numero: 'A0003-00077504', fecha: '2026-08-01', importe: 1_229_600, saldo: 1_229_600 },
  { clienteCodigo: 'C0138', numero: 'A0003-00076959', fecha: '2026-07-15', importe: 1_151_448, saldo: 1_151_448 },
  { clienteCodigo: 'C0201', numero: 'A0003-00077264', fecha: '2026-07-24', importe: 1_025_658, saldo: 1_025_658 },
  { clienteCodigo: 'C0202', numero: 'A0003-00077505', fecha: '2026-08-01', importe: 856_379, saldo: 856_379 },
  { clienteCodigo: 'C0209', numero: 'A0003-00077027', fecha: '2026-07-17', importe: 850_113, saldo: 850_113 },
  { clienteCodigo: 'C0309', numero: 'A0003-00077547', fecha: '2026-07-18', importe: 815_589, saldo: 815_589 },
  { clienteCodigo: 'C0439', numero: 'A0003-00077158', fecha: '2026-07-22', importe: 748_029, saldo: 748_029 },
  { clienteCodigo: 'C0472', numero: 'A0003-00077111', fecha: '2026-07-21', importe: 741_040, saldo: 704_513 },
  { clienteCodigo: 'C0528', numero: 'B0001-00185675', fecha: '2026-08-04', importe: 699_863, saldo: 699_863 },
  { clienteCodigo: 'C0558', numero: 'A0003-00076792', fecha: '2026-07-08', importe: 691_476, saldo: 691_476 },
  { clienteCodigo: 'C0562', numero: 'B0001-00184103', fecha: '2026-07-23', importe: 660_643, saldo: 660_643 },
  { clienteCodigo: 'C0594', numero: 'A0002-00065210', fecha: '2025-11-12', importe: 980_500, saldo: 0 },
  { clienteCodigo: 'C0598', numero: 'A0002-00061044', fecha: '2025-06-05', importe: 1_420_300, saldo: 0 },
  { clienteCodigo: 'C0133', numero: 'A0002-00058877', fecha: '2025-03-20', importe: 875_200, saldo: 0 },
  { clienteCodigo: 'C0309', numero: 'A0002-00070125', fecha: '2026-02-14', importe: 612_400, saldo: 0 },
  { clienteCodigo: 'C0202', numero: 'A0002-00072980', fecha: '2026-04-09', importe: 530_900, saldo: 530_900 },
]

const ETAPAS = [
  { codigo: 'prospecto', nombre: 'Prospecto', orden: 0, color: '#94a3b8', tipo: 'abierta' as const },
  { codigo: 'contactado', nombre: 'Contactado', orden: 1, color: '#60a5fa', tipo: 'abierta' as const },
  { codigo: 'propuesta', nombre: 'Propuesta', orden: 2, color: '#fbbf24', tipo: 'abierta' as const },
  { codigo: 'negociacion', nombre: 'Negociación', orden: 3, color: '#fb923c', tipo: 'abierta' as const },
  { codigo: 'ganado', nombre: 'Ganado', orden: 4, color: '#4ade80', tipo: 'ganada' as const },
  { codigo: 'perdido', nombre: 'Perdido', orden: 5, color: '#f87171', tipo: 'perdida' as const },
]

const OPORTUNIDADES = [
  { titulo: 'Reposición trimestral', clienteCodigo: 'C0041', vendedorDni: '30111222', valor: 1_850_000, etapa: 'negociacion', fecha: '2026-08-10' },
  { titulo: 'Ampliación línea climatización', clienteCodigo: 'C0209', vendedorDni: '28555777', valor: 3_200_000, etapa: 'propuesta', fecha: '2026-08-14' },
  { titulo: 'Apertura de cuenta', clienteCodigo: 'C0528', vendedorDni: '30111222', valor: 950_000, etapa: 'prospecto', fecha: '2026-08-20' },
  { titulo: 'Pedido materiales eléctricos', clienteCodigo: 'C0133', vendedorDni: '32999444', valor: 2_640_000, etapa: 'contactado', fecha: '2026-08-12' },
  { titulo: 'Renovación anual', clienteCodigo: 'C0558', vendedorDni: '28555777', valor: 5_100_000, etapa: 'ganado', fecha: '2026-07-30' },
  { titulo: 'Cotización obra nueva', clienteCodigo: 'C0138', vendedorDni: '32999444', valor: 1_180_000, etapa: 'propuesta', fecha: '2026-08-16' },
  { titulo: 'Primer pedido', clienteCodigo: 'C0202', vendedorDni: '30111222', valor: 720_000, etapa: 'prospecto', fecha: '2026-08-22' },
  { titulo: 'Ampliación crédito', clienteCodigo: 'C0562', vendedorDni: '32999444', valor: 1_450_000, etapa: 'negociacion', fecha: '2026-08-09' },
  { titulo: 'Pedido especial iluminación', clienteCodigo: 'C0309', vendedorDni: '32999444', valor: 630_000, etapa: 'contactado', fecha: '2026-08-13' },
  { titulo: 'Convenio anual', clienteCodigo: 'C0594', vendedorDni: '28555777', valor: 2_980_000, etapa: 'ganado', fecha: '2026-07-28' },
  { titulo: 'Pedido de temporada', clienteCodigo: 'C0439', vendedorDni: '32999444', valor: 1_340_000, etapa: 'ganado', fecha: '2025-03-18' },
  { titulo: 'Reactivación de cuenta', clienteCodigo: 'C0201', vendedorDni: '28555777', valor: 610_000, etapa: 'perdido', fecha: '2025-05-22' },
  { titulo: 'Compra de insumos', clienteCodigo: 'C0472', vendedorDni: '28555777', valor: 480_000, etapa: 'ganado', fecha: '2025-07-11' },
  { titulo: 'Ampliación de línea', clienteCodigo: 'C0202', vendedorDni: '30111222', valor: 2_100_000, etapa: 'ganado', fecha: '2025-09-05' },
  { titulo: 'Pedido cancelado', clienteCodigo: 'C0110', vendedorDni: '30111222', valor: 390_000, etapa: 'perdido', fecha: '2025-10-14' },
  { titulo: 'Renovación de convenio', clienteCodigo: 'C0562', vendedorDni: '32999444', valor: 1_760_000, etapa: 'ganado', fecha: '2025-12-02' },
  { titulo: 'Nueva cuenta industrial', clienteCodigo: 'C0598', vendedorDni: '30111222', valor: 3_450_000, etapa: 'ganado', fecha: '2026-01-20' },
  { titulo: 'Pedido rechazado', clienteCodigo: 'C0138', vendedorDni: '32999444', valor: 540_000, etapa: 'perdido', fecha: '2026-03-08' },
  { titulo: 'Ampliación de depósito', clienteCodigo: 'C0594', vendedorDni: '28555777', valor: 2_250_000, etapa: 'ganado', fecha: '2026-04-17' },
  { titulo: 'Cotización perdida', clienteCodigo: 'C0133', vendedorDni: '32999444', valor: 980_000, etapa: 'perdido', fecha: '2026-06-25' },
]

const GESTIONES = [
  { clienteCodigo: 'C0041', vendedorDni: '30111222', tipo: 'visita', fecha: '2026-08-05', hora: '10:30', estado: 'realizada', notas: 'Relevamiento de stock y renegociación de plazos de pago.', proximaGestion: '2026-09-05' },
  { clienteCodigo: 'C0528', vendedorDni: '30111222', tipo: 'llamada', fecha: '2026-08-11', hora: '09:15', estado: 'pendiente', notas: 'Coordinar primera visita de apertura de cuenta.' },
  { clienteCodigo: 'C0202', vendedorDni: '30111222', tipo: 'visita', fecha: '2026-07-22', hora: '15:00', estado: 'realizada', notas: 'Presentación de catálogo y condiciones comerciales.', proximaGestion: '2026-08-22' },
  { clienteCodigo: 'C0598', vendedorDni: '30111222', tipo: 'llamada', fecha: '2026-08-14', hora: '11:00', estado: 'reprogramada', notas: 'Seguimiento de pedido pendiente de confirmación.' },
  { clienteCodigo: 'C0110', vendedorDni: '30111222', tipo: 'visita', fecha: '2026-06-10', hora: '14:30', estado: 'realizada', notas: 'Reclamo por demora en entrega, resuelto en el lugar.', proximaGestion: '2026-07-10' },
  { clienteCodigo: 'C0209', vendedorDni: '28555777', tipo: 'visita', fecha: '2026-08-06', hora: '09:00', estado: 'realizada', notas: 'Revisión de exhibidores y reposición de línea climatización.', proximaGestion: '2026-09-06' },
  { clienteCodigo: 'C0558', vendedorDni: '28555777', tipo: 'llamada', fecha: '2026-08-13', hora: '16:20', estado: 'pendiente', notas: 'Confirmar renovación de convenio anual.' },
  { clienteCodigo: 'C0594', vendedorDni: '28555777', tipo: 'visita', fecha: '2026-05-18', hora: '10:00', estado: 'realizada', notas: 'Relevamiento de ampliación de depósito.', proximaGestion: '2026-08-01' },
  { clienteCodigo: 'C0472', vendedorDni: '28555777', tipo: 'llamada', fecha: '2026-08-04', hora: '12:00', estado: 'realizada', notas: 'Consulta por nueva lista de precios.', proximaGestion: '2026-09-04' },
  { clienteCodigo: 'C0201', vendedorDni: '28555777', tipo: 'visita', fecha: '2025-11-27', hora: '13:00', estado: 'realizada', notas: 'Visita de reactivación de cuenta inactiva.', proximaGestion: '2025-12-27' },
  { clienteCodigo: 'C0133', vendedorDni: '32999444', tipo: 'visita', fecha: '2026-08-03', hora: '11:30', estado: 'realizada', notas: 'Relevamiento de obra y pedido de materiales eléctricos.', proximaGestion: '2026-09-03' },
  { clienteCodigo: 'C0562', vendedorDni: '32999444', tipo: 'llamada', fecha: '2026-08-05', hora: '10:00', estado: 'pendiente', notas: 'Seguimiento de solicitud de ampliación de crédito.' },
  { clienteCodigo: 'C0138', vendedorDni: '32999444', tipo: 'visita', fecha: '2026-03-02', hora: '09:30', estado: 'realizada', notas: 'Presentación de nueva línea de pinturería.', proximaGestion: '2026-04-02' },
  { clienteCodigo: 'C0309', vendedorDni: '32999444', tipo: 'llamada', fecha: '2026-08-02', hora: '15:45', estado: 'realizada', notas: 'Coordinación de pedido especial de iluminación.', proximaGestion: '2026-09-02' },
  { clienteCodigo: 'C0439', vendedorDni: '32999444', tipo: 'visita', fecha: '2025-03-14', hora: '10:15', estado: 'realizada', notas: 'Cierre de pedido de temporada.', proximaGestion: '2025-04-14' },
  { clienteCodigo: 'C0041', vendedorDni: '30111222', tipo: 'llamada', fecha: '2025-12-09', hora: '09:00', estado: 'realizada', notas: 'Balance de fin de año y proyección para el próximo trimestre.', proximaGestion: '2026-01-09' },
  { clienteCodigo: 'C0558', vendedorDni: '28555777', tipo: 'visita', fecha: '2025-09-16', hora: '11:00', estado: 'realizada', notas: 'Auditoría de condiciones comerciales vigentes.', proximaGestion: '2025-10-16' },
  { clienteCodigo: 'C0138', vendedorDni: '32999444', tipo: 'llamada', fecha: '2026-01-20', hora: '14:00', estado: 'reprogramada', notas: 'Reprogramar visita por obra en curso.' },
  { clienteCodigo: 'C0110', vendedorDni: '30111222', tipo: 'llamada', fecha: '2026-02-11', hora: '10:45', estado: 'realizada', notas: 'Consulta por devolución de mercadería.', proximaGestion: '2026-03-11' },
  { clienteCodigo: 'C0472', vendedorDni: '28555777', tipo: 'visita', fecha: '2026-06-30', hora: '16:00', estado: 'pendiente', notas: 'Visita de seguimiento post ampliación de crédito.' },
]

// ---------------------------------------------------------------------
// Helpers de generación (mismo espíritu que genSerieVenta/genObjetivo del mock)
// ---------------------------------------------------------------------
function genSerieMensual(seed: number, base: number): number[] {
  return PERIODOS.map((_p, i) => {
    const trend = 1 + (i / PERIODOS.length) * 0.22
    const seasonal = 1 + 0.13 * Math.sin((i / 12) * Math.PI * 2 + seed)
    const noise = 0.8 + seededRandom(seed * 131 + i * 7) * 0.4
    return Math.max(0, Math.round((base * trend * seasonal * noise) / 1000) * 1000)
  })
}

function genObjetivoMensual(seed: number, base: number): number[] {
  return PERIODOS.map((_p, i) => {
    const trend = 1 + (i / PERIODOS.length) * 0.1
    const noise = 0.97 + seededRandom(seed * 53 + i * 3) * 0.06
    return Math.round((base * trend * noise) / 1000) * 1000
  })
}

function generarPesosReparto(seedBase: number, cantidad: number): number[] {
  const pesos = Array.from({ length: cantidad }, (_, i) => 0.4 + seededRandom(seedBase * 71 + i * 13) * 1.2)
  const total = pesos.reduce((a, b) => a + b, 0)
  return pesos.map((p) => p / total)
}

function elegirLineasPreferidas(codigo: string, lineas: string[]): string[] {
  const seedBase = seedFromString(`${codigo}-lineas`)
  const cantidad = 2 + Math.floor(seededRandom(seedBase) * 3)
  const disponibles = [...lineas]
  const elegidas: string[] = []
  let s = seedBase
  while (elegidas.length < cantidad && disponibles.length) {
    s = s * 1.37 + 7
    const idx = Math.floor(seededRandom(s) * disponibles.length)
    elegidas.push(disponibles.splice(idx, 1)[0]!)
  }
  return elegidas
}

async function main() {
  console.log('→ Sembrando empresa demo…')

  const [empresa] = await db
    .insert(schema.empresa)
    .values({ nombre: 'Nexo Demo', slug: 'nexo-demo', timezone: 'America/Argentina/Buenos_Aires', moneda: 'ARS', plan: 'demo', fechaReferencia: HOY_DEMO_ISO })
    .onConflictDoNothing()
    .returning()
  const empresaFila = empresa ?? (await db.select().from(schema.empresa).where(eq(schema.empresa.slug, 'nexo-demo')))[0]
  const empresaId = empresaFila!.id
  console.log(`  empresa=${empresaId}`)

  // Guarda de idempotencia a nivel de todo el seed (no fila por fila):
  // varias de las tablas de abajo (objetivo, oportunidad, gestion,
  // condicion_comercial, indice_inflacion) tienen columnas de dimensión
  // opcionales (linea_id/vendedor_id/cliente_id nullable) — Postgres
  // trata NULL <> NULL en un índice único, así que un `onConflictDoNothing`
  // fila por fila NO evita duplicar esas filas en una segunda corrida.
  // Más simple y confiable: si esta empresa ya tiene ventas cargadas,
  // asumimos que el seed ya corrió completo y no volvemos a insertar nada.
  const conteoVentas = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.ventaItem)
    .where(eq(schema.ventaItem.empresaId, empresaId))
  const ventasExistentes = conteoVentas[0]?.n ?? 0
  if (ventasExistentes > 0) {
    console.log('⚠ La empresa demo ya tiene ventas cargadas — seed abortado para no duplicar objetivos/oportunidades/gestiones.')
    console.log("  Para recargar desde cero: DELETE FROM empresa WHERE slug = 'nexo-demo'; (cascada) y volver a correr `npm run seed`.")
    return
  }

  // Usuarios
  console.log('→ Usuarios…')
  const usuarioIdPorDni = new Map<string, string>()
  for (const u of USUARIOS) {
    const passwordHash = await hashPassword(u.clave)
    const [fila] = await db
      .insert(schema.usuario)
      .values({ empresaId, dni: u.dni, passwordHash, nombre: u.nombre, apellido: u.apellido, rol: u.rol, whatsapp: u.whatsapp })
      .onConflictDoNothing()
      .returning()
    const id =
      fila?.id ??
      (await db.select({ id: schema.usuario.id }).from(schema.usuario).where(and(eq(schema.usuario.empresaId, empresaId), eq(schema.usuario.dni, u.dni))))[0]?.id
    usuarioIdPorDni.set(u.dni, id!)
  }

  // Categorías
  console.log('→ Categorías de cliente…')
  const categoriaIdPorNombre = new Map<string, string>()
  for (const [i, nombre] of CATEGORIAS.entries()) {
    const [fila] = await db.insert(schema.categoriaCliente).values({ empresaId, nombre, orden: i }).onConflictDoNothing().returning()
    const id =
      fila?.id ??
      (
        await db
          .select({ id: schema.categoriaCliente.id })
          .from(schema.categoriaCliente)
          .where(and(eq(schema.categoriaCliente.empresaId, empresaId), eq(schema.categoriaCliente.nombre, nombre)))
      )[0]?.id
    categoriaIdPorNombre.set(nombre, id!)
  }

  // Direcciones
  console.log('→ Direcciones comerciales…')
  const direccionIdPorNombre = new Map<string, string>()
  const direccionesUnicas = [...new Set(LINEAS.map((l) => l.direccion))]
  for (const nombre of direccionesUnicas) {
    const [fila] = await db.insert(schema.direccionComercial).values({ empresaId, nombre }).onConflictDoNothing().returning()
    const id =
      fila?.id ??
      (
        await db
          .select({ id: schema.direccionComercial.id })
          .from(schema.direccionComercial)
          .where(and(eq(schema.direccionComercial.empresaId, empresaId), eq(schema.direccionComercial.nombre, nombre)))
      )[0]?.id
    direccionIdPorNombre.set(nombre, id!)
  }

  // Líneas
  console.log('→ Líneas de producto…')
  const lineaIdPorCodigo = new Map<string, string>()
  for (const l of LINEAS) {
    const [fila] = await db
      .insert(schema.lineaProducto)
      .values({ empresaId, codigo: l.codigo, nombre: l.nombre, direccionId: direccionIdPorNombre.get(l.direccion) })
      .onConflictDoNothing()
      .returning()
    const id =
      fila?.id ??
      (
        await db
          .select({ id: schema.lineaProducto.id })
          .from(schema.lineaProducto)
          .where(and(eq(schema.lineaProducto.empresaId, empresaId), eq(schema.lineaProducto.codigo, l.codigo)))
      )[0]?.id
    lineaIdPorCodigo.set(l.codigo, id!)
  }

  // Productos (SKU)
  console.log('→ Productos (SKU)…')
  const productosPorLinea = new Map<string, Array<{ id: string; precio: number }>>()
  for (const l of LINEAS) {
    const nombres = NOMBRES_SKU_POR_LINEA[l.codigo] ?? []
    const seedBase = seedFromString(l.codigo)
    const lista: Array<{ id: string; precio: number }> = []
    for (const [i, nombre] of nombres.entries()) {
      const codigo = `${l.codigo.toUpperCase()}-${String(i + 1).padStart(2, '0')}`
      const precio = Math.round(l.precioPromedio * (0.7 + seededRandom(seedBase * 31 + i * 5) * 0.7))
      const [fila] = await db
        .insert(schema.producto)
        .values({ empresaId, codigo, nombre, lineaId: lineaIdPorCodigo.get(l.codigo)!, precioLista: String(precio) })
        .onConflictDoNothing()
        .returning()
      const id =
        fila?.id ??
        (
          await db
            .select({ id: schema.producto.id })
            .from(schema.producto)
            .where(and(eq(schema.producto.empresaId, empresaId), eq(schema.producto.codigo, codigo)))
        )[0]?.id
      lista.push({ id: id!, precio })
    }
    productosPorLinea.set(l.codigo, lista)
  }

  // Clientes
  console.log('→ Clientes…')
  const clienteIdPorCodigo = new Map<string, { id: string; vendedorId: string }>()
  for (const c of CLIENTES) {
    const vendedorId = usuarioIdPorDni.get(c.vendedorDni)!
    const [fila] = await db
      .insert(schema.cliente)
      .values({ empresaId, codigo: c.codigo, razonSocial: c.razonSocial, categoriaId: categoriaIdPorNombre.get(c.categoria), vendedorId })
      .onConflictDoNothing()
      .returning()
    const id =
      fila?.id ??
      (
        await db
          .select({ id: schema.cliente.id })
          .from(schema.cliente)
          .where(and(eq(schema.cliente.empresaId, empresaId), eq(schema.cliente.codigo, c.codigo)))
      )[0]?.id
    clienteIdPorCodigo.set(c.codigo, { id: id!, vendedorId })
  }

  // ---------------------------------------------------------------------
  // Ventas: un ledger único y consistente por cliente, repartido entre sus
  // líneas/SKU preferidos (mismo criterio determinístico que el mock).
  // ---------------------------------------------------------------------
  console.log('→ Generando ventas (esto puede tardar unos segundos)…')
  const nombresLinea = LINEAS.map((l) => l.codigo)
  let totalFilasVenta = 0

  for (const c of CLIENTES) {
    const cli = clienteIdPorCodigo.get(c.codigo)!
    const seedCliente = seedFromString(c.codigo)
    const serieMensual = genSerieMensual(seedCliente, BASE_VENTA_CATEGORIA[c.categoria]!)
    const precioCliente = PRECIO_PROMEDIO_CATEGORIA[c.categoria]!

    const lineasPreferidas = elegirLineasPreferidas(c.codigo, nombresLinea)
    // Un SKU por línea preferida (el de mayor peso) para no explotar el volumen de filas.
    const destinos = lineasPreferidas
      .map((lineaCodigo) => {
        const productos = productosPorLinea.get(lineaCodigo) ?? []
        if (!productos.length) return null
        const idx = Math.floor(seededRandom(seedFromString(`${c.codigo}-${lineaCodigo}-sku`)) * productos.length)
        return { lineaCodigo, producto: productos[idx]! }
      })
      .filter((d): d is { lineaCodigo: string; producto: { id: string; precio: number } } => d !== null)

    if (destinos.length === 0) continue
    const pesosDestino = generarPesosReparto(seedFromString(`${c.codigo}-reparto`), destinos.length)

    for (const [i, periodo] of PERIODOS.entries()) {
      const totalMes = serieMensual[i]!
      if (totalMes <= 0) continue
      const fechaBase = primerDiaDelMes(periodo)
      for (const [j, destino] of destinos.entries()) {
        const monto = Math.round(totalMes * pesosDestino[j]!)
        if (monto <= 0) continue
        const cantidad = Math.max(1, Math.round(monto / (destino.producto.precio || precioCliente)))
        const hashFila = hashFilaVenta({
          empresaId,
          fecha: fechaBase,
          clienteId: cli.id,
          lineaId: lineaIdPorCodigo.get(destino.lineaCodigo)!,
          productoId: destino.producto.id,
          comprobanteNumero: null,
          cantidad: String(cantidad),
          monto: String(monto),
        })
        await db
          .insert(schema.ventaItem)
          .values({
            empresaId,
            fecha: fechaBase,
            clienteId: cli.id,
            vendedorId: cli.vendedorId,
            lineaId: lineaIdPorCodigo.get(destino.lineaCodigo)!,
            productoId: destino.producto.id,
            cantidad: String(cantidad),
            monto: String(monto),
            origen: 'manual',
            hashFila,
          })
          .onConflictDoNothing({ target: [schema.ventaItem.empresaId, schema.ventaItem.hashFila] })
        totalFilasVenta++
      }
    }
  }
  console.log(`  ${totalFilasVenta} filas de venta_item.`)

  // Objetivos: por línea (misma fórmula que genObjetivo del mock) y por empresa (suma de líneas).
  console.log('→ Objetivos…')
  const objetivoEmpresaPorPeriodo = new Array(PERIODOS.length).fill(0)
  for (const l of LINEAS) {
    const seed = seedFromString(l.codigo)
    const serie = genObjetivoMensual(seed, l.objetivoBase)
    for (const [i, periodo] of PERIODOS.entries()) {
      objetivoEmpresaPorPeriodo[i] += serie[i]!
      await db
        .insert(schema.objetivo)
        .values({ empresaId, periodo: primerDiaDelMes(periodo), ambito: 'linea', lineaId: lineaIdPorCodigo.get(l.codigo), monto: String(serie[i]) })
        .onConflictDoNothing()
    }
  }
  for (const [i, periodo] of PERIODOS.entries()) {
    await db
      .insert(schema.objetivo)
      .values({ empresaId, periodo: primerDiaDelMes(periodo), ambito: 'empresa', monto: String(Math.round(objetivoEmpresaPorPeriodo[i])) })
      .onConflictDoNothing()
  }
  // Objetivo por vendedor: reparto proporcional a la cantidad de clientes asignados.
  const vendedoresConClientes = USUARIOS.filter((u) => u.rol === 'vendedor')
  const clientesPorVendedor = new Map<string, number>()
  for (const c of CLIENTES) clientesPorVendedor.set(c.vendedorDni, (clientesPorVendedor.get(c.vendedorDni) ?? 0) + 1)
  const totalClientes = CLIENTES.length
  for (const [i, periodo] of PERIODOS.entries()) {
    for (const v of vendedoresConClientes) {
      const share = (clientesPorVendedor.get(v.dni) ?? 0) / totalClientes
      await db
        .insert(schema.objetivo)
        .values({
          empresaId,
          periodo: primerDiaDelMes(periodo),
          ambito: 'vendedor',
          vendedorId: usuarioIdPorDni.get(v.dni),
          monto: String(Math.round(objetivoEmpresaPorPeriodo[i] * share)),
        })
        .onConflictDoNothing()
    }
  }

  // Inflación (índice global, no específico de la empresa).
  console.log('→ Índice de inflación…')
  for (const [i, periodo] of PERIODOS.entries()) {
    const progreso = i / (PERIODOS.length - 1)
    const base = 5.6 - progreso * 3.9
    const ruido = (seededRandom(i * 17 + 3) - 0.5) * 0.6
    const valor = Math.max(0.6, Math.round((base + ruido) * 10) / 10)
    await db.insert(schema.indiceInflacion).values({ periodo: primerDiaDelMes(periodo), valorPct: String(valor), fuente: 'demo' }).onConflictDoNothing()
  }

  // Comprobantes de cuenta corriente.
  console.log('→ Comprobantes de cuenta corriente…')
  for (const cp of comprobantesSeed) {
    const cli = clienteIdPorCodigo.get(cp.clienteCodigo)
    if (!cli) continue
    await db
      .insert(schema.comprobanteCC)
      .values({
        empresaId,
        clienteId: cli.id,
        numero: cp.numero,
        tipo: 'factura',
        fechaEmision: cp.fecha,
        fechaVencimiento: cp.fecha,
        importe: String(cp.importe),
        saldo: String(cp.saldo),
      })
      .onConflictDoNothing()
  }

  // Etapas de pipeline.
  console.log('→ Etapas de pipeline…')
  const etapaIdPorCodigo = new Map<string, string>()
  for (const e of ETAPAS) {
    const [fila] = await db
      .insert(schema.etapaPipeline)
      .values({ empresaId, codigo: e.codigo, nombre: e.nombre, orden: e.orden, color: e.color, tipo: e.tipo })
      .onConflictDoNothing()
      .returning()
    const id =
      fila?.id ??
      (
        await db
          .select({ id: schema.etapaPipeline.id })
          .from(schema.etapaPipeline)
          .where(and(eq(schema.etapaPipeline.empresaId, empresaId), eq(schema.etapaPipeline.codigo, e.codigo)))
      )[0]?.id
    etapaIdPorCodigo.set(e.codigo, id!)
  }

  // Oportunidades.
  console.log('→ Oportunidades…')
  for (const o of OPORTUNIDADES) {
    const cli = clienteIdPorCodigo.get(o.clienteCodigo)
    if (!cli) continue
    const etapaId = etapaIdPorCodigo.get(o.etapa)!
    const esCierre = o.etapa === 'ganado' || o.etapa === 'perdido'
    await db.insert(schema.oportunidad).values({
      empresaId,
      titulo: o.titulo,
      clienteId: cli.id,
      vendedorId: usuarioIdPorDni.get(o.vendedorDni)!,
      etapaId,
      valor: String(o.valor),
      fechaEstimadaCierre: esCierre ? undefined : o.fecha,
      fechaCierre: esCierre ? o.fecha : undefined,
    })
  }

  // Gestiones (agenda).
  console.log('→ Gestiones de agenda…')
  for (const g of GESTIONES) {
    const cli = clienteIdPorCodigo.get(g.clienteCodigo)
    if (!cli) continue
    await db.insert(schema.gestion).values({
      empresaId,
      clienteId: cli.id,
      vendedorId: usuarioIdPorDni.get(g.vendedorDni)!,
      tipo: g.tipo as 'visita' | 'llamada',
      estado: g.estado as 'realizada' | 'pendiente' | 'reprogramada',
      fecha: g.fecha,
      hora: g.hora,
      notas: g.notas,
      proximaGestion: g.proximaGestion,
    })
  }

  // Condiciones comerciales (descuentos) — ~65% de la cartera, sobre su línea preferida.
  console.log('→ Condiciones comerciales…')
  for (const c of CLIENTES) {
    const seed = seedFromString(`${c.codigo}-descuento`)
    if (seededRandom(seed) <= 0.35) continue
    const descuento = Math.round((seededRandom(seed * 3) * 1200) / 100 * 100) / 100
    const lineasPreferidas = elegirLineasPreferidas(c.codigo, nombresLinea)
    const lineaCodigo = lineasPreferidas[0] ?? nombresLinea[0]!
    const cli = clienteIdPorCodigo.get(c.codigo)!
    await db.insert(schema.condicionComercial).values({
      empresaId,
      clienteId: cli.id,
      lineaId: lineaIdPorCodigo.get(lineaCodigo),
      descuentoPct: String(descuento),
      vigenteDesde: '2025-01-01',
    })
  }

  // Nota: la primera vez que corre el seed, mv_venta_mensual todavía no
  // existe hasta que se aplique db/sql/001_materialized_views.sql (parte
  // de `npm run db:migrate`) — hay que migrar antes de sembrar. Además
  // REFRESH ... CONCURRENTLY exige que la vista ya tenga datos al menos
  // una vez sin CONCURRENTLY; como db:migrate la crea con WITH DATA, este
  // refresh concurrente ya funciona de entrada.
  console.log('→ Refrescando mv_venta_mensual…')
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_venta_mensual`)

  console.log('✔ Seed completo.')
  console.log(`\nLogin de prueba: DNI ${USUARIOS[0]!.dni} / clave ${USUARIOS[0]!.clave} (vendedor)`)
  console.log(`Login gerente:    DNI ${USUARIOS[3]!.dni} / clave ${USUARIOS[3]!.clave}`)
}

main()
  .catch((err) => {
    console.error('❌ Falló el seed:', err)
    process.exitCode = 1
  })
  .finally(() => closeDb())
