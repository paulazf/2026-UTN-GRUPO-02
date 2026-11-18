import axios from 'axios';
import type { CalendarEvent } from '../types/calendar';
import type { Appointment } from '../types/appointment';
import type { MedicationPet } from '../types/medicationPet';
import type { VaccinePet } from '../types/vaccinePet';

const GOOGLE_ACCESS_TOKEN_KEY = 'googleAccessToken';
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const DEFAULT_MEDICATION_TIME = '09:00';

// Carga segura de módulos nativos para compatibilidad con entorno de tests (Node puro)
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch (_) {}

let GoogleSignin: any = null;
try {
  const googleModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleModule.GoogleSignin;
} catch (_) {}

/**
 * Guarda el token de acceso de Google en almacenamiento seguro.
 */
export async function saveGoogleAccessToken(token: string): Promise<void> {
  try {
    if (SecureStore?.setItemAsync) {
      await SecureStore.setItemAsync(GOOGLE_ACCESS_TOKEN_KEY, token);
    }
  } catch (error) {
    console.warn('[googleCalendar] No se pudo guardar googleAccessToken en SecureStore:', error);
  }
}

/**
 * Obtiene el token de acceso de Google guardado.
 */
export async function getStoredGoogleAccessToken(): Promise<string | null> {
  try {
    if (SecureStore?.getItemAsync) {
      return await SecureStore.getItemAsync(GOOGLE_ACCESS_TOKEN_KEY);
    }
    return null;
  } catch (error) {
    console.warn('[googleCalendar] Error al recuperar googleAccessToken:', error);
    return null;
  }
}

/**
 * Elimina el token de acceso de Google de almacenamiento seguro.
 */
export async function clearGoogleAccessToken(): Promise<void> {
  try {
    if (SecureStore?.deleteItemAsync) {
      await SecureStore.deleteItemAsync(GOOGLE_ACCESS_TOKEN_KEY);
    }
  } catch (error) {
    console.warn('[googleCalendar] Error al eliminar googleAccessToken:', error);
  }
}

/**
 * Obtiene un token de acceso válido para Google Calendar API.
 * Intenta primero recuperar el token nativo o de SecureStore.
 */
export async function getValidGoogleAccessToken(): Promise<string | null> {
  if (GoogleSignin) {
    try {
      const tokens = await GoogleSignin.getTokens();
      if (tokens?.accessToken) {
        await saveGoogleAccessToken(tokens.accessToken);
        return tokens.accessToken;
      }
    } catch (_) {
      // Si falla la obtención silenciosa, recurrimos al almacenado
    }
  }

  const stored = await getStoredGoogleAccessToken();
  return stored;
}

/**
 * Formatea una fecha local en formato ISO sin zona YYYY-MM-DDTHH:MM:SS.
 */
export function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

/**
 * Parsea fecha YYYY-MM-DD y hora HH:MM a Date local.
 */
export function parseLocalStartDateTime(dateStr: string, timeStr?: string | null): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const timeMatch = /^(\d{2}):(\d{2})/.exec(timeStr || DEFAULT_MEDICATION_TIME);
  if (!dateMatch || !timeMatch) return null;
  const [, y, m, d] = dateMatch.map(Number);
  const [, hh, mm] = timeMatch.map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/**
 * Calcula la hora de fin sumando 1 hora a la hora de inicio en formato HH:MM.
 */
function calculateEndTime(startTime: string): string {
  try {
    const [hoursStr, minutesStr] = startTime.split(':');
    let hours = parseInt(hoursStr, 10) + 1;
    if (hours >= 24) hours = 23;
    const paddedHours = hours.toString().padStart(2, '0');
    return `${paddedHours}:${minutesStr ? minutesStr.substring(0, 2) : '00'}`;
  } catch {
    return startTime;
  }
}

/**
 * Busca si ya existe un evento sincronizado previamente en Google Calendar con el mismo petlifeId.
 */
async function findExistingGoogleCalendarEventId(
  petlifeId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const response = await axios.get(GOOGLE_CALENDAR_API_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        privateExtendedProperty: `petlifeId=${petlifeId}`,
        maxResults: 1,
      },
    });

    const items = response.data?.items;
    if (Array.isArray(items) && items.length > 0) {
      return items[0].id;
    }
    return null;
  } catch (error) {
    console.warn('[googleCalendar] Error buscando evento existente:', error);
    return null;
  }
}

/**
 * Inserta o actualiza un evento en Google Calendar usando su petlifeId como clave idempotente.
 */
