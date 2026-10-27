import axiosClient from '../api/axiosClient';
import { City, Province } from '../types/geo';

export async function fetchProvinces(): Promise<Province[]> {
  try {
    const response = await axiosClient.get<Province[]>('/provinces/');
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'No se pudo cargar el listado de provincias.';
    throw new Error(message);
  }
}

export async function fetchCities(idProvince: number, search?: string): Promise<City[]> {
  try {
    const searchParam = search ? `&search=${encodeURIComponent(search.trim())}` : '';
    const response = await axiosClient.get<City[]>(`/cities/?idProvince=${idProvince}${searchParam}`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'No se pudieron cargar las localidades.';
    throw new Error(message);
  }
}

