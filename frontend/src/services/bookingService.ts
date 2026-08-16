import type { Booking, CreateBookingRequest } from "../models/booking";
import { httpClient } from "./api/httpClient";

const basePath = "/api/v1/bookings";

export const bookingService = {
  create: (request: CreateBookingRequest) =>
    httpClient.post<Booking, CreateBookingRequest>(basePath, request),
  getMine: (signal?: AbortSignal) => httpClient.get<Booking[]>(`${basePath}/me`, signal),
  getByProvider: (providerId: string, signal?: AbortSignal) =>
    httpClient.get<Booking[]>(`${basePath}/provider/${providerId}`, signal),
  cancel: (id: string) =>
    httpClient.post<Booking, Record<string, never>>(`${basePath}/${id}/cancel`, {}),
};
