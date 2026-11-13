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
 * Cambia el ícono de la app en la pantalla de inicio del celular según la temporada.
 * Solo funciona en builds nativos (TestFlight, APK): en Expo Go no existe el módulo y no hace nada.
 * En iOS el sistema muestra un aviso cada vez que el ícono cambia, así que solo se llama
 * cuando el ícono actual es distinto del que corresponde.
 */
export async function syncAppIcon(season: SeasonId): Promise<void> {
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
