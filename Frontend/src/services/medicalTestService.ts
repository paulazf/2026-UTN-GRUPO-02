import { apiUrl } from './api';
import { MedicalTest, MedicalTestPayload, MedicalTestStatus } from '../types/medicalTest';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = `${apiUrl}/api/v1/medical-test/`;

// Helper para obtener el header de autorización
async function getAuthHeader() {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    return token ? `Token ${token}` : '';
  } catch (err) {
    return '';
  }
}

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
  const authHeader = await getAuthHeader();
  const headers = new Headers(init?.headers);
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (err) {
    console.warn('Error de red en', url, err);
    throw new ApiError(0, { detail: 'No hay conexión con el servidor.' });
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

// Los envíos con archivos van por el XMLHttpRequest de React Native y no por fetch:
// - expo/fetch (el fetch global desde Expo SDK 57) no acepta archivos { uri, name, type } en FormData.
// - Leer el archivo desde JS con expo-file-system falla en Android con las rutas que devuelven
//   los selectores ("Missing 'READ' permission"). Con XHR el archivo lo lee el código nativo.
async function sendForm<T>(method: 'POST' | 'PATCH', url: string, form: FormData): Promise<T> {
  const authHeader = await getAuthHeader();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Accept', 'application/json');
    if (authHeader) {
      xhr.setRequestHeader('Authorization', authHeader);
    }
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else reject(new ApiError(xhr.status, body));
    };
    xhr.onerror = () => {
      console.warn('Error de red en', url);
      reject(new ApiError(0, { detail: 'No hay conexión con el servidor.' }));
    };
    xhr.send(form);
  });
}

// El nombre va sin espacios ni acentos porque React Native lo manda URL-encodeado
function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_');
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
    // Formato de archivo de React Native: el XHR nativo lee el contenido desde la uri
    form.append('newFiles', {
      uri: file.uri,
      name: safeFileName(file.name),
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
  return sendForm<MedicalTest>('POST', BASE_URL, toFormData(payload));
}

// TDD-0012: solo se mandan los campos que cambiaron
export async function updateMedicalTest(
  id: number,
  changes: MedicalTestPayload,
): Promise<MedicalTest> {
  return sendForm<MedicalTest>('PATCH', `${BASE_URL}${id}/`, toFormData(changes));
}

// TDD-0013: baja lógica
export async function deleteMedicalTest(id: number): Promise<void> {
  return request<void>(`${BASE_URL}${id}/`, { method: 'DELETE' });
}
