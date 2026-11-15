import { useEffect } from 'react';
import { AppState } from 'react-native';
import { syncReminders } from './sync';

/**
 * Mantiene los avisos al día mientras hay sesión: al iniciar y cada vez que la app
 * vuelve a primer plano (por si cambiaron datos desde otro teléfono).
 */
export function useReminderSync(loggedIn: boolean): void {
  useEffect(() => {
    if (!loggedIn) return;
    syncReminders();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncReminders();
    });
    return () => subscription.remove();
  }, [loggedIn]);
}
