export type PaymentStatus = "Pending" | "Completed" | "Failed" | "Refunded";

// Dolazi iz payment-service. Nema customerId - vlasnistvo nad placanjem se
// izvodi indirektno preko bookingId (vlasnistvo nad rezervacijom zna booking-service).
export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

// Odgovor pri pokretanju pravog Stripe Checkout toka - front redirektuje
// korisnika na checkoutUrl (Stripe-om hostovanu stranicu).
export interface StripeCheckoutResponse {
  sessionId: string;
  checkoutUrl: string;
}
