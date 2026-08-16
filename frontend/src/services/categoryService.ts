import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from "../models/category";
import { httpClient } from "./api/httpClient";

const basePath = "/api/v1/categories";

export const categoryService = {
  getAll: (signal?: AbortSignal) => httpClient.get<Category[]>(basePath, signal),
  create: (request: CreateCategoryRequest) =>
    httpClient.post<Category, CreateCategoryRequest>(basePath, request),
  update: (id: string, request: UpdateCategoryRequest) =>
    httpClient.put<Category, UpdateCategoryRequest>(`${basePath}/${id}`, request),
};
