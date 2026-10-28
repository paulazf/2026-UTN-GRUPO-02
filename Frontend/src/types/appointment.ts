import { Address, NewAddressPayload } from './address';

export interface Appointment {
  idAppointment: number;
  id?: number; // compatibilidad
  idPet: number;
  petName?: string;
  description: string;
  veterinarian: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS o HH:MM
  idAddress: number | null;
  address: Address | null;
  isDeleted: boolean;
}

export interface CreateAppointmentPayload {
  idPet: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM o HH:MM:SS
  veterinarian: string;
  description: string;
  idAddress?: number | null;
  newAddress?: NewAddressPayload;
}

export interface UpdateAppointmentPayload {
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM o HH:MM:SS
  veterinarian?: string;
  description?: string;
  idAddress?: number | null;
}

