import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SeasonId } from './seasons';

/** Nombre del ícono alternativo de cada festividad (los define app.json, plugin expo-alternate-app-icons). */
const ICON_NAMES: Record<SeasonId, string | null> = {
  original: null, // null = ícono principal de la app
  navidad: 'Navidad',
  sanValentin: 'SanValentin',
  pascuas: 'Pascuas',
  halloween: 'Halloween',
  primavera: 'Primavera',
  patrias: 'Patrias',
};

/**
 * Cambia el ícono de la app en la pantalla de inicio según la temporada.
 * Solo iOS y solo en builds nativos (TestFlight): en Expo Go no existe el módulo.
 * En iOS el sistema muestra un aviso cada vez que cambia, por eso solo se llama si es distinto.
 *
 * En Android no se cambia: el sistema lo hace desactivando la entrada de la app, y en
 * muchos teléfonos eso cierra la app, ya sea con la app abierta o al pasar a segundo
 * plano (por ejemplo, al abrir la galería para elegir la foto de una mascota).
 */
export async function syncAppIcon(season: SeasonId): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  try {
    const icons = require('expo-alternate-app-icons') as typeof import('expo-alternate-app-icons');
    if (!icons.supportsAlternateIcons) return;
    const target = ICON_NAMES[season];
    if (icons.getAppIconName() === target) return;
    await icons.setAlternateAppIcon(target);
  } catch (err) {
    console.warn('No se pudo cambiar el ícono de la app:', err);
  }
}
