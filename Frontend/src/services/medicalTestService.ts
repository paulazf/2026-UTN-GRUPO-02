import { apiUrl } from './api';
import { MedicalTest, MedicalTestPayload, MedicalTestStatus } from '../types/medicalTest';

const BASE_URL = `${apiUrl}/api/v1/medical-test/`;

// Error de la API con los mensajes por campo que devuelve DRF
export class ApiError extends Error {
  status: number;
  fields: Record<string, string[]>;

  constructor(status: number, body: unknown) {
    const fields: Record<string, string[]> = {};
    let message = 'Ocurrió un error. Probá de nuevo.';
    if (body && typeof body === 'object') {
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        fields[key] = Array.isArray(value) ? value.map(String) : [String(value)];
      }
      message = fields.detail?.[0] ?? Object.values(fields)[0]?.[0] ?? message;
    }
    if (status === 404) message = fields.detail?.[0] ?? 'No se encontró el estudio.';
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(0, { detail: 'No hay conexión con el servidor.' });
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

// El back recibe multipart/form-data porque el estudio puede llevar archivos.
// Las listas se mandan repitiendo la clave (newFiles, newFiles, ...)
function toFormData(payload: MedicalTestPayload): FormData {
  const form = new FormData();
  const { newFiles, removedFiles, ...fields } = payload;
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, String(value));
  }
  for (const id of removedFiles ?? []) form.append('removedFiles', String(id));
  for (const file of newFiles ?? []) {
    // React Native acepta { uri, name, type } como archivo en FormData
    form.append('newFiles', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);
  }
  return form;
}

// TDD-0011: listado de estudios de una mascota
export async function fetchMedicalTests(
  petId: number,
  status?: MedicalTestStatus,
): Promise<MedicalTest[]> {
  const query = new URLSearchParams({ idPet: String(petId) });
  if (status) query.append('status', status);
  return request<MedicalTest[]>(`${BASE_URL}?${query.toString()}`);
}

export async function fetchMedicalTestById(id: number): Promise<MedicalTest> {
  return request<MedicalTest>(`${BASE_URL}${id}/`);
}

// TDD-0010
export async function createMedicalTest(payload: MedicalTestPayload): Promise<MedicalTest> {
  return request<MedicalTest>(BASE_URL, { method: 'POST', body: toFormData(payload) });
}

// TDD-0012: solo se mandan los campos que cambiaron
export async function updateMedicalTest(
  id: number,
  changes: MedicalTestPayload,
): Promise<MedicalTest> {
  return request<MedicalTest>(`${BASE_URL}${id}/`, { method: 'PATCH', body: toFormData(changes) });
}

// TDD-0013: baja lógica
export async function deleteMedicalTest(id: number): Promise<void> {
  return request<void>(`${BASE_URL}${id}/`, { method: 'DELETE' });
}
