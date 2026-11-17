import type { MedicationPet } from '../../types/medicationPet';
import type { Reminder } from '../types';

/** Cuántos días hacia adelante se programan. Al abrir la app se vuelve a calcular. */
export const MEDICATION_HORIZON_DAYS = 14;
const DEFAULT_START_TIME = '09:00';
const HOUR_MS = 60 * 60 * 1000;

/** "2026-11-15" + "09:00" -> Date local del teléfono. */
export function firstDoseDate(startDate: string, startTime?: string | null): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  const timeMatch = /^(\d{2}):(\d{2})/.exec(startTime || DEFAULT_START_TIME);
  if (!dateMatch || !timeMatch) return null;
  const [, y, m, d] = dateMatch.map(Number);
  const [, hh, mm] = timeMatch.map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/**
 * HU-304: un aviso por cada toma que falta, dentro de los próximos días.
 * Función pura (sin red ni notificaciones), así se puede probar sola.
 *
 * - Toma n = primera toma + n * frequencyHours, para n = 0 .. quantityDose - 1.
 * - Las tomas que ya pasaron no se avisan, y no hay avisos después de la última toma
 *   (escenario "tratamiento terminado").
 */
export function planMedicationReminders(
  treatments: MedicationPet[],
  now: Date,
  horizonDays: number = MEDICATION_HORIZON_DAYS,
): Reminder[] {
  const until = now.getTime() + horizonDays * 24 * HOUR_MS;
  const reminders: Reminder[] = [];

  for (const t of treatments) {
    if (t.isDeleted || t.frequencyHours <= 0 || t.quantityDose <= 0) continue;
    const first = firstDoseDate(t.startDate, t.startTime);
    if (!first) continue;

    // Saltea directo a la primera toma futura, sin recorrer las pasadas.
    const elapsed = now.getTime() - first.getTime();
    const firstPending = elapsed < 0 ? 0 : Math.floor(elapsed / (t.frequencyHours * HOUR_MS)) + 1;

    for (let n = firstPending; n < t.quantityDose; n++) {
      const date = new Date(first.getTime() + n * t.frequencyHours * HOUR_MS);
      if (date.getTime() > until) break;
      if (date.getTime() <= now.getTime()) continue;
      reminders.push({
        key: `medication-${t.id}-${n}`,
        group: 'medication',
        title: `Hora del ${t.medicationName} de ${t.petName}`,
        body: `Toma ${n + 1} de ${t.quantityDose} · cada ${t.frequencyHours} hs`,
        date,
        data: { petId: t.idPet, treatmentId: t.id },
      });
    }
  }
  return reminders;
}
