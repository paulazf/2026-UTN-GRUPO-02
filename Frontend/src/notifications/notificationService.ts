import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CHANNELS } from './channels';
import { Reminder, ReminderGroup } from './types';

/**
 * Capa fina sobre expo-notifications. Funciona igual en iOS y Android
 * (y en Expo Go, porque son notificaciones locales, no push).
 */

const NOTIFICATION_COLOR = '#E87A8E';
let configured = false;

/** Cómo se muestran las notificaciones con la app abierta, y canales de Android. Se llama una vez. */
export async function configureNotifications(): Promise<void> {
  if (configured || Platform.OS === 'web') return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Promise.all(
      (Object.keys(CHANNELS) as ReminderGroup[]).map((group) =>
        Notifications.setNotificationChannelAsync(group, {
          ...CHANNELS[group],
          vibrationPattern: [0, 250, 250, 250],
          lightColor: NOTIFICATION_COLOR,
        }),
      ),
    );
  }
}

/** Pide permiso solo si hace falta. Devuelve true si se pueden mostrar notificaciones. */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Reemplaza los avisos programados de un grupo por los nuevos.
 * Borra los del grupo y programa los próximos `limit` que todavía no pasaron.
 */
export async function replaceGroup(
  group: ReminderGroup,
  reminders: Reminder[],
  limit: number,
): Promise<number> {
  await cancelGroup(group);

  const now = Date.now();
  const upcoming = reminders
    .filter((r) => r.date.getTime() > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);

  for (const reminder of upcoming) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.key,
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: true,
        color: NOTIFICATION_COLOR,
        data: { ...reminder.data, group },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.date,
        channelId: group,
      },
    });
  }
  return upcoming.length;
}

/** Cancela los avisos pendientes de un grupo. */
export async function cancelGroup(group: ReminderGroup): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.group === group)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Cancela todo. Se usa al cerrar sesión. */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
