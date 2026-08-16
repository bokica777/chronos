import type { CreateServiceRequest, Service, UpdateServiceRequest } from "../models/service";
import { httpClient } from "./api/httpClient";

const basePath = "/api/v1/providers/me/services";

export const serviceCatalogService = {
  getMine: (signal?: AbortSignal) => httpClient.get<Service[]>(basePath, signal),
  getByProvider: (providerId: string, signal?: AbortSignal) =>
    httpClient.get<Service[]>(`/api/v1/providers/${providerId}/services`, signal),
  getAllPublic: (signal?: AbortSignal) => httpClient.get<Service[]>("/api/v1/services", signal),
  getPublicById: (id: string, signal?: AbortSignal) => httpClient.get<Service>(`/api/v1/services/${id}`, signal),
  create: (request: CreateServiceRequest) =>
    httpClient.post<Service, CreateServiceRequest>(basePath, request),
  update: (id: string, request: UpdateServiceRequest) =>
    httpClient.put<Service, UpdateServiceRequest>(`${basePath}/${id}`, request),
  uploadImage: (id: string, file: File) => httpClient.upload<Service>(`${basePath}/${id}/image`, file),
  remove: (id: string) => httpClient.delete(`${basePath}/${id}`),
};
