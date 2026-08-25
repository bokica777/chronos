import { EmptyState } from "../../../components/common/EmptyState";
import type { Booking } from "../../../models/booking";
import type { Payment } from "../../../models/payment";
import { BookingCard } from "./BookingCard";

type BookingListProps = {
  bookings: Booking[];
  payments?: Record<string, Payment | null>;
  onCancel?: (id: string) => void;
  onPay?: (id: string) => void;
  payingBookingId?: string | null;
};

export function BookingList({ bookings, payments, onCancel, onPay, payingBookingId }: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="Nema rezervacija"
        description="Kada rezervišete termin, pojaviće se na ovom mestu."
      />
    );
  }

  return (
    <section className="card-grid">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          payment={payments?.[booking.id]}
          onCancel={onCancel}
          onPay={onPay}
          isPaying={payingBookingId === booking.id}
        />
      ))}
    </section>
  );
}
