import { configureNotifications, ensurePermission, replaceGroup } from './notificationService';
import { REMINDER_SOURCES } from './sources';
import { Reminder, ReminderGroup } from './types';

let running: Promise<void> = Promise.resolve();

/**
 * Recalcula y reprograma los avisos. Es seguro llamarla seguido: las llamadas se
 * encolan y cada una deja el teléfono igual a lo que dice el backend.
 *
 * @param groups solo esos grupos (ej. ['medication'] después de editar un tratamiento).
 */
export function syncReminders(groups?: ReminderGroup[]): Promise<void> {
  running = running.then(() => doSync(groups)).catch((err) => {
    console.warn('No se pudieron programar los avisos:', err);
  });
  return running;
}

async function doSync(groups?: ReminderGroup[]): Promise<void> {
  await configureNotifications();
  const now = new Date();
  const sources = REMINDER_SOURCES.filter((s) => !groups || groups.includes(s.group));

  const planned: { group: ReminderGroup; limit: number; reminders: Reminder[] }[] = [];
  for (const source of sources) {
    try {
      planned.push({ group: source.group, limit: source.limit, reminders: await source.load(now) });
    } catch (err) {
      // Si falla un grupo (ej. sin conexión), se dejan sus avisos como estaban.
      console.warn(`No se pudieron cargar los avisos de ${source.group}:`, err);
    }
  }

  // El permiso se pide recién cuando hay algo para avisar.
  const hasReminders = planned.some((p) => p.reminders.length > 0);
  if (hasReminders && !(await ensurePermission())) return;

  for (const p of planned) {
    await replaceGroup(p.group, p.reminders, p.limit);
  }
}
