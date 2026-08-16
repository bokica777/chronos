export interface Service {
  id: string;
  providerId: string;
  categoryId: string;
  name: string;
  description?: string;
  note?: string;
  imageUrl?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface CreateServiceRequest {
  categoryId: string;
  name: string;
  description?: string;
  note?: string;
  durationMinutes: number;
  price: number;
}

export interface UpdateServiceRequest {
  categoryId: string;
  name: string;
  description?: string;
  note?: string;
  durationMinutes: number;
  price: number;
}
