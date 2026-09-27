// Hooks de React Query — un hook por dominio, consumidos desde las
// páginas. Dashboard/Clientes/Líneas/SKU/Resumen Gerencial usan
// useCatalogoBase() (ver api/reportes.js) en vez de hooks propios acá,
// porque comparten el mismo catálogo+matrices de /reportes/base.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listarGestiones, crearGestion, aGestionarHoy } from './gestiones'
import { listarEtapas, listarOportunidades, crearOportunidad, cambiarEtapaOportunidad } from './oportunidades'
import { listarImportaciones, importarArchivo } from './importaciones'

export function useGestiones(clienteId) {
  return useQuery({ queryKey: ['gestiones', clienteId ?? null], queryFn: () => listarGestiones(clienteId) })
}

export function useAgendaHoy() {
  return useQuery({ queryKey: ['agenda-hoy'], queryFn: aGestionarHoy })
}

export function useCrearGestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: crearGestion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gestiones'] })
      qc.invalidateQueries({ queryKey: ['agenda-hoy'] })
    },
  })
}

export function useEtapas() {
  return useQuery({ queryKey: ['etapas'], queryFn: listarEtapas, staleTime: 5 * 60_000 })
}

export function useOportunidades() {
  return useQuery({ queryKey: ['oportunidades'], queryFn: listarOportunidades })
}

export function useCrearOportunidad() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: crearOportunidad, onSuccess: () => qc.invalidateQueries({ queryKey: ['oportunidades'] }) })
}

export function useImportaciones() {
  return useQuery({ queryKey: ['importaciones'], queryFn: listarImportaciones })
}

export function useImportarArchivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tipo, archivo }) => importarArchivo(tipo, archivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['importaciones'] }),
  })
}

export function useCambiarEtapaOportunidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, etapaId, motivoPerdida }) => cambiarEtapaOportunidad(id, etapaId, motivoPerdida),
    // Actualiza la UI al instante (el drag & drop tiene que sentirse
    // inmediato); si el servidor rechaza el cambio, React Query revierte
    // solo con el refetch de onError.
    onMutate: async ({ id, etapaId }) => {
      await qc.cancelQueries({ queryKey: ['oportunidades'] })
      const previo = qc.getQueryData(['oportunidades'])
      qc.setQueryData(['oportunidades'], (data) => {
        if (!data) return data
        return { ...data, items: data.items.map((o) => (o.id === id ? { ...o, etapaId } : o)) }
      })
      return { previo }
    },
    onError: (_err, _vars, context) => {
      if (context?.previo) qc.setQueryData(['oportunidades'], context.previo)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['oportunidades'] }),
  })
}
