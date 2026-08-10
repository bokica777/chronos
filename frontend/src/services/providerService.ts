import type { CreateProviderRequest, Provider } from "../models/provider";
import { httpClient } from "./api/httpClient";

const basePath = "/api/v1/providers";

export const providerService = {
  getAll: (signal?: AbortSignal) => httpClient.get<Provider[]>(basePath, signal),
  getById: (id: string, signal?: AbortSignal) =>
    httpClient.get<Provider>(`${basePath}/${id}`, signal),
  create: (request: CreateProviderRequest) =>
    httpClient.post<Provider, CreateProviderRequest>(basePath, request),
  update: (id: string, request: CreateProviderRequest) =>
    httpClient.put<Provider, CreateProviderRequest>(`${basePath}/${id}`, request),
  remove: (id: string) => httpClient.delete(`${basePath}/${id}`),
};
