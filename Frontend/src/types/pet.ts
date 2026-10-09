export type PetSpecies = 'DOG' | 'CAT';

export interface Breed {
  id: number;
  name: string;
  species: PetSpecies;
}

export interface Pet {
  id: number;
  name: string;
  birthDate: string; // YYYY-MM-DD
  age: number;
  neutered: boolean;
  weight: string; 
  photo?: string | null;
  breed: Breed;
  idOwner: number;
  isDeleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PetPhotoFile {
  uri: string;
  name?: string;
  type?: string;
  base64?: string;
}

export interface CreatePetPayload {
  name: string;
  birthDate: string; // YYYY-MM-DD
  neutered: boolean;
  weight: number;
  idBreed: number;
  idOwner: number;
  photo?: string | null;
  photoFile?: PetPhotoFile | null;
}

