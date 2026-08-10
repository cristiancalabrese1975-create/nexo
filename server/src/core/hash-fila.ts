import { sha256 } from './crypto'

/** Hash determinístico de una línea de venta — reimportar el mismo archivo (o una fila repetida) no duplica. */
export function hashFilaVenta(partes: {
  empresaId: string
  fecha: string
  clienteId: string
  lineaId: string
  productoId: string | null
  comprobanteNumero: string | null
  cantidad: string
  monto: string
}): string {
  return sha256(
    [
      partes.empresaId,
      partes.fecha,
      partes.clienteId,
      partes.lineaId,
      partes.productoId ?? '',
      partes.comprobanteNumero ?? '',
      partes.cantidad,
      partes.monto,
    ].join('|'),
  )
}
