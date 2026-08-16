export interface Provider {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  aboutUs?: string;
  imageUrl?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  contactPhone?: string;
  contactEmail?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  isActive: boolean;
}

export interface CreateProviderRequest {
  ownerId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateProviderRequest {
  name: string;
  description?: string;
  aboutUs?: string;
  imageUrl?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  contactPhone?: string;
  contactEmail?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
}
