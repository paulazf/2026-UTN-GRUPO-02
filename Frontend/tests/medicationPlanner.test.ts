/**
 * Tests del cálculo de avisos de medicación (TDD-0047, HU-304).
 * Correr con: npm run test:notifications
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  firstDoseDate,
  planMedicationReminders,
} from '../src/notifications/planners/medicationPlanner.ts';
import type { MedicationPet } from '../src/types/medicationPet.ts';

const treatment = (overrides: Partial<MedicationPet> = {}): MedicationPet => ({
  id: 1,
  idPet: 7,
  petName: 'Mandarina',
  idMedication: 3,
  medicationName: 'Meloxicam',
  frequencyHours: 24,
  quantityDose: 5,
  startDate: '2026-11-15',
  startTime: '09:00',
  endDate: '2026-11-20',
  notes: null,
  isDeleted: false,
  ...overrides,
});

const at = (iso: string) => new Date(iso); // sin zona: hora local

test('Escenario 1: toca una dosis a las 9:00 con el texto de la HU', () => {
  const reminders = planMedicationReminders([treatment()], at('2026-11-15T08:00:00'));
  assert.equal(reminders[0].title, 'Hora del Meloxicam de Mandarina');
  assert.deepEqual(reminders[0].date, at('2026-11-15T09:00:00'));
  assert.equal(reminders[0].body, 'Toma 1 de 5 · cada 24 hs');
  assert.equal(reminders.length, 5);
  assert.deepEqual(reminders[4].date, at('2026-11-19T09:00:00'));
});

test('Escenario 2: tratamiento terminado ayer no genera avisos', () => {
  const reminders = planMedicationReminders(
    [treatment({ startDate: '2026-11-10', quantityDose: 4 })], // última toma 13/11 9:00
    at('2026-11-14T09:00:00'),
  );
  assert.equal(reminders.length, 0);
});

test('No avisa tomas que ya pasaron: arranca en la siguiente', () => {
  const reminders = planMedicationReminders(
    [treatment({ frequencyHours: 8, quantityDose: 6 })], // 9, 17, 1, 9, 17, 1
    at('2026-11-15T18:00:00'),
  );
  assert.equal(reminders.length, 4);
  assert.deepEqual(reminders[0].date, at('2026-11-16T01:00:00'));
  assert.equal(reminders[0].body, 'Toma 3 de 6 · cada 8 hs');
});

test('Solo programa dentro del horizonte de días', () => {
  const reminders = planMedicationReminders(
    [treatment({ quantityDose: 60 })],
    at('2026-11-15T08:00:00'),
    7,
  );
  assert.equal(reminders.length, 7);
});

test('Ignora tratamientos eliminados', () => {
  assert.equal(planMedicationReminders([treatment({ isDeleted: true })], at('2026-11-15T08:00:00')).length, 0);
});

test('Claves únicas y estables por tratamiento y toma', () => {
  const reminders = planMedicationReminders(
    [treatment(), treatment({ id: 2, petName: 'Tom' })],
    at('2026-11-15T08:00:00'),
  );
  const keys = reminders.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes('medication-2-0'));
  assert.deepEqual(reminders[0].data, { petId: 7, treatmentId: 1 });
});

test('Sin hora usa las 9:00; acepta HH:MM:SS', () => {
  assert.deepEqual(firstDoseDate('2026-11-15', null), at('2026-11-15T09:00:00'));
  assert.deepEqual(firstDoseDate('2026-11-15', '21:30:00'), at('2026-11-15T21:30:00'));
  assert.equal(firstDoseDate('15/11/2026', '09:00'), null);
});
