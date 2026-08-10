import { EmptyState } from "../../../components/common/EmptyState";
import type { Booking } from "../../../models/booking";
import { BookingCard } from "./BookingCard";

type BookingListProps = {
  bookings: Booking[];
  onCancel?: (id: string) => void;
};

export function BookingList({ bookings, onCancel }: BookingListProps) {
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
        <BookingCard key={booking.id} booking={booking} onCancel={onCancel} />
      ))}
    </section>
  );
}
