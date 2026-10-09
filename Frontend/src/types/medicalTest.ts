export type MedicalTestType = 'laboratory' | 'imaging' | 'other';
export type MedicalTestStatus = 'normal' | 'altered' | 'pending';

export interface MedicalTest {
  idMedicalTest: number;
  idPet: number;
  petName: string;
  name: string;
  type: MedicalTestType;
  date: string; // YYYY-MM-DD
  veterinarian: string;
  status: MedicalTestStatus;
  resultSummary: string;
  resultDetail: string;
  file: string | null;
  isDeleted: boolean;
}

// Archivo elegido en el celular, todavía no subido
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface MedicalTestPayload {
  idPet?: number;
  name?: string;
  type?: MedicalTestType;
  date?: string; // YYYY-MM-DD
  veterinarian?: string;
  status?: MedicalTestStatus;
  resultSummary?: string;
  resultDetail?: string;
  file?: PickedFile;
}

export const TYPE_LABELS: Record<MedicalTestType, string> = {
  laboratory: 'Laboratorio',
  imaging: 'Imagen',
  other: 'Otro',
};

// Títulos de las secciones del listado (en plural, como en el mockup)
export const TYPE_SECTIONS: Record<MedicalTestType, string> = {
  laboratory: 'Laboratorio',
  imaging: 'Imágenes',
  other: 'Otros',
};

export const STATUS_LABELS: Record<MedicalTestStatus, string> = {
  normal: 'Normal',
  altered: 'Alterado',
  pending: 'Pendiente',
};