async function upsertGoogleCalendarEvent(
  petlifeId: string,
  payload: any,
  providedToken?: string
): Promise<{ success: boolean; id?: string }> {
  try {
    const accessToken = providedToken || (await getValidGoogleAccessToken());
    if (!accessToken) return { success: false };

    const existingId = await findExistingGoogleCalendarEventId(petlifeId, accessToken);
    let res;
    if (existingId) {
      res = await axios.put(`${GOOGLE_CALENDAR_API_BASE}/${existingId}`, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } else {
      res = await axios.post(GOOGLE_CALENDAR_API_BASE, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }
    return { success: true, id: res.data?.id };
  } catch (err: any) {
    console.warn(`[googleCalendar] Error en upsert de ${petlifeId}:`, err?.response?.data || err?.message);
    return { success: false };
  }
}

// -------------------------------------------------------------
// Sincronización de Medicación (Dosis por Dosis con su Hora Exacta)
// -------------------------------------------------------------

/**
 * Sincroniza cada toma particular de un tratamiento de medicación en Google Calendar.
 * Si se toma cada cierta cantidad de horas (ej. 8 hs), programa cada toma a su hora exacta
 * con recordatorio en el momento justo (0 minutos antes) y 10 minutos antes.
 */
export async function syncMedicationTreatmentToGoogleCalendar(
  treatment: MedicationPet,
  providedToken?: string
): Promise<{ syncedDoses: number }> {
  if (treatment.isDeleted || treatment.frequencyHours <= 0 || treatment.quantityDose <= 0) {
    return { syncedDoses: 0 };
  }

  const token = providedToken || (await getValidGoogleAccessToken());
  if (!token) return { syncedDoses: 0 };

  const firstDose = parseLocalStartDateTime(treatment.startDate, treatment.startTime);
  if (!firstDose) return { syncedDoses: 0 };

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';
  const hourMs = treatment.frequencyHours * 60 * 60 * 1000;
  const nowTime = Date.now();
  let count = 0;

  for (let n = 0; n < treatment.quantityDose; n++) {
    const doseDate = new Date(firstDose.getTime() + n * hourMs);
    // Ignorar dosis que ya pasaron hace más de 12 horas
    if (doseDate.getTime() < nowTime - 12 * 60 * 60 * 1000) {
      continue;
    }

    const endDate = new Date(doseDate.getTime() + 15 * 60 * 1000); // Duración de 15 minutos
    const petlifeId = `medication-${treatment.id}-dose-${n}`;

    const summary = `💊 [PetLife - ${treatment.petName || 'Mascota'}] ${treatment.medicationName} (Toma ${n + 1} de ${treatment.quantityDose})`;
    const descriptionLines = [
      `Mascota: ${treatment.petName || 'Mascota'}`,
      `Medicamento: ${treatment.medicationName}`,
      `Toma: ${n + 1} de ${treatment.quantityDose}`,
      `Frecuencia: Cada ${treatment.frequencyHours} horas`,
    ];
    if (treatment.notes) {
      descriptionLines.push(`Indicaciones: ${treatment.notes}`);
    }
    descriptionLines.push('', 'Sincronizado automáticamente desde PetLife.');

    const payload = {
      summary,
      description: descriptionLines.join('\n'),
      start: {
        dateTime: formatLocalDateTime(doseDate),
        timeZone: localTimeZone,
      },
      end: {
        dateTime: formatLocalDateTime(endDate),
        timeZone: localTimeZone,
      },
      extendedProperties: {
        private: {
          petlifeId,
          treatmentId: String(treatment.id),
          doseIndex: String(n),
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 0 },  // Aviso en la hora exacta de la toma
          { method: 'popup', minutes: 10 }, // 10 minutos antes
        ],
      },
    };

    const res = await upsertGoogleCalendarEvent(petlifeId, payload, token);
    if (res.success) count++;
  }

  return { syncedDoses: count };
}

// -------------------------------------------------------------
// Sincronización de Turnos Veterinarios (Con su Horario Particular)
// -------------------------------------------------------------

/**
 * Sincroniza un turno veterinario con su fecha y horario particular exacto.
 */
export async function syncAppointmentToGoogleCalendar(
  appointment: Appointment,
  providedToken?: string
): Promise<{ success: boolean }> {
  if (appointment.isDeleted) return { success: false };

  const token = providedToken || (await getValidGoogleAccessToken());
  if (!token) return { success: false };

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';
  const petlifeId = `appointment-${appointment.idAppointment}`;
  const cleanTime = (appointment.time || '10:00').substring(0, 5);
  const endTime = calculateEndTime(cleanTime);

  const titleDetail = appointment.description?.trim() || `Turno con ${appointment.veterinarian}`;
  const summary = `🐾 [PetLife - ${appointment.petName || 'Mascota'}] ${titleDetail}`;

  const descriptionLines = [
    `Mascota: ${appointment.petName || 'Mascota'}`,
    `Veterinario/a: ${appointment.veterinarian}`,
  ];
  if (appointment.description) {
    descriptionLines.push(`Motivo: ${appointment.description}`);
  }
  if (appointment.address) {
    descriptionLines.push(`Dirección: ${appointment.address.street} ${appointment.address.number}`);
  }
  descriptionLines.push('', 'Sincronizado automáticamente desde PetLife.');

  const payload = {
    summary,
    description: descriptionLines.join('\n'),
    start: {
      dateTime: `${appointment.date}T${cleanTime}:00`,
      timeZone: localTimeZone,
    },
    end: {
      dateTime: `${appointment.date}T${endTime}:00`,
      timeZone: localTimeZone,
    },
    extendedProperties: {
      private: {
        petlifeId,
        appointmentId: String(appointment.idAppointment),
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },   // 1 hora antes
        { method: 'popup', minutes: 1440 }, // 24 horas antes
      ],
    },
  };

  const res = await upsertGoogleCalendarEvent(petlifeId, payload, token);
  return { success: res.success };
}

