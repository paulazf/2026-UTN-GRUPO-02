import { PetSpecies } from './pet';

export type VaccineType = 'VACCINE' | 'EXTERNAL_ANTIPARASITIC' | 'INTERNAL_ANTIPARASITIC';

// VALID = Vigente, EXPIRING = Por vencer, EXPIRED = Vencida, RENEWED = reemplazada por una dosis posterior
export type VaccinePetStatus = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'RENEWED';

export interface Vaccine {
  idVaccine: number;
  name: string;
  laboratory: string;
  type: VaccineType;
  species: PetSpecies | null; // null = perros y gatos
  validityDays: number | null;
  isDeleted: boolean;
}

export interface VaccinePet {
  idVaccinePet: number;
  idPet: number;
  petName: string;
  idVaccine: number;
  vaccineName: string;
  laboratory: string;
  vaccineType: VaccineType;
  doseNumber: number | null;
  applicationDate: string; // YYYY-MM-DD
  expirationDate: string; // YYYY-MM-DD
  notes: string;
  status: VaccinePetStatus;
  daysToExpiration: number;
  isDeleted: boolean;
}

export interface CreateVaccinePetPayload {
  idPet: number;
  idVaccine: number;
  doseNumber: number | null;
  applicationDate: string; // YYYY-MM-DD
  expirationDate: string; // YYYY-MM-DD
  notes?: string;
}

export type UpdateVaccinePetPayload = Partial<
  Pick<CreateVaccinePetPayload, 'doseNumber' | 'applicationDate' | 'expirationDate' | 'notes'>
>;

export const VACCINE_TYPE_SECTIONS: Record<VaccineType, string> = {
  VACCINE: 'Vacunas',
  EXTERNAL_ANTIPARASITIC: 'Antiparasitarios',
  INTERNAL_ANTIPARASITIC: 'Antiparasitarios',
};

export const STATUS_LABELS: Record<VaccinePetStatus, string> = {
  VALID: 'Vigente',
  EXPIRING: 'Por vencer',
  EXPIRED: 'Vencida',
  RENEWED: 'Renovada',
};
