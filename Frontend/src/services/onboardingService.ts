export const ONBOARDING_SEEN_KEY = '@petlife_has_seen_onboarding';

export interface OnboardingSlide {
  id: string;
  tag: string;
  title: string;
  description: string;
  icon: string;
  secondaryIcon?: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'libreta',
    tag: 'Ficha médica única',
    title: 'Libreta sanitaria digital',
    description:
      'Llevá el historial clínico completo, vacunas, desparasitaciones, estudios y tratamientos de tus mascotas siempre con vos.',
    icon: 'document-text-outline',
    secondaryIcon: 'paw-outline',
  },
  {
    id: 'avisos',
    tag: 'Alertas automáticas',
    title: 'Avisos y recordatorios',
    description:
      'Recibí notificaciones a tiempo antes de que venza una vacuna y alertas puntuales para no olvidar ninguna medicación.',
    icon: 'notifications-outline',
    secondaryIcon: 'alarm-outline',
  },
  {
    id: 'compartir',
    tag: 'Exportá en PDF',
    title: 'Compartí con el veterinario',
    description:
      'Previsualizá la libreta médica oficial y enviala directamente por WhatsApp o correo antes de cada consulta o urgencia.',
    icon: 'share-social-outline',
    secondaryIcon: 'medkit-outline',
  },
];

/**
 * Consulta si el usuario ya vio el tutorial de bienvenida en este dispositivo.
 */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const SecureStore = await import('expo-secure-store');
    const value = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('Error leyendo flag de onboarding:', error);
    return false;
  }
}

/**
 * Marca el tutorial como visto para no volver a mostrarlo en futuros inicios.
 */
export async function markOnboardingAsSeen(): Promise<void> {
  try {
  const SecureStore = await import('expo-secure-store');

    await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, 'true');
  } catch (error) {
    console.warn('Error guardando flag de onboarding:', error);
  }
}

/**
 * Reinicia la marca de onboarding (útil para pruebas).
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ONBOARDING_SEEN_KEY);
  } catch (error) {
    console.warn('Error eliminando flag de onboarding:', error);
  }
}
