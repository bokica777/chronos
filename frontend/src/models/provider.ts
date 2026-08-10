export interface Provider {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
}

export interface CreateProviderRequest {
  ownerId: string;
  name: string;
  description?: string;
}
