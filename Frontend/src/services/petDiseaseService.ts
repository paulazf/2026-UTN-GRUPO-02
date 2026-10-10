import axiosClient from '../api/axiosClient';
import { CreatePetDiseasePayload, Disease, PetDisease } from '../types/petDisease';

/**
 * Obtiene el listado de enfermedades registradas para una mascota específica.
 */
export async function fetchPetDiseases(petId: number): Promise<PetDisease[]> {
  const response = await axiosClient.get<PetDisease[]>(`/pet-diseases/?idPet=${petId}`);
  return response.data;
}

/**
 * Registra una nueva enfermedad/condición asociada a una mascota.
 */
export async function createPetDisease(payload: CreatePetDiseasePayload): Promise<PetDisease> {
  try {
    const response = await axiosClient.post<PetDisease>('/pet-diseases/', payload);
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    const message =
      errorData?.detail ||
      errorData?.non_field_errors?.[0] ||
      errorData?.startDate?.[0] ||
      errorData?.endDate?.[0] ||
      errorData?.idDisease?.[0] ||
      errorData?.idPet?.[0] ||
      errorData?.notes?.[0] ||
      'No se pudo registrar la condición. Intenta nuevamente.';
    throw new Error(message);
  }
}

/**
 * Obtiene el catálogo activo de enfermedades precargadas en el sistema.
 */
export async function fetchDiseases(): Promise<Disease[]> {
  const response = await axiosClient.get<Disease[]>('/diseases/');
  return response.data;
}

