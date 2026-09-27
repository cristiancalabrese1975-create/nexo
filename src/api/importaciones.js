import { apiFetch } from './client'

export async function listarImportaciones() {
  return apiFetch('/importaciones') // { items }
}

export async function importarArchivo(tipo, archivo) {
  const formData = new FormData()
  formData.append('tipo', tipo)
  formData.append('archivo', archivo)
  return apiFetch('/importaciones', { method: 'POST', body: formData })
}