// -------------------------------------------------------------
// Sincronización de Vacunas (Fecha Límite / Vencimiento)
// -------------------------------------------------------------

/**
 * Sincroniza el vencimiento de una vacuna o antiparasitario.
 */
export async function syncVaccineToGoogleCalendar(
  vaccine: VaccinePet,
  providedToken?: string
): Promise<{ success: boolean }> {
  if (vaccine.isDeleted || !vaccine.expirationDate) return { success: false };

  const token = providedToken || (await getValidGoogleAccessToken());
  if (!token) return { success: false };

  const petlifeId = `vaccine-${vaccine.idVaccinePet}-exp`;
  const summary = `💉 [PetLife - ${vaccine.petName || 'Mascota'}] Vencimiento: ${vaccine.vaccineName}`;
  const descriptionLines = [
    `Mascota: ${vaccine.petName || 'Mascota'}`,
    `Vacuna / Producto: ${vaccine.vaccineName}`,
    `Fecha de vencimiento: ${vaccine.expirationDate}`,
  ];
  if (vaccine.notes) {
    descriptionLines.push(`Notas: ${vaccine.notes}`);
  }
  descriptionLines.push('', 'Sincronizado automáticamente desde PetLife.');

  const payload = {
    summary,
    description: descriptionLines.join('\n'),
    start: { date: vaccine.expirationDate },
    end: { date: vaccine.expirationDate },
    extendedProperties: {
      private: {
        petlifeId,
        vaccineId: String(vaccine.idVaccinePet),
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 }, // 1 día antes
        { method: 'popup', minutes: 2880 }, // 2 días antes
      ],
    },
  };

  const res = await upsertGoogleCalendarEvent(petlifeId, payload, token);
  return { success: res.success };
}

// -------------------------------------------------------------
// Eliminación en Google Calendar al borrar en PetLife
// -------------------------------------------------------------

/**
 * Elimina un evento de Google Calendar buscando por su petlifeId.
 */
export async function deleteGoogleCalendarEventByPetlifeId(petlifeId: string): Promise<void> {
  try {
    const token = await getValidGoogleAccessToken();
    if (!token) return;

    const existingId = await findExistingGoogleCalendarEventId(petlifeId, token);
    if (existingId) {
      await axios.delete(`${GOOGLE_CALENDAR_API_BASE}/${existingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[googleCalendar] Evento ${petlifeId} eliminado de Google Calendar.`);
    }
  } catch (err: any) {
    console.warn(`[googleCalendar] No se pudo eliminar ${petlifeId} de Google Calendar:`, err?.message);
  }
}

/**
 * Elimina todas las dosis programadas de un tratamiento de medicación en Google Calendar.
 */
export async function deleteMedicationTreatmentFromGoogleCalendar(
  treatmentId: number,
  maxDoses: number = 60
): Promise<void> {
  const token = await getValidGoogleAccessToken();
  if (!token) return;

  // Busca y borra las dosis asociadas a este tratamiento
  for (let n = 0; n < maxDoses; n++) {
    const petlifeId = `medication-${treatmentId}-dose-${n}`;
    await deleteGoogleCalendarEventByPetlifeId(petlifeId);
  }
}

// -------------------------------------------------------------
// Métodos de Auto-Sincronización en Segundo Plano (Sin Bloqueo)
// -------------------------------------------------------------

