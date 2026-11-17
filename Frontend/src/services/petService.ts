import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import axiosClient from '../api/axiosClient';
import { Breed, CreatePetPayload, Pet, PetSpecies, UpdatePetPayload } from '../types/pet';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const CURRENT_MOCK_OWNER_ID = 1; // Cambiar esto cuando exista owner

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

export async function updatePet(id: number, payload: UpdatePetPayload): Promise<Pet> {
  const url = `/pets/${id}/`;

  let photoData: string | null | undefined = undefined;
  if (payload.photoFile?.base64) {
    photoData = `data:${payload.photoFile.type || 'image/jpeg'};base64,${payload.photoFile.base64}`;
  } else if (payload.photo !== undefined) {
    photoData = payload.photo;
  }

  const bodyData: Record<string, any> = {
    name: payload.name,
    birthDate: payload.birthDate,
    neutered: payload.neutered,
    weight: payload.weight,
    idBreed: payload.idBreed,
  };

  if (photoData !== undefined) {
    bodyData.photo = photoData;
  }

  try {
    const response = await axiosClient.put(url, bodyData);
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
      `Error al actualizar mascota (${error.response?.status})`;
    throw new Error(message);
  }
}

export async function deletePet(id: number): Promise<{ message: string; id: number; isDeleted: boolean }> {
  const url = `/pets/${id}/`;
  try {
    const response = await axiosClient.delete(url);
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    const message =
      errorData?.detail ||
      errorData?.non_field_errors?.[0] ||
      `Error al dar de baja la mascota (${error.response?.status})`;
    throw new Error(message);
  }
}

export async function downloadMedicalHistoryPdf(petId: number, petName: string): Promise<string> {
  const token = await SecureStore.getItemAsync('userToken');
  const safePetName = petName.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'mascota';
  const fileName = `libreta_${safePetName}.pdf`;

  const folder = new Directory(Paths.cache, 'medical-history');
  if (!folder.exists) {
    folder.create();
  }
  const targetFile = new File(folder, fileName);
  if (targetFile.exists) {
    targetFile.delete();
  }

  const url = `${API_URL}/api/v1/pets/${petId}/medical-history/pdf/`;
  const downloaded = await File.downloadFileAsync(url, targetFile, {
    headers: token ? { Authorization: `Token ${token}` } : {},
  });

  return downloaded.uri;
}

