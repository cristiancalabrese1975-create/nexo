import type { Worksheet } from 'exceljs'

/** Las plantillas de Nexo (ver Nexo_*.xlsx en la raíz del repo) tienen: fila 1 título, fila 2 instrucción, fila 3 encabezados, fila 4+ datos. */
export const FILA_ENCABEZADOS = 3
export const FILA_PRIMER_DATO = FILA_ENCABEZADOS + 1

export function celdaTexto(worksheet: Worksheet, fila: number, columna: number): string | null {
  const valor = worksheet.getRow(fila).getCell(columna).value
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'object' && 'text' in (valor as object)) return String((valor as { text: unknown }).text).trim()
  return String(valor).trim() || null
}

export function celdaNumero(worksheet: Worksheet, fila: number, columna: number): number | null {
  const valor = worksheet.getRow(fila).getCell(columna).value
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

/** Acepta tanto una celda de fecha real de Excel como un string 'dd/mm/aaaa'. Devuelve 'YYYY-MM-DD' o null si no se pudo parsear. */
export function celdaFechaISO(worksheet: Worksheet, fila: number, columna: number): string | null {
  const valor = worksheet.getRow(fila).getCell(columna).value
  if (valor === null || valor === undefined) return null
  if (valor instanceof Date) return valor.toISOString().slice(0, 10)
  const texto = String(valor).trim()
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto)
  if (!m) return null
  const [, d, mo, y] = m
  return `${y}-${mo!.padStart(2, '0')}-${d!.padStart(2, '0')}`
}

export function filaVacia(worksheet: Worksheet, fila: number, columnas: number): boolean {
  for (let c = 1; c <= columnas; c++) {
    const v = worksheet.getRow(fila).getCell(c).value
    if (v !== null && v !== undefined && String(v).trim() !== '') return false
  }
  return true
}
