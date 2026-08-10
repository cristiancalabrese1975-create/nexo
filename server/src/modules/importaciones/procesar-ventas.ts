import type { Worksheet } from 'exceljs'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { cliente, lineaProducto, producto, usuario, ventaItem } from '../../db/schema'
import { hashFilaVenta } from '../../core/hash-fila'
import { celdaFechaISO, celdaNumero, celdaTexto, filaVacia, FILA_PRIMER_DATO } from './excel-helpers'

export interface FilaErrorImportacion {
  fila: number
  columna?: string
  valor?: string
  mensaje: string
}

export interface ResultadoProcesamiento {
  filasTotal: number
  filasOk: number
  errores: FilaErrorImportacion[]
}

const COL = { fecha: 1, codigoCliente: 2, vendedor: 5, linea: 6, sku: 7, cantidad: 8, monto: 9 } as const

/**
 * Procesa la hoja "Historial de ventas" (ver Nexo_Historial_de_Ventas.xlsx).
 * Los maestros (cliente, línea, producto, vendedor) tienen que existir de
 * antemano — el importador de ventas no crea maestros, sólo valida contra
 * ellos y reporta fila/columna/motivo de cada error.
 */
export async function procesarVentas(
  db: Database,
  empresaId: string,
  importacionId: string,
  worksheet: Worksheet,
): Promise<ResultadoProcesamiento> {
  const [clientes, lineas, productos, vendedores] = await Promise.all([
    db.select({ id: cliente.id, codigo: cliente.codigo, vendedorId: cliente.vendedorId }).from(cliente).where(eq(cliente.empresaId, empresaId)),
    db.select({ id: lineaProducto.id, nombre: lineaProducto.nombre }).from(lineaProducto).where(eq(lineaProducto.empresaId, empresaId)),
    db.select({ id: producto.id, codigo: producto.codigo, lineaId: producto.lineaId }).from(producto).where(eq(producto.empresaId, empresaId)),
    db
      .select({ id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido })
      .from(usuario)
      .where(and(eq(usuario.empresaId, empresaId), eq(usuario.activo, true))),
  ])

  const clientesPorCodigo = new Map(clientes.map((c) => [c.codigo.toLowerCase(), c]))
  const lineasPorNombre = new Map(lineas.map((l) => [l.nombre.toLowerCase(), l]))
  const productosPorCodigo = new Map(productos.map((p) => [p.codigo.toLowerCase(), p]))
  const vendedoresPorNombre = new Map(vendedores.map((v) => [`${v.nombre} ${v.apellido}`.toLowerCase(), v]))

  const errores: FilaErrorImportacion[] = []
  let filasTotal = 0
  let filasOk = 0

  let fila = FILA_PRIMER_DATO
  while (!filaVacia(worksheet, fila, 9)) {
    filasTotal++
    const errsFila: FilaErrorImportacion[] = []

    const fechaISO = celdaFechaISO(worksheet, fila, COL.fecha)
    if (!fechaISO) errsFila.push({ fila, columna: 'Fecha', valor: celdaTexto(worksheet, fila, COL.fecha) ?? '', mensaje: 'Fecha inválida — usar formato dd/mm/aaaa.' })

    const codigoCliente = celdaTexto(worksheet, fila, COL.codigoCliente)
    const clienteFila = codigoCliente ? clientesPorCodigo.get(codigoCliente.toLowerCase()) : undefined
    if (!codigoCliente) errsFila.push({ fila, columna: 'Código de cliente', mensaje: 'Falta el código de cliente.' })
    else if (!clienteFila) errsFila.push({ fila, columna: 'Código de cliente', valor: codigoCliente, mensaje: `No existe ningún cliente con código '${codigoCliente}'.` })

    const nombreLinea = celdaTexto(worksheet, fila, COL.linea)
    const lineaFila = nombreLinea ? lineasPorNombre.get(nombreLinea.toLowerCase()) : undefined
    if (!nombreLinea) errsFila.push({ fila, columna: 'Línea de producto', mensaje: 'Falta la línea de producto.' })
    else if (!lineaFila) errsFila.push({ fila, columna: 'Línea de producto', valor: nombreLinea, mensaje: `No existe la línea '${nombreLinea}'.` })

    const skuCodigo = celdaTexto(worksheet, fila, COL.sku)
    const productoFila = skuCodigo ? productosPorCodigo.get(skuCodigo.toLowerCase()) : undefined
    if (skuCodigo && !productoFila) errsFila.push({ fila, columna: 'SKU / Código de producto', valor: skuCodigo, mensaje: `No existe ningún producto con código '${skuCodigo}'.` })

    const cantidad = celdaNumero(worksheet, fila, COL.cantidad)
    if (cantidad === null || cantidad <= 0) errsFila.push({ fila, columna: 'Cantidad (unidades)', mensaje: 'Cantidad inválida — debe ser un número mayor a 0.' })

    const monto = celdaNumero(worksheet, fila, COL.monto)
    if (monto === null || monto < 0) errsFila.push({ fila, columna: 'Monto ($ ARS)', mensaje: 'Monto inválido — debe ser un número mayor o igual a 0.' })

    const nombreVendedor = celdaTexto(worksheet, fila, COL.vendedor)
    const vendedorFila = nombreVendedor ? vendedoresPorNombre.get(nombreVendedor.toLowerCase()) : undefined
    if (nombreVendedor && !vendedorFila) errsFila.push({ fila, columna: 'Vendedor', valor: nombreVendedor, mensaje: `No existe ningún vendedor llamado '${nombreVendedor}'.` })

    if (errsFila.length > 0) {
      errores.push(...errsFila)
      fila++
      continue
    }

    const vendedorId = vendedorFila?.id ?? clienteFila!.vendedorId ?? null
    const cantidadStr = String(cantidad)
    const montoStr = String(monto)
    const hashFila = hashFilaVenta({
      empresaId,
      fecha: fechaISO!,
      clienteId: clienteFila!.id,
      lineaId: lineaFila!.id,
      productoId: productoFila?.id ?? null,
      comprobanteNumero: null,
      cantidad: cantidadStr,
      monto: montoStr,
    })

    await db
      .insert(ventaItem)
      .values({
        empresaId,
        fecha: fechaISO!,
        clienteId: clienteFila!.id,
        vendedorId,
        lineaId: lineaFila!.id,
        productoId: productoFila?.id,
        cantidad: cantidadStr,
        monto: montoStr,
        importacionId,
        origen: 'import',
        hashFila,
      })
      .onConflictDoNothing({ target: [ventaItem.empresaId, ventaItem.hashFila] })

    filasOk++
    fila++
  }

  return { filasTotal, filasOk, errores }
}
