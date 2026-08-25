import { Button } from "../../../components/common/Button";
import { Card } from "../../../components/common/Card";
import type { Booking } from "../../../models/booking";
import type { Payment } from "../../../models/payment";
import { formatDateTime } from "../../../utils/date";

const statusLabels: Record<Booking["status"], string> = {
  PENDING: "Na čekanju",
  CONFIRMED: "Potvrđeno",
  CANCELLED: "Otkazano",
  COMPLETED: "Završeno",
};

const paymentStatusLabels: Record<Payment["status"], string> = {
  Pending: "Plaćanje u toku",
  Completed: "Plaćeno",
  Failed: "Plaćanje neuspešno",
  Refunded: "Refundirano",
};

type BookingCardProps = {
  booking: Booking;
  payment?: Payment | null;
  onCancel?: (id: string) => void;
  onPay?: (id: string) => void;
  isPaying?: boolean;
};

export function BookingCard({ booking, payment, onCancel, onPay, isPaying }: BookingCardProps) {
  const canCancel = booking.status !== "CANCELLED" && booking.status !== "COMPLETED";
  // Simulacija placanja nema smisla za otkazanu rezervaciju.
  const canPay = booking.status !== "CANCELLED" && payment?.status !== "Completed";

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
      {payment && (
        <span
          className={`visibility-badge visibility-badge--${
            payment.status === "Completed" ? "visible" : "hidden"
          }`}
        >
          {paymentStatusLabels[payment.status]}
        </span>
      )}
      <div className="booking-card-actions">
        {canPay && onPay && (
          <Button variant="secondary" onClick={() => onPay(booking.id)} disabled={isPaying}>
            {isPaying ? "Plaćanje u toku…" : "Simuliraj plaćanje"}
          </Button>
        )}
        {canCancel && onCancel && (
          <Button variant="danger" onClick={() => onCancel(booking.id)}>
            Otkaži
          </Button>
        )}
      </div>
    </Card>
  );
}
