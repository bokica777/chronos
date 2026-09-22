import type { Payment, StripeCheckoutResponse } from "../models/payment";
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
  // Pravi Stripe tok: pokreni sesiju pa redirektuj korisnika na checkoutUrl.
  startCheckout: (id: string) =>
    httpClient.post<StripeCheckoutResponse, Record<string, never>>(
      `${basePath}/${id}/checkout-session`,
      {},
    ),
  // Poziva se kad se korisnik vrati sa Stripe-a (success_url) da odmah
  // potvrdimo stanje umesto da cekamo webhook.
  confirmStripe: (id: string) =>
    httpClient.post<Payment, Record<string, never>>(`${basePath}/${id}/confirm-stripe`, {}),
  // Backend vraca 204 (httpClient -> undefined) kad placanje za tu rezervaciju
  // jos ne postoji - to nije greska, vec normalno stanje pre placanja.
  getByBooking: async (bookingId: string, signal?: AbortSignal): Promise<Payment | null> => {
    const payment = await httpClient.get<Payment | undefined>(`${basePath}/booking/${bookingId}`, signal);
    return payment ?? null;
  },
};
