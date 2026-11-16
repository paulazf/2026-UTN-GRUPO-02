import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { vars } from 'nativewind';
import * as SecureStore from 'expo-secure-store';
import { currentCalendarSeason, Season, SeasonId, SeasonPalette, SEASONS } from '../theme/seasons';
import { hexToRgbTriplet, setBrand } from '../theme/brand';
import { syncAppIcon } from '../theme/appIcon';

const STORAGE_KEY = 'seasonalThemeEnabled';

interface ThemeContextValue {
  /** Temática que se está mostrando (original si el usuario la apagó). */
  season: SeasonId;
  palette: SeasonPalette;
  /** Festividad que toca hoy según el calendario, esté o no encendida. */
  calendarSeason: Season;
  /** Preferencia del usuario: seguir las festividades o usar siempre la paleta original. */
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  /** Vista previa para probar una festividad fuera de fecha (no se guarda). null = seguir la fecha. */
  previewSeason: SeasonId | null;
  setPreviewSeason: (season: SeasonId | null) => void;
}

const fallback: ThemeContextValue = {
  season: 'original',
  palette: SEASONS.original.palette,
  calendarSeason: SEASONS.original,
  enabled: true,
  setEnabled: () => {},
  previewSeason: null,
  setPreviewSeason: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(fallback);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [calendarSeasonId] = useState<SeasonId>(() => currentCalendarSeason());
  const [previewSeason, setPreviewSeason] = useState<SeasonId | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'false') setEnabledState(false);
      })
      .catch(() => {});
  }, []);

  // Ícono de la app en el celular: sigue la temporada que se está mostrando
  // (fecha + interruptor de Perfil, o la vista previa en los builds de prueba).
  const iconSeason: SeasonId = previewSeason ?? (enabled ? calendarSeasonId : 'original');
  useEffect(() => {
    syncAppIcon(iconSeason);
  }, [iconSeason]);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    SecureStore.setItemAsync(STORAGE_KEY, value ? 'true' : 'false').catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const season: SeasonId = previewSeason ?? (enabled ? calendarSeasonId : 'original');
    return {
      season,
      palette: SEASONS[season].palette,
      calendarSeason: SEASONS[calendarSeasonId],
      enabled,
      setEnabled,
      previewSeason,
      setPreviewSeason,
    };
  }, [enabled, calendarSeasonId, setEnabled, previewSeason]);

  // Colores para las props (Ionicons, ActivityIndicator...) y variables CSS para las clases brand-*.
  setBrand(value.palette);
  const cssVars = useMemo(
    () =>
      vars({
        '--brand': hexToRgbTriplet(value.palette.accent),
        '--brand-header': hexToRgbTriplet(value.palette.header),
        '--brand-tint': hexToRgbTriplet(value.palette.tint),
        '--brand-soft': hexToRgbTriplet(value.palette.soft),
      }),
    [value.palette],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View className="flex-1" style={cssVars}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export const useSeasonTheme = () => useContext(ThemeContext);
