import { apiUrl } from './api';
import { Breed, CreatePetPayload, Pet, PetSpecies } from '../types/pet';

const CURRENT_MOCK_OWNER_ID = 1; //Cambiar esto cuando exista owner

export async function fetchPets(ownerId: number = CURRENT_MOCK_OWNER_ID): Promise<Pet[]> {
  const url = `${apiUrl}/api/v1/pets/?idOwner=${ownerId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error al obtener mascotas: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchPetById(id: number): Promise<Pet> {
  const url = `${apiUrl}/api/v1/pets/${id}/`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error al obtener detalle de la mascota: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchBreeds(species?: PetSpecies): Promise<Breed[]> {
  const query = species ? `?species=${species}` : '';
  const url = `${apiUrl}/api/v1/breeds/${query}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error al obtener catálogo de razas: ${response.statusText}`);
  }

  return response.json();
}

export async function createPet(payload: CreatePetPayload): Promise<Pet> {
  const url = `${apiUrl}/api/v1/pets/`;

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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      errorData?.detail ||
      errorData?.birthDate?.[0] ||
      errorData?.name?.[0] ||
      errorData?.weight?.[0] ||
      errorData?.photo?.[0] ||
      errorData?.non_field_errors?.[0] ||
      `Error al crear mascota (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}
