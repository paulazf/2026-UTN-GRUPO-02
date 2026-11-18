import { fetchMedicationReminders } from '../services/medicationPetService';
import { planMedicationReminders } from './planners/medicationPlanner';
import { ReminderSource } from './types';

/**
 * Registro de avisos de la app. Para sumar uno nuevo, agregar una entrada acá
 * (ver docs/notificaciones.md). La suma de los `limit` no debe pasar de 60.
 */
export const REMINDER_SOURCES: ReminderSource[] = [
  {
    group: 'medication',
    limit: 40,
    load: async (now) => planMedicationReminders(await fetchMedicationReminders(), now),
  },
];
