import axiosClient from '../api/axiosClient';
import { CreateMedicationPetPayload, Medication, MedicationPet } from '../types/medicationPet';

/**
 * Obtiene el listado de tratamientos/medicamentos registrados para una mascota específica.
 */
export async function fetchMedicationPets(petId: number): Promise<MedicationPet[]> {
  const response = await axiosClient.get<MedicationPet[]>(`/medication-pets/?idPet=${petId}`);
  return response.data;
}

/**
 * Registra un nuevo medicamento/tratamiento asociado a una mascota.
 */
export async function createMedicationPet(payload: CreateMedicationPetPayload): Promise<MedicationPet> {
  try {
    const response = await axiosClient.post<MedicationPet>('/medication-pets/', payload);
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    const nonFieldError = Array.isArray(errorData?.non_field_errors)
      ? errorData.non_field_errors[0]
      : errorData?.non_field_errors;

    const message =
      errorData?.detail ||
      nonFieldError ||
      errorData?.frequencyHours?.[0] ||
      errorData?.quantityDose?.[0] ||
      errorData?.startDate?.[0] ||
      errorData?.endDate?.[0] ||
      errorData?.idMedication?.[0] ||
      errorData?.idPet?.[0] ||
      errorData?.notes?.[0] ||
      'No se pudo registrar la medicación. Intenta nuevamente.';
    throw new Error(message);
  }
}

/**
 * Obtiene el catálogo activo de medicamentos precargados en el sistema.
 */
export async function fetchMedications(): Promise<Medication[]> {
  const response = await axiosClient.get<Medication[]>('/medications/');
  return response.data;
}

