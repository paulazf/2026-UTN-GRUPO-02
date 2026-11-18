/**
 * Tipos del módulo de notificaciones (TDD-0047).
 *
 * Cada tipo de aviso de la app es un "grupo". Para sumar uno nuevo (vacunas, turnos,
 * alimentación...) se agrega su nombre acá, su canal en channels.ts y su fuente en
 * sources.ts. Ver docs/notificaciones.md.
 */
export type ReminderGroup = 'medication' | 'vaccine';

/** Un aviso concreto, listo para programar en el teléfono. */
export interface Reminder {
  /** Clave única y estable. Si se vuelve a programar con la misma clave, reemplaza al anterior. */
  key: string;
  group: ReminderGroup;
  title: string;
  body: string;
  /** Fecha y hora local en la que debe sonar. */
  date: Date;
  /** Datos extra que llegan al tocar la notificación (ej. { petId }). */
  data?: Record<string, string | number | boolean | null>;
}

/** De dónde salen los avisos de un grupo. */
export interface ReminderSource {
  group: ReminderGroup;
  /** Máximo de avisos pendientes para el grupo. iOS permite 64 en total por app. */
  limit: number;
  /** Trae los datos del backend y devuelve los avisos a programar. */
  load: (now: Date) => Promise<Reminder[]>;
}
