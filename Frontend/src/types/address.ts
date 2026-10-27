export interface Address {
  idAddress: number;
  referenceName: string;
  street: string;
  number: string;
  floor?: number | null;
  apartment?: string | null;
  idCity: number;
  cityName: string;
  idProvince?: number;
  provinceName: string;
  isDeleted?: boolean;
}

export interface NewAddressPayload {
  referenceName: string;
  idCity: number;
  street: string;
  number: string;
  floor?: number | null;
  apartment?: string | null;
}

