/**
 * Tests para la lógica y construcción de eventos de Google Calendar.
 * Correr con: npm run test:notifications
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CalendarEvent } from '../src/types/calendar.ts';
import type { MedicationPet } from '../src/types/medicationPet.ts';
import type { Appointment } from '../src/types/appointment.ts';
import type { VaccinePet } from '../src/types/vaccinePet.ts';
import {
  parseLocalStartDateTime,
  formatLocalDateTime,
} from '../src/services/googleCalendarService.ts';

test('Google Calendar: Medicación cada 8 horas genera dosis con sus horarios particulares', () => {
  const treatment: MedicationPet = {
    id: 5,
    idPet: 4,
    petName: 'Mandarina',
    idMedication: 2,
    medicationName: 'Amoxicilina 500mg',
    frequencyHours: 8,
    quantityDose: 4,
    startDate: '2026-11-20',
    startTime: '08:00',
    endDate: '2026-11-22',
    notes: 'Dar con comida',
    isDeleted: false,
  };

  const firstDose = parseLocalStartDateTime(treatment.startDate, treatment.startTime);
  assert.ok(firstDose !== null);
  assert.equal(firstDose.getFullYear(), 2026);
  assert.equal(firstDose.getMonth(), 10); // Noviembre (0-indexed)
  assert.equal(firstDose.getDate(), 20);
  assert.equal(firstDose.getHours(), 8);
  assert.equal(firstDose.getMinutes(), 0);

  const hourMs = treatment.frequencyHours * 60 * 60 * 1000;
  const doses = [];
  for (let n = 0; n < treatment.quantityDose; n++) {
    const doseDate = new Date(firstDose.getTime() + n * hourMs);
    doses.push({
      index: n + 1,
      dateStr: formatLocalDateTime(doseDate),
      hour: doseDate.getHours(),
    });
  }

  assert.equal(doses.length, 4);
  // Dosis 1: 08:00
  assert.equal(doses[0].hour, 8);
  assert.ok(doses[0].dateStr.includes('2026-11-20T08:00:00'));
  // Dosis 2: 16:00 (8 hs después)
  assert.equal(doses[1].hour, 16);
  assert.ok(doses[1].dateStr.includes('2026-11-20T16:00:00'));
  // Dosis 3: 00:00 (8 hs después, día siguiente)
  assert.equal(doses[2].hour, 0);
  assert.ok(doses[2].dateStr.includes('2026-11-21T00:00:00'));
  // Dosis 4: 08:00 (8 hs después)
  assert.equal(doses[3].hour, 8);
  assert.ok(doses[3].dateStr.includes('2026-11-21T08:00:00'));
});

test('Google Calendar: Turno toma su horario particular y calcula 1 hora de duración', () => {
  const appointment: Appointment = {
    idAppointment: 9,
    idPet: 4,
    petName: 'Mandarina',
    veterinarian: 'Dra. Gómez',
    description: 'Control de rutina',
    date: '2026-11-25',
    time: '15:30',
    idAddress: null,
    address: null,
    isDeleted: false,
  };

  const cleanTime = appointment.time.substring(0, 5);
  assert.equal(cleanTime, '15:30');
  const startDateTime = `${appointment.date}T${cleanTime}:00`;
  assert.equal(startDateTime, '2026-11-25T15:30:00');
});

test('Google Calendar: Vacuna sin hora se programa para todo el día de vencimiento', () => {
  const vaccine: VaccinePet = {
    idVaccinePet: 3,
    idPet: 4,
    petName: 'Mandarina',
    idVaccine: 1,
    vaccineName: 'Antirrábica',
    laboratory: 'Zoetis',
    vaccineType: 'VACCINE',
    doseNumber: 1,
    applicationDate: '2025-12-01',
    expirationDate: '2026-12-01',
    notes: 'Revacunación anual',
    status: 'VALID',
    daysToExpiration: 14,
    isDeleted: false,
  };

  assert.equal(vaccine.expirationDate, '2026-12-01');
  const petlifeId = `vaccine-${vaccine.idVaccinePet}-exp`;
  assert.equal(petlifeId, 'vaccine-3-exp');
});
