import { apiUrl } from './api'

/** Datos mínimos de la mascota que usa la pantalla de estudios (API de EP02). */
export interface PetSummary {
  id: number
  name: string
  birthDate: string
  age: number | null
  breed: { id: number; name: string; species: 'DOG' | 'CAT' }
}

export async function getPet(id: number): Promise<PetSummary> {
  const response = await fetch(`${apiUrl}/api/v1/pets/${id}/`)
  if (!response.ok) throw new Error('No se encontró la mascota.')
  return response.json()
}
