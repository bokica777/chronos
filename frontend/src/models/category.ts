export interface Category {
  id: string;
  name: string;
  iconUrl?: string;
  isActive: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  iconUrl?: string;
}

export interface UpdateCategoryRequest {
  name: string;
  iconUrl?: string;
}
