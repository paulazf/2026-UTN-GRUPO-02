export interface Medication {
  idMedication: number;
  name: string;
  dose: string | number;
  description: string | null;
  isDeleted: boolean;
}

export interface MedicationPet {
  id: number;
  idPet: number;
  petName: string;
  idMedication: number;
  medicationName: string;
  frequencyHours: number;
  quantityDose: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status?: string; // "En tratamiento" | "Finalizado"
  notes: string | null;
  isDeleted: boolean;
}

export interface CreateMedicationPetPayload {
  idPet: number;
  idMedication: number;
  frequencyHours: number;
  quantityDose: number;
  startDate: string; // YYYY-MM-DD
  notes?: string | null;
}

export interface UpdateMedicationPetPayload {
  frequencyHours?: number;
  quantityDose?: number;
  startDate?: string; // YYYY-MM-DD
  notes?: string | null;
}
