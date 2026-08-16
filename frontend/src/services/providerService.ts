import type { CreateProviderRequest, Provider, UpdateProviderRequest } from "../models/provider";
import { httpClient } from "./api/httpClient";

const basePath = "/api/v1/providers";

export const providerService = {
  getAll: (signal?: AbortSignal) => httpClient.get<Provider[]>(basePath, signal),
  getById: (id: string, signal?: AbortSignal) =>
    httpClient.get<Provider>(`${basePath}/${id}`, signal),
  getMine: (signal?: AbortSignal) => httpClient.get<Provider>(`${basePath}/me`, signal),
  updateMine: (request: UpdateProviderRequest) =>
    httpClient.put<Provider, UpdateProviderRequest>(`${basePath}/me`, request),
  create: (request: CreateProviderRequest) =>
    httpClient.post<Provider, CreateProviderRequest>(basePath, request),
  uploadImage: (file: File) => httpClient.upload<Provider>(`${basePath}/me/image`, file),
  setVisibility: (isVisible: boolean) =>
    httpClient.patch<Provider, { isVisible: boolean }>(`${basePath}/me/visibility`, { isVisible }),
  deleteMine: () => httpClient.delete(`${basePath}/me`),
};
