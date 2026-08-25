import type { ApiProblem } from "../models/api";
import type { Payment } from "../models/payment";
import { httpClient } from "./api/httpClient";

const basePath = "/api/v1/payments";

type CreatePaymentRequest = {
  bookingId: string;
  amount: number;
  currency: string;
};

export const paymentService = {
  create: (request: CreatePaymentRequest) =>
    httpClient.post<Payment, CreatePaymentRequest>(basePath, request),
  complete: (id: string) =>
    httpClient.post<Payment, Record<string, never>>(`${basePath}/${id}/complete`, {}),
  // 404 znaci da placanje za tu rezervaciju jos ne postoji - to nije greska,
  // vec normalno stanje pre nego sto korisnik klikne "Simuliraj plaćanje".
  getByBooking: async (bookingId: string, signal?: AbortSignal): Promise<Payment | null> => {
    try {
      return await httpClient.get<Payment>(`${basePath}/booking/${bookingId}`, signal);
    } catch (error) {
      if ((error as ApiProblem).status === 404) return null;
      throw error;
    }
  },
};
