import axiosClient from '../api/axiosClient';
import {
  CreateMedicationPetPayload,
  Medication,
  MedicationPet,
  UpdateMedicationPetPayload,
} from '../types/medicationPet';

/** Mensaje genérico con el código del servidor, para poder diagnosticar (ej. "error 500"). */
function serverErrorMessage(error: any, base: string): string {
  const status = error?.response?.status;
  return status
    ? `${base} El servidor respondió con error ${status}. Intentá nuevamente.`
    : `${base} No hay conexión con el servidor. Intentá nuevamente.`;
}

/**
 * Obtiene el listado de tratamientos/medicamentos registrados para una mascota específica.
 */
export async function fetchMedicationPets(petId: number): Promise<MedicationPet[]> {
  const response = await axiosClient.get<MedicationPet[]>(`/medication-pets/?idPet=${petId}`);
  return response.data;
}

/**
 * Tratamientos que todavía no terminaron, de todas las mascotas del dueño.
 * Lo usa el módulo de notificaciones para programar los avisos de cada toma.
 */
export async function fetchMedicationReminders(): Promise<MedicationPet[]> {
  const response = await axiosClient.get<MedicationPet[]>('/medication-pets/reminders/');
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
      errorData?.startTime?.[0] ||
      errorData?.endDate?.[0] ||
      errorData?.idMedication?.[0] ||
      errorData?.idPet?.[0] ||
      errorData?.notes?.[0] ||
      serverErrorMessage(error, 'No se pudo registrar la medicación.');
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

/**
 * Elimina (baja lógica) un tratamiento de medicación de una mascota.
 */
export async function deleteMedicationPet(id: number): Promise<void> {
  try {
    await axiosClient.delete(`/medication-pets/${id}/`);
  } catch (error: any) {
    const errorData = error.response?.data;
    const message = errorData?.detail || 'No se pudo eliminar el tratamiento. Intenta nuevamente.';
    throw new Error(message);
  }
}

/**
 * Modifica (parcialmente) un tratamiento de medicación existente.
 */
export async function updateMedicationPet(
  id: number,
  payload: UpdateMedicationPetPayload,
): Promise<MedicationPet> {
  try {
    const response = await axiosClient.patch<MedicationPet>(`/medication-pets/${id}/`, payload);
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
      errorData?.startTime?.[0] ||
      errorData?.endDate?.[0] ||
      errorData?.notes?.[0] ||
      serverErrorMessage(error, 'No se pudo modificar la medicación.');
    throw new Error(message);
  }
}

