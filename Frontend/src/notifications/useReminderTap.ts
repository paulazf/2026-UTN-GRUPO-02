import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export interface ReminderTap {
  /** Grupo del aviso (ej. 'medication'). */
  group: string;
  petId?: number;
  data: Record<string, unknown>;
}

/**
 * Llama a `onTap` cuando el usuario toca una notificación de PetLife,
 * tanto con la app abierta como si la abrió desde la notificación.
 */
export function useReminderTap(onTap: (tap: ReminderTap) => void): void {
  const handler = useRef(onTap);
  handler.current = onTap;
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (Platform.OS === 'web' || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
    // Se marca como atendida para no volver a abrirla al reiniciar la sesión.
    Notifications.clearLastNotificationResponse();
    handler.current({
      group: String(data.group ?? ''),
      petId: typeof data.petId === 'number' ? data.petId : undefined,
      data,
    });
  }, [response]);
}
