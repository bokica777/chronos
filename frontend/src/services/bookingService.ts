import type { Booking, CreateBookingRequest } from "../models/booking";
import { httpClient } from "./api/httpClient";

const basePath = "/api/v1/bookings";

export const bookingService = {
  getAll: (signal?: AbortSignal) => httpClient.get<Booking[]>(basePath, signal),
  getById: (id: string, signal?: AbortSignal) =>
    httpClient.get<Booking>(`${basePath}/${id}`, signal),
  create: (request: CreateBookingRequest) =>
    httpClient.post<Booking, CreateBookingRequest>(basePath, request),
  createV2: (request: CreateBookingRequest) =>
    httpClient.post<Booking, CreateBookingRequest>("/api/v2/bookings", request),
  cancel: (id: string) =>
    httpClient.patch<Booking, { status: "Cancelled" }>(`${basePath}/${id}`, {
      status: "Cancelled",
    }),
  remove: (id: string) => httpClient.delete(`${basePath}/${id}`),
};
