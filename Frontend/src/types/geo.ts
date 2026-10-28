export interface Province {
  idProvince: number;
  name: string;
}

export interface City {
  idCity: number;
  idProvince: number;
  name: string;
  provinceName?: string;
}

