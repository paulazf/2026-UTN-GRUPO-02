import axios, { AxiosError } from 'axios';
import axiosClient from '../api/axiosClient';
import { Feeding, FeedingPayload } from '../types/feeding';

const BASE_URL = '/feedings/';

export class FeedingApiError extends Error {
  status: number;
  fields: Record<string, string[]>;

  constructor(status: number, body: unknown, fallback: string) {
    const fields: Record<string, string[]> = {};
    if (body && typeof body === 'object') {
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        fields[key] = Array.isArray(value) ? value.map(String) : [String(value)];
      }
    }
    const message =
      fields.detail?.[0] ??
      Object.values(fields)[0]?.[0] ??
      fallback;
    super(message);
    this.name = 'FeedingApiError';
    this.status = status;
    this.fields = fields;
  }
}

function toFeedingApiError(error: unknown, fallback: string): FeedingApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>;
    return new FeedingApiError(
      axiosError.response?.status ?? 0,
      axiosError.response?.data,
      axiosError.response ? fallback : 'No hay conexión con el servidor.',
    );
  }
  return new FeedingApiError(0, null, fallback);
}

export async function fetchFeedings(petId: number): Promise<Feeding[]> {
  try {
    const response = await axiosClient.get<Feeding[]>(BASE_URL, {
      params: { idPet: petId },
    });
    return response.data;
  } catch (error) {
    throw toFeedingApiError(error, 'No se pudo cargar la alimentación.');
  }
}

export async function createFeeding(payload: FeedingPayload): Promise<Feeding> {
  try {
    const response = await axiosClient.post<Feeding>(BASE_URL, payload);
    return response.data;
  } catch (error) {
    throw toFeedingApiError(error, 'No se pudo registrar la alimentación.');
  }
}

export async function updateFeeding(id: number, payload: FeedingPayload): Promise<Feeding> {
  try {
    const response = await axiosClient.patch<Feeding>(`${BASE_URL}${id}/`, payload);
    return response.data;
  } catch (error) {
    throw toFeedingApiError(error, 'No se pudo modificar la alimentación.');
  }
}

export async function deleteFeeding(id: number): Promise<void> {
  try {
    await axiosClient.delete(`${BASE_URL}${id}/`);
  } catch (error) {
    throw toFeedingApiError(error, 'No se pudo eliminar la alimentación.');
  }
}
