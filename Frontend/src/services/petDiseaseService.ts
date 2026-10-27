import axiosClient from '../api/axiosClient';
import {
  CreatePetDiseasePayload,
  Disease,
  PetDisease,
  UpdatePetDiseasePayload,
} from '../types/petDisease';

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
    const nonFieldError = Array.isArray(errorData?.non_field_errors)
      ? errorData.non_field_errors[0]
      : errorData?.non_field_errors;

    const message =
      errorData?.detail ||
      nonFieldError ||
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

/**
 * Elimina (baja lógica) una condición médica de una mascota.
 */
export async function deletePetDisease(id: number): Promise<void> {
  try {
    await axiosClient.delete(`/pet-diseases/${id}/`);
  } catch (error: any) {
    const errorData = error.response?.data;
    const message = errorData?.detail || 'No se pudo eliminar la condición. Intenta nuevamente.';
    throw new Error(message);
  }
}

/**
 * Modifica (parcialmente) una condición médica registrada de una mascota.
 */
export async function updatePetDisease(
  id: number,
  payload: UpdatePetDiseasePayload,
): Promise<PetDisease> {
  try {
    const response = await axiosClient.patch<PetDisease>(`/pet-diseases/${id}/`, payload);
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    const nonFieldError = Array.isArray(errorData?.non_field_errors)
      ? errorData.non_field_errors[0]
      : errorData?.non_field_errors;

    const message =
      errorData?.detail ||
      nonFieldError ||
      errorData?.startDate?.[0] ||
      errorData?.endDate?.[0] ||
      errorData?.notes?.[0] ||
      'No se pudo modificar la condición. Intenta nuevamente.';
    throw new Error(message);
  }
}
