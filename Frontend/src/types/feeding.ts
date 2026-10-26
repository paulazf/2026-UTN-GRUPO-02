export type FeedingType =
  | 'DRY_FOOD'
  | 'WET_FOOD'
  | 'VETERINARY_DIET'
  | 'HOMEMADE'
  | 'MIXED';

export interface Feeding {
  idFeeding: number;
  idPet: number;
  petName: string;
  food: string;
  type: FeedingType;
  typeDisplay: string;
  portion: string;
  sinceDate: string;
  frequency: string;
  notes: string;
  isDeleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedingPayload {
  idPet?: number;
  food?: string;
  type?: FeedingType;
  portion?: string;
  sinceDate?: string;
  frequency?: string;
  notes?: string;
}

export const FEEDING_TYPE_OPTIONS: { value: FeedingType; label: string }[] = [
  { value: 'DRY_FOOD', label: 'Seca' },
  { value: 'WET_FOOD', label: 'Húmeda' },
  { value: 'VETERINARY_DIET', label: 'Veterinaria' },
  { value: 'HOMEMADE', label: 'Casera' },
  { value: 'MIXED', label: 'Mixta' },
];

export const FEEDING_TYPE_LABELS: Record<FeedingType, string> = {
  DRY_FOOD: 'Alimento seco',
  WET_FOOD: 'Alimento húmedo',
  VETERINARY_DIET: 'Veterinaria',
  HOMEMADE: 'Casera',
  MIXED: 'Mixta',
};
