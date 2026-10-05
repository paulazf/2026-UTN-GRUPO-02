import { apiUrl } from './api'
import type { MedicalTest, MedicalTestInput, MedicalTestStatus } from '../types/medicalTest'

const BASE = `${apiUrl}/api/v1/medical-test/`

/** Error de la API con los mensajes por campo que devuelve DRF. */
export class ApiError extends Error {
  status: number
  fields: Record<string, string[]>

  constructor(status: number, body: unknown) {
    const fields: Record<string, string[]> = {}
    let message = 'Ocurrió un error. Probá de nuevo.'
    if (body && typeof body === 'object') {
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        fields[key] = Array.isArray(value) ? value.map(String) : [String(value)]
      }
      message = fields.detail?.[0] ?? Object.values(fields)[0]?.[0] ?? message
    }
    if (status === 404) message = fields.detail?.[0] ?? 'No se encontró el estudio.'
    super(message)
    this.status = status
    this.fields = fields
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch {
    throw new ApiError(0, { detail: 'No hay conexión con el servidor.' })
  }
  if (response.status === 204) return undefined as T
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, body)
  return body as T
}

function toFormData(input: MedicalTestInput): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || key === 'file') continue
    form.append(key, String(value))
  }
  if (input.file) {
    // React Native acepta { uri, name, type } como archivo en FormData.
    form.append('file', {
      uri: input.file.uri,
      name: input.file.name,
      type: input.file.mimeType,
    } as unknown as Blob)
  }
  return form
}

/** TDD-0011: listado por mascota (o de todas si no se pasa idPet). */
export function listMedicalTests(params: { idPet?: number; status?: MedicalTestStatus } = {}) {
  const query = new URLSearchParams()
  if (params.idPet !== undefined) query.append('idPet', String(params.idPet))
  if (params.status) query.append('status', params.status)
  const qs = query.toString()
  return request<MedicalTest[]>(qs ? `${BASE}?${qs}` : BASE)
}

export function getMedicalTest(id: number) {
  return request<MedicalTest>(`${BASE}${id}/`)
}

/** TDD-0010 */
export function createMedicalTest(input: MedicalTestInput) {
  return request<MedicalTest>(BASE, { method: 'POST', body: toFormData(input) })
}

/** TDD-0012: solo se mandan los campos que cambiaron. */
export function updateMedicalTest(id: number, changes: MedicalTestInput) {
  return request<MedicalTest>(`${BASE}${id}/`, { method: 'PATCH', body: toFormData(changes) })
}

/** TDD-0013: baja lógica. */
export function deleteMedicalTest(id: number) {
  return request<void>(`${BASE}${id}/`, { method: 'DELETE' })
}
