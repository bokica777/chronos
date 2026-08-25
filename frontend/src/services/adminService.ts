import type { Booking } from "../models/booking";
import type { Category } from "../models/category";
import type { Notification } from "../models/notification";
import type { Provider } from "../models/provider";
import type { Service } from "../models/service";
import type { User, UserRole } from "../models/user";
import { httpClient } from "./api/httpClient";

// Sve admin-only pozive drzimo na jednom mestu - svaki gadja postojeci resurs
// (korisnici u auth-service, kategorije/provajderi/usluge u provider-service,
// rezervacije u booking-service) ali preko posebnih "/admin" ili role-zasticenih
// ruta koje obicni korisnici nemaju pristup.
export const adminService = {
  users: {
    getAll: (signal?: AbortSignal) => httpClient.get<User[]>("/api/v1/auth/users", signal),
    updateRole: (id: string, role: UserRole) =>
      httpClient.patch<User, { role: UserRole }>(`/api/v1/auth/users/${id}/role`, { role }),
    setActive: (id: string, isActive: boolean) =>
      httpClient.patch<User, { isActive: boolean }>(`/api/v1/auth/users/${id}/active`, { isActive }),
  },
  categories: {
    getAll: (signal?: AbortSignal) => httpClient.get<Category[]>("/api/v1/categories/admin", signal),
    setVisibility: (id: string, isVisible: boolean) =>
      httpClient.patch<Category, { isVisible: boolean }>(`/api/v1/categories/${id}/visibility`, { isVisible }),
  },
  providers: {
    getAll: (signal?: AbortSignal) => httpClient.get<Provider[]>("/api/v1/providers/admin", signal),
    setVisibility: (id: string, isVisible: boolean) =>
      httpClient.patch<Provider, { isVisible: boolean }>(`/api/v1/providers/${id}/visibility`, { isVisible }),
  },
  services: {
    getAll: (signal?: AbortSignal) => httpClient.get<Service[]>("/api/v1/services/admin", signal),
    setVisibility: (id: string, isVisible: boolean) =>
      httpClient.patch<Service, { isVisible: boolean }>(`/api/v1/services/${id}/visibility`, { isVisible }),
  },
  bookings: {
    getAll: (signal?: AbortSignal) => httpClient.get<Booking[]>("/api/v1/bookings/admin/all", signal),
  },
  notifications: {
    getAll: (signal?: AbortSignal) =>
      httpClient.get<Notification[]>("/api/v1/notifications/admin/all", signal),
  },
};
