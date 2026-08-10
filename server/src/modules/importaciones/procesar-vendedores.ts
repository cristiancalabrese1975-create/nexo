import type { Worksheet } from 'exceljs'
import { randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { usuario } from '../../db/schema'
import { hashPassword } from '../auth/password'
import { celdaTexto, filaVacia, FILA_PRIMER_DATO } from './excel-helpers'
import type { FilaErrorImportacion, ResultadoProcesamiento } from './procesar-ventas'

const COL = { nombre: 2, apellido: 3, dni: 4, rol: 5, email: 6, whatsapp: 7, linkReunion: 8 } as const

function claveTemporal(): string {
  return randomBytes(6).toString('base64url') // ej. 'aB3-xQ9k' — se muestra una sola vez en la respuesta
}

function mapearRol(texto: string | null): 'vendedor' | 'gerente' | null {
  const t = (texto ?? '').trim().toLowerCase()
  if (t === 'vendedor') return 'vendedor'
  if (t === 'gerente') return 'gerente'
  return null
}

export interface CredencialGenerada {
  dni: string
  nombre: string
  apellido: string
  claveTemporal: string
}

export async function procesarVendedores(
  db: Database,
  empresaId: string,
  worksheet: Worksheet,
): Promise<ResultadoProcesamiento & { credenciales: CredencialGenerada[] }> {
  const existentes = await db.select({ dni: usuario.dni }).from(usuario).where(eq(usuario.empresaId, empresaId))
  const dnisExistentes = new Set(existentes.map((u) => u.dni))

  const errores: FilaErrorImportacion[] = []
  const credenciales: CredencialGenerada[] = []
  let filasTotal = 0
  let filasOk = 0

  let fila = FILA_PRIMER_DATO
  while (!filaVacia(worksheet, fila, 8)) {
    filasTotal++
    const errsFila: FilaErrorImportacion[] = []

    const nombre = celdaTexto(worksheet, fila, COL.nombre)
    const apellido = celdaTexto(worksheet, fila, COL.apellido)
    const dni = celdaTexto(worksheet, fila, COL.dni)
    const rol = mapearRol(celdaTexto(worksheet, fila, COL.rol))

    if (!nombre) errsFila.push({ fila, columna: 'Nombre', mensaje: 'Falta el nombre.' })
    if (!apellido) errsFila.push({ fila, columna: 'Apellido', mensaje: 'Falta el apellido.' })
    if (!dni) errsFila.push({ fila, columna: 'DNI', mensaje: 'Falta el DNI.' })
    if (dni && dnisExistentes.has(dni)) errsFila.push({ fila, columna: 'DNI', valor: dni, mensaje: `Ya existe un usuario con DNI '${dni}' en esta empresa.` })
    if (!rol) errsFila.push({ fila, columna: 'Rol', mensaje: "Rol inválido — usar 'Vendedor' o 'Gerente'." })

    if (errsFila.length > 0) {
      errores.push(...errsFila)
      fila++
      continue
    }

    const clave = claveTemporal()
    const passwordHash = await hashPassword(clave)
    await db.insert(usuario).values({
      empresaId,
      dni: dni!,
      passwordHash,
      nombre: nombre!,
      apellido: apellido!,
      rol: rol!,
      email: celdaTexto(worksheet, fila, COL.email) ?? undefined,
      whatsapp: celdaTexto(worksheet, fila, COL.whatsapp) ?? undefined,
      linkReunion: celdaTexto(worksheet, fila, COL.linkReunion) ?? undefined,
    })
    dnisExistentes.add(dni!)
    credenciales.push({ dni: dni!, nombre: nombre!, apellido: apellido!, claveTemporal: clave })
    filasOk++
    fila++
  }

  return { filasTotal, filasOk, errores, credenciales }
}
