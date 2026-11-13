// Temáticas de temporada de PetLife.
// "original" es la paleta de siempre; las demás se activan solas según la fecha.

export type SeasonId =
  | 'original'
  | 'navidad'
  | 'sanValentin'
  | 'pascuas'
  | 'halloween'
  | 'primavera'
  | 'patrias';

export interface SeasonPalette {
  /** Fondo del header y de la pantalla de carga (texto blanco encima). */
  header: string;
  /** Links, pestaña activa, bordes e íconos de marca. */
  accent: string;
  /** Fondo suave: foto por defecto, badge "Hoy", círculos. */
  tint: string;
  /** Fondo muy suave: tarjeta de agregar. */
  soft: string;
}

export interface Season {
  id: SeasonId;
  label: string;
  /** Texto corto de vigencia para mostrar en Perfil. */
  until: string;
  palette: SeasonPalette;
}

export const SEASONS: Record<SeasonId, Season> = {
  original: {
    id: 'original',
    label: 'Original',
    until: '',
    palette: { header: '#E87A8E', accent: '#DE6B80', tint: '#FCECEF', soft: '#FFF8F9' },
  },
  navidad: {
    id: 'navidad',
    label: 'Navidad',
    until: 'hasta el 31/12',
    palette: { header: '#B3343B', accent: '#B3343B', tint: '#FBEAEA', soft: '#FFF7F6' },
  },
  sanValentin: {
    id: 'sanValentin',
    label: 'San Valentín',
    until: 'hasta el 14/02',
    palette: { header: '#C8325F', accent: '#C8325F', tint: '#FDE8EF', soft: '#FFF6F9' },
  },
  pascuas: {
    id: 'pascuas',
    label: 'Pascuas',
    until: 'hasta el domingo de Pascua',
    palette: { header: '#7A5BB5', accent: '#7A5BB5', tint: '#F0EAFA', soft: '#FAF8FE' },
  },
  halloween: {
    id: 'halloween',
    label: 'Halloween',
    until: 'hasta el 31/10',
    palette: { header: '#4C1D95', accent: '#C2410C', tint: '#FDEDE3', soft: '#FFF8F3' },
  },
  primavera: {
    id: 'primavera',
    label: 'Primavera',
    until: 'solo por hoy',
    palette: { header: '#2F7D5B', accent: '#2F7D5B', tint: '#E6F4EC', soft: '#F6FBF7' },
  },
  patrias: {
    id: 'patrias',
    label: 'Fechas patrias',
    until: 'solo por hoy',
    palette: { header: '#2F6EA8', accent: '#2F6EA8', tint: '#E3EEF8', soft: '#F5F9FD' },
  },
};

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const inRange = (date: Date, fromM: number, fromD: number, toM: number, toD: number) => {
  const y = date.getFullYear();
  return date >= new Date(y, fromM - 1, fromD) && date <= new Date(y, toM - 1, toD, 23, 59, 59);
};

/** Temática que corresponde a una fecha. Fuera de cualquier festividad devuelve "original". */
export function seasonForDate(date: Date = new Date()): SeasonId {
  // Semana de Pascua: los seis días anteriores y el domingo.
  const easter = easterSunday(date.getFullYear());
  const easterStart = new Date(easter);
  easterStart.setDate(easter.getDate() - 6);
  const easterEnd = new Date(easter);
  easterEnd.setHours(23, 59, 59);
  if (date >= easterStart && date <= easterEnd) return 'pascuas';

  if (inRange(date, 12, 1, 12, 31)) return 'navidad';
  if (inRange(date, 2, 7, 2, 14)) return 'sanValentin';
  if (inRange(date, 5, 25, 5, 25) || inRange(date, 7, 9, 7, 9)) return 'patrias';
  if (inRange(date, 9, 21, 9, 21)) return 'primavera';
  if (inRange(date, 10, 25, 10, 31)) return 'halloween';
  return 'original';
}

/**
 * Temática del calendario para hoy.
 * Para probar una festividad fuera de fecha: EXPO_PUBLIC_SEASON=navidad (o cualquier SeasonId).
 */
export function currentCalendarSeason(): SeasonId {
  const forced = process.env.EXPO_PUBLIC_SEASON as SeasonId | undefined;
  if (forced && forced in SEASONS) return forced;
  return seasonForDate(new Date());
}