export function autoSyncAppointment(appointment: Appointment): Promise<void> {
  return syncAppointmentToGoogleCalendar(appointment)
    .then((res) => {
      if (res.success) {
        console.log(`[AutoSync] Turno ${appointment.idAppointment} sincronizado con Google Calendar.`);
      }
    })
    .catch((err) => {
      console.warn('[AutoSync] Error silencioso al sincronizar turno:', err?.message);
    });
}

export function autoSyncMedicationTreatment(treatment: MedicationPet): Promise<void> {
  return syncMedicationTreatmentToGoogleCalendar(treatment)
    .then((res) => {
      if (res.syncedDoses > 0) {
        console.log(`[AutoSync] ${res.syncedDoses} dosis de medicación ${treatment.id} sincronizadas con Google Calendar.`);
      }
    })
    .catch((err) => {
      console.warn('[AutoSync] Error silencioso al sincronizar medicación:', err?.message);
    });
}

export function autoSyncVaccine(vaccine: VaccinePet): Promise<void> {
  return syncVaccineToGoogleCalendar(vaccine)
    .then((res) => {
      if (res.success) {
        console.log(`[AutoSync] Vencimiento de vacuna ${vaccine.idVaccinePet} sincronizado con Google Calendar.`);
      }
    })
    .catch((err) => {
      console.warn('[AutoSync] Error silencioso al sincronizar vacuna:', err?.message);
    });
}

/**
 * Sincroniza un evento individual proveniente de CalendarEvent (desde la pantalla de Calendario).
 */
export async function syncSingleEventToGoogleCalendar(
  event: CalendarEvent,
  providedToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = providedToken || (await getValidGoogleAccessToken());
    if (!token) {
      return { success: false, error: 'No hay una sesión activa de Google con permisos de Google Calendar.' };
    }

    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';
    let payload: any;

    if (event.time) {
      const cleanTime = event.time.substring(0, 5);
      const endTime = calculateEndTime(cleanTime);
      payload = {
        summary: `🐾 [PetLife - ${event.petName}] ${event.title}`,
        description: `Mascota: ${event.petName}\n${event.subtitle ? `${event.subtitle}\n` : ''}\nSincronizado automáticamente desde PetLife.`,
        start: { dateTime: `${event.date}T${cleanTime}:00`, timeZone: localTimeZone },
        end: { dateTime: `${event.date}T${endTime}:00`, timeZone: localTimeZone },
        extendedProperties: { private: { petlifeId: event.id } },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: event.entityType === 'MEDICATION' ? 0 : 60 },
            { method: 'popup', minutes: event.entityType === 'MEDICATION' ? 10 : 1440 },
          ],
        },
      };
    } else {
      payload = {
        summary: `🐾 [PetLife - ${event.petName}] ${event.title}`,
        description: `Mascota: ${event.petName}\n${event.subtitle ? `${event.subtitle}\n` : ''}\nSincronizado automáticamente desde PetLife.`,
        start: { date: event.date },
        end: { date: event.date },
        extendedProperties: { private: { petlifeId: event.id } },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 },
            { method: 'popup', minutes: 2880 },
          ],
        },
      };
    }

    const res = await upsertGoogleCalendarEvent(event.id, payload, token);
    return { success: res.success };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error desconocido' };
  }
}

/**
 * Sincroniza automáticamente la lista de eventos en segundo plano sin bloquear la interfaz.
 */
export async function autoSyncAllCalendarEventsSilently(events: CalendarEvent[]): Promise<void> {
  const token = await getValidGoogleAccessToken();
  if (!token) return;

  const futureEvents = events.filter((e) => !e.isExpired && e.daysRemaining >= 0);
  for (const ev of futureEvents) {
    await syncSingleEventToGoogleCalendar(ev, token).catch(() => null);
  }
}

/**
 * Método de sincronización masiva con reporte de resultados (para el botón manual si se requiere).
 */
export async function syncEventsListToGoogleCalendar(
  events: CalendarEvent[]
): Promise<{ total: number; synced: number; failed: number }> {
  const token = await getValidGoogleAccessToken();
  if (!token) {
    throw new Error('No se encontró una sesión autorizada de Google Calendar.');
  }

  const targetEvents = events.filter((ev) => !ev.isExpired && ev.daysRemaining >= 0);
  let synced = 0;
  let failed = 0;

  for (const event of targetEvents) {
    const res = await syncSingleEventToGoogleCalendar(event, token);
    if (res.success) {
      synced++;
    } else {
      failed++;
    }
  }

  return { total: targetEvents.length, synced, failed };
}
