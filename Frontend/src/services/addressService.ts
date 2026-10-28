import axiosClient from '../api/axiosClient';
import { Address, NewAddressPayload } from '../types/address';

export async function fetchAddresses(): Promise<Address[]> {
  try {
    const response = await axiosClient.get<Address[]>('/addresses/');
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'No se pudieron cargar los domicilios guardados.';
    throw new Error(message);
  }
}

export async function createAddress(payload: NewAddressPayload): Promise<Address> {
  try {
    const response = await axiosClient.post<Address>('/addresses/', payload);
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    const nonFieldError = Array.isArray(errorData?.non_field_errors)
      ? errorData.non_field_errors[0]
      : errorData?.non_field_errors;

    const message =
      errorData?.detail ||
      nonFieldError ||
      errorData?.referenceName?.[0] ||
      errorData?.street?.[0] ||
      errorData?.number?.[0] ||
      errorData?.idCity?.[0] ||
      'No se pudo registrar el nuevo domicilio. Verificá los datos e intentá nuevamente.';
    throw new Error(message);
  }
}

export async function updateAddress(
  id: number,
  payload: Partial<NewAddressPayload>
): Promise<Address> {
  try {
    const response = await axiosClient.patch<Address>(`/addresses/${id}/`, payload);
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    const nonFieldError = Array.isArray(errorData?.non_field_errors)
      ? errorData.non_field_errors[0]
      : errorData?.non_field_errors;

    const message =
      errorData?.detail ||
      nonFieldError ||
      errorData?.referenceName?.[0] ||
      errorData?.street?.[0] ||
      errorData?.number?.[0] ||
      errorData?.idCity?.[0] ||
      'No se pudo actualizar el domicilio. Verificá los datos e intentá nuevamente.';
    throw new Error(message);
  }
}

export async function deleteAddress(id: number): Promise<void> {
  try {
    await axiosClient.delete(`/addresses/${id}/`);
  } catch (error: any) {
    const message = error.response?.data?.detail || 'No se pudo eliminar el domicilio.';
    throw new Error(message);
  }
}
