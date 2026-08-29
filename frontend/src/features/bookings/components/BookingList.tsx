import { EmptyState } from "../../../components/common/EmptyState";
import type { Booking } from "../../../models/booking";
import type { Payment } from "../../../models/payment";
import type { Provider } from "../../../models/provider";
import type { Service } from "../../../models/service";
import { BookingCard } from "./BookingCard";

type BookingListProps = {
  bookings: Booking[];
  providers?: Record<string, Provider>;
  services?: Record<string, Service>;
  payments?: Record<string, Payment | null>;
  onCancel?: (id: string) => void;
  onPay?: (id: string) => void;
  payingBookingId?: string | null;
};

export function BookingList({
  bookings,
  providers,
  services,
  payments,
  onCancel,
  onPay,
  payingBookingId,
}: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="Nema rezervacija"
        description="Kada rezervišete termin, pojaviće se na ovom mestu."
      />
    );
  }

  // Najnovija rezervacija (po vremenu kreiranja) se blago istice - vizuelni
  // podsetnik "ovo si upravo zakazao/la".
  const newestId = bookings.reduce((newest, booking) =>
    new Date(booking.createdAt) > new Date(newest.createdAt) ? booking : newest,
  ).id;

  return (
    <section className="booking-list">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          provider={providers?.[booking.providerId]}
          service={services?.[booking.serviceId]}
          payment={payments?.[booking.id]}
          isNewest={booking.id === newestId}
          onCancel={onCancel}
          onPay={onPay}
          isPaying={payingBookingId === booking.id}
        />
      ))}
    </section>
  );
}
