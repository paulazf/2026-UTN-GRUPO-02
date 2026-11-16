import { SEASONS, SeasonPalette } from './seasons';

/**
 * Colores de marca de la temporada activa, para las props que no aceptan className
 * (color de Ionicons, ActivityIndicator, RefreshControl...). ThemeProvider lo actualiza
 * en cada render, así que cada pantalla toma el color vigente cuando se dibuja.
 * En className se usan las clases bg-brand, text-brand, border-brand, bg-brand-tint, etc.
 */
export const brand: SeasonPalette = { ...SEASONS.original.palette };

export function setBrand(palette: SeasonPalette) {
  Object.assign(brand, palette);
}

/** "#DE6B80" -> "222 107 128", el formato de rgb(var(--x) / <alpha-value>). */
export const hexToRgbTriplet = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
};
