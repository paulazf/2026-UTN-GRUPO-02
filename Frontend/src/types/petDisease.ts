export interface Disease {
  id: number;
  name: string;
  isDeleted: boolean;
}

export type PetDiseaseStatus = 'En seguimiento' | 'Controlado';

export interface PetDisease {
  id: number;
  idPet: number;
  petName: string;
  idDisease: number;
  diseaseName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD o null
  status: PetDiseaseStatus;
  notes: string | null;
  isDeleted: boolean;
}

export interface CreatePetDiseasePayload {
  idPet: number;
  idDisease: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD o null
  notes?: string | null;
}

