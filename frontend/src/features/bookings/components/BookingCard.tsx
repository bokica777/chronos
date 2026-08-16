import { Button } from "../../../components/common/Button";
import { Card } from "../../../components/common/Card";
import type { Booking } from "../../../models/booking";
import { formatDateTime } from "../../../utils/date";

const statusLabels: Record<Booking["status"], string> = {
  PENDING: "Na čekanju",
  CONFIRMED: "Potvrđeno",
  CANCELLED: "Otkazano",
  COMPLETED: "Završeno",
};

type BookingCardProps = {
  booking: Booking;
  onCancel?: (id: string) => void;
};

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  const canCancel = booking.status !== "CANCELLED" && booking.status !== "COMPLETED";

  return (
    <Card>
      <p className="eyebrow">{statusLabels[booking.status]}</p>
      <h2>{booking.serviceName ?? "Usluga"}</h2>
      {booking.providerName && <p>{booking.providerName}</p>}
      <p>{formatDateTime(booking.startTime)}</p>
      <p className="service-manage-meta">
        {booking.price} RSD
        {booking.penaltyAmount > 0 ? ` · penal ${booking.penaltyAmount} RSD` : ""}
      </p>
      {canCancel && onCancel && (
        <Button variant="danger" onClick={() => onCancel(booking.id)}>
          Otkaži
        </Button>
      )}
    </Card>
  );
}
