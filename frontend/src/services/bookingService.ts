import type { Booking, CreateBookingRequest } from "../models/booking";
import type { LoyaltyStatus } from "../models/loyalty";
import { httpClient } from "./api/httpClient";

const basePath = "/api/v1/bookings";

export const bookingService = {
  create: (request: CreateBookingRequest) =>
    httpClient.post<Booking, CreateBookingRequest>(basePath, request),
  getMine: (signal?: AbortSignal) => httpClient.get<Booking[]>(`${basePath}/me`, signal),
  getMyLoyalty: (signal?: AbortSignal) => httpClient.get<LoyaltyStatus>(`${basePath}/me/loyalty`, signal),
  getByProvider: (providerId: string, signal?: AbortSignal) =>
    httpClient.get<Booking[]>(`${basePath}/provider/${providerId}`, signal),
  cancel: (id: string) =>
    httpClient.post<Booking, Record<string, never>>(`${basePath}/${id}/cancel`, {}),
};
