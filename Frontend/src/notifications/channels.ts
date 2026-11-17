import { AndroidImportance } from 'expo-notifications';
import { ReminderGroup } from './types';

/**
 * Canales de Android: cada grupo tiene el suyo, así el usuario puede silenciar uno
 * (por ejemplo, alimentación) sin perder los demás desde los ajustes del teléfono.
 * En iOS no existen canales y esto se ignora.
 */
export const CHANNELS: Record<
  ReminderGroup,
  { name: string; description: string; importance: AndroidImportance }
> = {
  medication: {
    name: 'Medicación',
    description: 'Avisos de cada toma de los tratamientos de tus mascotas.',
    importance: AndroidImportance.HIGH,
  },
};
