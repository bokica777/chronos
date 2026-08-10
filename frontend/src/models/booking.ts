export type BookingStatus = "Pending" | "Confirmed" | "Cancelled" | "Completed";

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  startsAtUtc: string;
  status: BookingStatus;
}

export interface CreateBookingRequest {
  customerId: string;
  providerId: string;
  serviceId: string;
  startsAtUtc: string;
}
