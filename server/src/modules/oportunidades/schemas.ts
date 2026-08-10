import { z } from 'zod'

export const crearOportunidadSchema = z.object({
  titulo: z.string().min(1),
  clienteId: z.string().uuid(),
  vendedorId: z.string().uuid().optional(), // ignorado si el rol es 'vendedor': se fuerza a sí mismo
  valor: z.number().positive(),
  fechaEstimadaCierre: z.string().date().optional(),
  etapaId: z.string().uuid().optional(), // si no viene, se usa la primera etapa abierta
})

export const actualizarOportunidadSchema = z.object({
  titulo: z.string().min(1).optional(),
  valor: z.number().positive().optional(),
  fechaEstimadaCierre: z.string().date().nullable().optional(),
  motivoPerdida: z.string().optional(),
})

export const cambiarEtapaSchema = z.object({
  etapaId: z.string().uuid(),
  motivoPerdida: z.string().optional(),
})
