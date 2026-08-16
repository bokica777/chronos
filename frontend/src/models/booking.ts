export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  price: number;
  penaltyAmount: number;
  createdAt: string;
  updatedAt: string;
  // Ne dolazi sa backenda - booking-service ne zna imena, samo ID-jeve.
  // Frontend ih naknadno dopunjava pozivom ka provider-service, radi prikaza.
  providerName?: string;
  serviceName?: string;
}

// customerId namerno nije polje ovde - booking-service ga uzima iz JWT tokena
// ulogovanog korisnika, nikad se ne šalje sa fronta.
export interface CreateBookingRequest {
  providerId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  price: number;
  idempotencyKey: string;
}
