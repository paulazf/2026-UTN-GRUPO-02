/**
 * Tests del cálculo de avisos de vencimiento de vacunas y pipetas (TDD-0050, EP06 Calendario).
 * Correr con: npm run test:notifications
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVaccineReminderDate,
  planVaccineReminders,
} from '../src/notifications/planners/vaccinePlanner.ts';
import type { VaccinePet } from '../src/types/vaccinePet.ts';

const application = (overrides: Partial<VaccinePet> = {}): VaccinePet => ({
  idVaccinePet: 10,
  idPet: 4,
  petName: 'Beto',
  idVaccine: 2,
  vaccineName: 'Antirrábica',
  laboratory: 'Zoetis',
  vaccineType: 'VACCINE',
  doseNumber: 1,
  applicationDate: '2025-11-17',
  expirationDate: '2026-11-17',
  notes: '',
  status: 'VALID',
  daysToExpiration: 365,
  isDeleted: false,
  ...overrides,
});

const at = (iso: string) => new Date(iso);

test('Escenario 1: Antirrábica de Beto vence el 17/11 -> aviso el 10/11 a las 09:00', () => {
  // Cuando es el 10/11 a las 08:00 (antes del aviso de las 09:00)
  const now = at('2026-11-10T08:00:00');
  const reminders = planVaccineReminders([application()], now);

  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].title, 'Vacuna de Beto');
  assert.equal(reminders[0].body, 'A Beto le vence la Antirrábica el 17/11');
  assert.deepEqual(reminders[0].date, at('2026-11-10T09:00:00'));
  assert.equal(reminders[0].key, 'vaccine-10');
  assert.deepEqual(reminders[0].data, { petId: 4, vaccinePetId: 10 });
});

test('Escenario 2: Refuerzo ya registrado (status RENEWED) no genera aviso', () => {
  const now = at('2026-11-09T08:00:00');
  const renewedApp = application({ status: 'RENEWED' });
  const reminders = planVaccineReminders([renewedApp], now);

  assert.equal(reminders.length, 0);
});

test('Escenario 3: Vacuna o registro eliminado (isDeleted: true) no genera aviso', () => {
  const now = at('2026-11-09T08:00:00');
  const deletedApp = application({ isDeleted: true });
  const reminders = planVaccineReminders([deletedApp], now);

  assert.equal(reminders.length, 0);
});

test('Avisos que ya pasaron no se programan', () => {
  // Si hoy es 11/11 a las 10:00, el aviso del 10/11 a las 09:00 ya pasó
  const now = at('2026-11-11T10:00:00');
  const reminders = planVaccineReminders([application()], now);

  assert.equal(reminders.length, 0);
});

test('Diferencia título según tipo de producto (pipeta vs vacuna)', () => {
  const now = at('2026-11-01T08:00:00');
  const pipeta = application({
    idVaccinePet: 20,
    vaccineName: 'Frontline Plus',
    vaccineType: 'EXTERNAL_ANTIPARASITIC',
    expirationDate: '2026-11-15',
  });

  const reminders = planVaccineReminders([pipeta], now);
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].title, 'Antiparasitario de Beto');
  assert.equal(reminders[0].body, 'A Beto le vence la Frontline Plus el 15/11');
  assert.deepEqual(reminders[0].date, at('2026-11-08T09:00:00'));
});

test('Claves únicas y estables por aplicación', () => {
  const now = at('2026-11-01T08:00:00');
  const app1 = application({ idVaccinePet: 101, petName: 'Luna' });
  const app2 = application({ idVaccinePet: 102, petName: 'Beto' });

  const reminders = planVaccineReminders([app1, app2], now);
  const keys = reminders.map((r) => r.key);
  assert.equal(new Set(keys).size, 2);
  assert.deepEqual(keys, ['vaccine-101', 'vaccine-102']);
});

test('calculateVaccineReminderDate calcula 7 días antes a las 09:00 hs', () => {
  assert.deepEqual(calculateVaccineReminderDate('2026-11-17'), at('2026-11-10T09:00:00'));
  assert.deepEqual(calculateVaccineReminderDate('2026-03-05', 7), at('2026-02-26T09:00:00'));
  assert.equal(calculateVaccineReminderDate('fecha-invalida'), null);
});
