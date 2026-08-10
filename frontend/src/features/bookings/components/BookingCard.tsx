import { Button } from "../../../components/common/Button";
import { Card } from "../../../components/common/Card";
import type { Booking } from "../../../models/booking";
import { formatDateTime } from "../../../utils/date";

type BookingCardProps = {
  booking: Booking;
  onCancel?: (id: string) => void;
};

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  return (
    <Card>
      <p className="eyebrow">{booking.status}</p>
      <h2>{formatDateTime(booking.startsAtUtc)}</h2>
      <p>Broj rezervacije: {booking.id}</p>
      {booking.status !== "Cancelled" && onCancel && (
        <Button variant="danger" onClick={() => onCancel(booking.id)}>
          Otkaži
        </Button>
      )}
    </Card>
  );
}
