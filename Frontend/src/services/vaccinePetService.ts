import axiosClient from '../api/axiosClient';
import { PetSpecies } from '../types/pet';
import {
  CreateVaccinePetPayload,
  UpdateVaccinePetPayload,
  Vaccine,
  VaccinePet,
} from '../types/vaccinePet';

const FIELDS_IN_ORDER = [
  'detail',
  'non_field_errors',
  'idVaccine',
  'doseNumber',
  'applicationDate',
  'expirationDate',
  'idPet',
  'notes',
];

/** Toma el primer mensaje de error que devuelve DRF (por campo o general). */
function apiErrorMessage(error: any, fallback: string): string {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return fallback;
  for (const field of FIELDS_IN_ORDER) {
    const value = data[field];
    if (Array.isArray(value) && value.length) return String(value[0]);
    if (typeof value === 'string' && value) return value;
  }
  return fallback;
}

/**
 * Última aplicación de cada vacuna o antiparasitario de la mascota.
 * GET /api/v1/vaccine-pets/?idPet=X&latest=true
 */
export async function fetchVaccinePets(petId: number): Promise<VaccinePet[]> {
  const response = await axiosClient.get<VaccinePet[]>('/vaccine-pets/', {
    params: { idPet: petId, latest: 'true' },
  });
  return response.data;
}

/**
 * Catálogo activo filtrado por especie (incluye los que sirven para ambas).
 * GET /api/v1/vaccines/?species=CAT
 */
export async function fetchVaccines(species?: PetSpecies): Promise<Vaccine[]> {
  const response = await axiosClient.get<Vaccine[]>('/vaccines/', {
    params: species ? { species } : undefined,
  });
  return response.data;
}

export async function createVaccinePet(payload: CreateVaccinePetPayload): Promise<VaccinePet> {
  try {
    const response = await axiosClient.post<VaccinePet>('/vaccine-pets/', payload);
    return response.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, 'No se pudo registrar la vacuna. Intentá nuevamente.'));
  }
}

export async function updateVaccinePet(id: number, changes: UpdateVaccinePetPayload): Promise<VaccinePet> {
  try {
    const response = await axiosClient.patch<VaccinePet>(`/vaccine-pets/${id}/`, changes);
    return response.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, 'No se pudo actualizar la vacuna. Intentá nuevamente.'));
  }
}

export async function deleteVaccinePet(id: number): Promise<void> {
  try {
    await axiosClient.delete(`/vaccine-pets/${id}/`);
  } catch (error) {
    throw new Error(apiErrorMessage(error, 'No se pudo eliminar la vacuna. Intentá nuevamente.'));
  }
}
