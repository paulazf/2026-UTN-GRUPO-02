import { AppState, NativeEventSubscription, Platform } from 'react-native';
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

type IconsModule = typeof import('expo-alternate-app-icons');

function loadIcons(): IconsModule | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    const icons = require('expo-alternate-app-icons') as IconsModule;
    return icons.supportsAlternateIcons ? icons : null;
  } catch {
    return null;
  }
}

async function applyIcon(icons: IconsModule, target: string | null): Promise<void> {
  try {
    if (icons.getAppIconName() === target) return;
    await icons.setAlternateAppIcon(target);
  } catch (err) {
    console.warn('No se pudo cambiar el ícono de la app:', err);
  }
}

// Android: el ícono se cambia habilitando otro "alias" de la actividad principal, y muchos
// teléfonos cierran la app si eso pasa con la app abierta. Por eso se deja pendiente y se
// aplica cuando la app pasa a segundo plano.
let pendingAndroidIcon: string | null | undefined;
let androidSubscription: NativeEventSubscription | null = null;

function scheduleAndroidIcon(icons: IconsModule, target: string | null): void {
  pendingAndroidIcon = target;
  if (androidSubscription) return;
  androidSubscription = AppState.addEventListener('change', (state) => {
    if (state !== 'background' || pendingAndroidIcon === undefined) return;
    const next = pendingAndroidIcon;
    pendingAndroidIcon = undefined;
    applyIcon(icons, next);
  });
}

/**
 * Cambia el ícono de la app en la pantalla de inicio del celular según la temporada.
 * Solo funciona en builds nativos (TestFlight, APK): en Expo Go no existe el módulo y no hace nada.
 * - iOS: se cambia al momento; el sistema muestra un aviso, por eso solo se llama si el ícono es distinto.
 * - Android: se cambia al salir de la app, para que no se cierre.
 */
export async function syncAppIcon(season: SeasonId): Promise<void> {
  const icons = loadIcons();
  if (!icons) return;
  const target = ICON_NAMES[season];

  if (Platform.OS === 'android') {
    if (icons.getAppIconName() === target) {
      pendingAndroidIcon = undefined;
      return;
    }
    scheduleAndroidIcon(icons, target);
    return;
  }

  await applyIcon(icons, target);
}
