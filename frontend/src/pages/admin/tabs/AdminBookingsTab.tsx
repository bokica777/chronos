import { useEffect, useMemo, useState } from "react";
import type { Booking } from "../../../models/booking";
import type { Provider } from "../../../models/provider";
import type { Service } from "../../../models/service";
import { adminService } from "../../../services/adminService";
import { formatDateTime } from "../../../utils/date";

const statusLabels: Record<Booking["status"], string> = {
  PENDING: "Na čekanju",
  CONFIRMED: "Potvrđeno",
  CANCELLED: "Otkazano",
  COMPLETED: "Završeno",
};

export function AdminBookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      adminService.bookings.getAll(controller.signal),
      adminService.providers.getAll(controller.signal),
      adminService.services.getAll(controller.signal),
    ])
      .then(([bookingsResult, providersResult, servicesResult]) => {
        setBookings(bookingsResult);
        setProviders(providersResult);
        setServices(servicesResult);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const providersById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);

  if (status === "loading") return <div className="loading-spinner" />;
  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo rezervacije.</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="empty-state">
        <p>Još uvek nema rezervacija na platformi.</p>
      </div>
    );
  }

  const sorted = [...bookings].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  return (
    <ul className="service-manage-list">
      {sorted.map((booking) => (
        <li key={booking.id} className="card service-manage-row">
          <div className="service-manage-info">
            <p className="eyebrow">{statusLabels[booking.status]}</p>
            <h3>{servicesById.get(booking.serviceId)?.name ?? "Nepoznata usluga"}</h3>
            <p className="service-manage-meta">{providersById.get(booking.providerId)?.name ?? "Nepoznat partner"}</p>
            <p className="service-manage-meta">{formatDateTime(booking.startTime)}</p>
          </div>
          <div className="service-manage-actions">
            <p className="service-manage-meta">
              {booking.price} RSD
              {booking.penaltyAmount > 0 ? ` · penal ${booking.penaltyAmount} RSD` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
