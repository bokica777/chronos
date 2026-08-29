import { useEffect, useState } from "react";
import { routes } from "../../../app/router/routes";
import { Button } from "../../../components/common/Button";
import { Card } from "../../../components/common/Card";
import type { Booking } from "../../../models/booking";
import type { Payment } from "../../../models/payment";
import type { Provider } from "../../../models/provider";
import type { Service } from "../../../models/service";
import { resolveImageUrl } from "../../../utils/media";
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
  provider?: Provider;
  service?: Service;
  payment?: Payment | null;
  isNewest?: boolean;
  onCancel?: (id: string) => void;
  onPay?: (id: string) => void;
  isPaying?: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// "2d 05:12:33" ili "05:12:33" ako je manje od dana - racuna se na frontu,
// osvezava svake sekunde (vidi useEffect ispod).
function formatCountdown(diffMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function BookingCard({
  booking,
  provider,
  service,
  payment,
  isNewest,
  onCancel,
  onPay,
  isPaying,
}: BookingCardProps) {
  const canCancel = booking.status !== "CANCELLED" && booking.status !== "COMPLETED";
  const canPay = booking.status !== "CANCELLED" && payment?.status !== "Completed";

  const startTime = new Date(booking.startTime);
  const [now, setNow] = useState(() => new Date());

  const isUpcoming = booking.status !== "CANCELLED" && startTime.getTime() > now.getTime();
  const isPast = !isUpcoming;

  // Tajmer do pocetka termina - azurira se svake sekunde, samo dok je termin
  // predstojeci (nema smisla da kuca kad je prosao ili otkazan).
  useEffect(() => {
    if (!isUpcoming) return;
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [isUpcoming]);

  let cardClassName = "booking-row";
  if (isPast) cardClassName += " is-past";
  if (isNewest && !isPast) cardClassName += " is-newest";

  return (
    <Card className={cardClassName}>
      <div className="booking-row-col booking-row-service">
        <div className="booking-row-top">
          <span className={`booking-status-badge booking-status-badge--${booking.status.toLowerCase()}`}>
            {statusLabels[booking.status]}
          </span>
          {isUpcoming && (
            <span className="booking-countdown">
              Za: {formatCountdown(startTime.getTime() - now.getTime())}
            </span>
          )}
        </div>

        <div className="booking-row-service-body">
          {service?.imageUrl && (
            <img
              className="booking-row-thumb"
              src={resolveImageUrl(service.imageUrl)}
              alt={service.name}
            />
          )}
          <div>
            <h2>{booking.serviceName ?? "Usluga"}</h2>
            <p className="booking-row-time">{formatDateTime(booking.startTime)}</p>
            {service?.description && <p className="booking-row-description">{service.description}</p>}
            {service?.note && <p className="booking-row-note">Napomena: {service.note}</p>}
            <p className="service-manage-meta">
              {service?.durationMinutes ?? ""} {service?.durationMinutes ? "min · " : ""}
              {booking.price} RSD
              {booking.penaltyAmount > 0 ? ` · penal ${booking.penaltyAmount} RSD` : ""}
            </p>
          </div>
        </div>

        <div className="booking-row-actions">
          {payment && (
            <span
              className={`visibility-badge visibility-badge--${
                payment.status === "Completed" ? "visible" : "hidden"
              }`}
            >
              {paymentStatusLabels[payment.status]}
            </span>
          )}
          {canPay && onPay && (
            <Button variant="secondary" onClick={() => onPay(booking.id)} disabled={isPaying}>
              {isPaying ? "Plaćanje u toku…" : "Plati"}
            </Button>
          )}
          {canCancel && onCancel && (
            <Button variant="danger" onClick={() => onCancel(booking.id)}>
              Otkaži
            </Button>
          )}
        </div>
      </div>

      <div className="booking-row-col booking-row-provider">
        {provider ? (
          <>
            <div className="booking-row-provider-header">
              {provider.imageUrl && (
                <img
                  className="booking-row-thumb booking-row-thumb--round"
                  src={resolveImageUrl(provider.imageUrl)}
                  alt={provider.name}
                />
              )}
              <a
                className="booking-row-provider-name"
                href={routes.providerDetail(provider.id)}
              >
                {provider.name}
              </a>
            </div>
            {provider.address && <p>{provider.address}</p>}
            {provider.contactPhone && <p>Tel: {provider.contactPhone}</p>}
            {provider.contactEmail && <p>{provider.contactEmail}</p>}
            {(provider.workingHoursStart || provider.workingHoursEnd) && (
              <p className="service-manage-meta">
                Radno vreme: {provider.workingHoursStart ?? "?"}–{provider.workingHoursEnd ?? "?"}
              </p>
            )}
          </>
        ) : (
          <p className="service-manage-meta">{booking.providerName ?? "Pružalac usluge"}</p>
        )}
      </div>
    </Card>
  );
}
