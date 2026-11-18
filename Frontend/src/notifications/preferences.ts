import * as SecureStore from 'expo-secure-store';
import { ReminderGroup } from './types';

/** Qué tipos de aviso quiere recibir el usuario. Se guarda en el teléfono. Por defecto, todos. */
const KEY = 'notificationPrefs';
export type NotificationPrefs = Partial<Record<ReminderGroup, boolean>>;

export async function getPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isGroupEnabled(prefs: NotificationPrefs, group: ReminderGroup): boolean {
  return prefs[group] !== false;
}

export async function setGroupEnabled(group: ReminderGroup, enabled: boolean): Promise<NotificationPrefs> {
  const prefs = { ...(await getPrefs()), [group]: enabled };
  await SecureStore.setItemAsync(KEY, JSON.stringify(prefs));
  return prefs;
}
