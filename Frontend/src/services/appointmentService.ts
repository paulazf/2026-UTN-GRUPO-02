import axiosClient from '../api/axiosClient';
import {
  Appointment,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from '../types/appointment';
import {
  autoSyncAppointment,
  deleteGoogleCalendarEventByPetlifeId,
} from './googleCalendarService';

export async function fetchAppointments(petId: number): Promise<Appointment[]> {
  try {
    const response = await axiosClient.get<Appointment[]>(`/appointments/?idPet=${petId}`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'No se pudieron cargar los turnos de la mascota.';
    throw new Error(message);
  }
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
  try {
    const response = await axiosClient.post<Appointment>('/appointments/', payload);
    // Auto-sincronización en segundo plano con Google Calendar (con su horario particular)
    autoSyncAppointment(response.data);
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    const nonFieldError = Array.isArray(errorData?.non_field_errors)
      ? errorData.non_field_errors[0]
      : errorData?.non_field_errors;

    const message =
      errorData?.detail ||
      nonFieldError ||
      errorData?.date?.[0] ||
      errorData?.time?.[0] ||
      errorData?.veterinarian?.[0] ||
      errorData?.description?.[0] ||
      errorData?.idAddress?.[0] ||
      'No se pudo agendar el turno. Verificá los datos e intentá nuevamente.';
    throw new Error(message);
  }
}

export async function updateAppointment(
  id: number,
  payload: UpdateAppointmentPayload
): Promise<Appointment> {
  try {
    const response = await axiosClient.patch<Appointment>(`/appointments/${id}/`, payload);
    // Auto-sincronización en segundo plano de la actualización
    autoSyncAppointment(response.data);
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    const nonFieldError = Array.isArray(errorData?.non_field_errors)
      ? errorData.non_field_errors[0]
      : errorData?.non_field_errors;

    const message =
      errorData?.detail ||
      nonFieldError ||
      errorData?.date?.[0] ||
      errorData?.time?.[0] ||
      errorData?.veterinarian?.[0] ||
      errorData?.description?.[0] ||
      errorData?.idAddress?.[0] ||
      'No se pudo actualizar el turno. Verificá los datos e intentá nuevamente.';
    throw new Error(message);
  }
}

export async function deleteAppointment(id: number): Promise<void> {
  try {
    await axiosClient.delete(`/appointments/${id}/`);
    // Eliminación automática de Google Calendar
    deleteGoogleCalendarEventByPetlifeId(`appointment-${id}`);
  } catch (error: any) {
    const message = error.response?.data?.detail || 'No se pudo cancelar el turno. Intenta nuevamente.';
    throw new Error(message);
  }
}

