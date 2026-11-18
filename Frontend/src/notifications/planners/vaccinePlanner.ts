import type { VaccinePet } from '../../types/vaccinePet';
import type { Reminder } from '../types';

/** Días de anticipación con los que se programa el aviso de vencimiento. */
export const VACCINE_REMINDER_DAYS_BEFORE = 7;
/** Hora de la mañana en que se envía el aviso (09:00 hs local). */
export const VACCINE_REMINDER_HOUR = 9;

/** "2026-11-17" -> Date local a las 09:00 hs exactamente N días antes. */
export function calculateVaccineReminderDate(expirationDate: string, daysBefore: number = VACCINE_REMINDER_DAYS_BEFORE): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expirationDate);
  if (!dateMatch) return null;
  const [, y, m, d] = dateMatch.map(Number);
  return new Date(y, m - 1, d - daysBefore, VACCINE_REMINDER_HOUR, 0, 0, 0);
}

/**
 * TDD-0050: Aviso de vencimiento de vacunas y pipetas (antirrábica, antiparasitarios, etc.).
 * Función pura (sin red ni dependencias nativas), para testear directamente.
 *
 * Criterios de aceptación:
 * - Escenario 1: Aviso anticipado 7 días antes a las 09:00: "A {mascota} le vence la {vacuna} el {DD/MM}".
 * - Escenario 2: Refuerzo ya aplicado (hasNewer o RENEWED): no genera aviso.
 * - Escenario 3: Mascota dada de baja o vacuna eliminada: no genera aviso.
 */
export function planVaccineReminders(
  vaccines: VaccinePet[],
  now: Date,
  daysBefore: number = VACCINE_REMINDER_DAYS_BEFORE,
): Reminder[] {
  const reminders: Reminder[] = [];

  for (const v of vaccines) {
    if (v.isDeleted || v.status === 'RENEWED' || !v.expirationDate) continue;

    const reminderDate = calculateVaccineReminderDate(v.expirationDate, daysBefore);
    if (!reminderDate) continue;

    // Si la fecha del aviso ya pasó respecto a `now`, no se programa
    if (reminderDate.getTime() <= now.getTime()) continue;

    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.expirationDate);
    if (!dateMatch) continue;
    const [, , m, d] = dateMatch.map(Number);
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(m).padStart(2, '0');

    const isAntiparasitic =
      v.vaccineType === 'EXTERNAL_ANTIPARASITIC' || v.vaccineType === 'INTERNAL_ANTIPARASITIC';
    const title = isAntiparasitic
      ? `Antiparasitario de ${v.petName}`
      : `Vacuna de ${v.petName}`;

    reminders.push({
      key: `vaccine-${v.idVaccinePet}`,
      group: 'vaccine',
      title,
      body: `A ${v.petName} le vence la ${v.vaccineName} el ${dayStr}/${monthStr}`,
      date: reminderDate,
      data: { petId: v.idPet, vaccinePetId: v.idVaccinePet },
    });
  }

  // Ordenar cronológicamente
  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
}
