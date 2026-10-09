import axiosClient from '../api/axiosClient';
import { apiUrl } from './api';
import { Breed, CreatePetPayload, Pet, PetSpecies } from '../types/pet';

const CURRENT_MOCK_OWNER_ID = 1; //Cambiar esto cuando exista owner

export async function fetchPets(ownerId: number = CURRENT_MOCK_OWNER_ID): Promise<Pet[]> {
  const url = `/pets/?idOwner=${ownerId}`;
  const response = await axiosClient.get(url);
  return response.data;
}

export async function fetchPetById(id: number): Promise<Pet> {
  const url = `/pets/${id}/`;
  const response = await axiosClient.get(url);
  return response.data;
}

export async function fetchBreeds(species?: PetSpecies): Promise<Breed[]> {
  const query = species ? `?species=${species}` : '';
  const url = `/breeds/${query}`;
  const response = await axiosClient.get(url);
  return response.data;
}

export async function createPet(payload: CreatePetPayload): Promise<Pet> {
  const url = `/pets/`;

  const photoData = payload.photoFile?.base64
    ? `data:${payload.photoFile.type || 'image/jpeg'};base64,${payload.photoFile.base64}`
    : payload.photo || null;

  const bodyData = {
    name: payload.name,
    birthDate: payload.birthDate,
    neutered: payload.neutered,
    weight: payload.weight,
    idBreed: payload.idBreed,
    idOwner: payload.idOwner,
    photo: photoData,
  };

  try {
    const response = await axiosClient.post(url, bodyData);
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    const message =
      errorData?.detail ||
      errorData?.birthDate?.[0] ||
      errorData?.name?.[0] ||
      errorData?.weight?.[0] ||
      errorData?.photo?.[0] ||
      errorData?.non_field_errors?.[0] ||
      `Error al crear mascota (${error.response?.status})`;
    throw new Error(message);
  }
}
