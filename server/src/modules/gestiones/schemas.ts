import { z } from 'zod'

export const crearGestionSchema = z.object({
  clienteId: z.string().uuid(),
  vendedorId: z.string().uuid().optional(), // ignorado si el rol es 'vendedor': se fuerza a sí mismo
  oportunidadId: z.string().uuid().optional(),
  tipo: z.enum(['visita', 'llamada', 'videollamada', 'email', 'whatsapp']),
  estado: z.enum(['pendiente', 'realizada', 'reprogramada', 'cancelada']),
  fecha: z.string().date(),
  hora: z.string().optional(),
  notas: z.string().optional(),
  proximaGestion: z.string().date().optional(),
  plataforma: z.enum(['Zoom', 'Teams']).optional(),
})
