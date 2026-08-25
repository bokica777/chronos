export type NotificationType = "BOOKING_CREATED" | "BOOKING_CANCELLED";
export type NotificationStatus = "SENT" | "FAILED";

// Dolazi iz notification-service - konzumuje RabbitMQ evente koje objavljuje
// booking-service (booking.created / booking.cancelled) i belezi sta je (pokusano da) posalje.
export interface Notification {
  id: string;
  bookingId: string;
  customerId: string;
  type: NotificationType;
  channel: string;
  message: string;
  status: NotificationStatus;
  createdAt: string;
  sentAt: string | null;
}
