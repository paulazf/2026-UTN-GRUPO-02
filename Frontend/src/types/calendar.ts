
export type CalendarEntityType = 'APPOINTMENT' | 'VACCINE' | 'MEDICATION';

export interface CalendarEvent {
  id: string;
  entityType: CalendarEntityType;
  title: string;
  subtitle: string;
  date: string; // Formato ISO YYYY-MM-DD
  time: string | null; // HH:MM o null
  petId: number;
  petName: string;
  daysRemaining: number;
  isExpired: boolean;
  hasVaccineExpirationInMonth: boolean;
  sourceId: number;
}

export interface CalendarFilterParams {
  idPet?: number;
  entityType?: CalendarEntityType;
  fromDate?: string;
  toDate?: string;
}