import { useEffect, useMemo, useState } from "react";
import type { Booking } from "../../../models/booking";
import type { Payment } from "../../../models/payment";
import type { Provider } from "../../../models/provider";
import type { Service } from "../../../models/service";
import { adminService } from "../../../services/adminService";

const statusLabels: Record<Payment["status"], string> = {
  Pending: "U toku",
  Completed: "Plaćeno",
  Failed: "Neuspešno",
  Refunded: "Refundirano",
};

export function AdminPaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      adminService.payments.getAll(controller.signal),
      adminService.bookings.getAll(controller.signal),
      adminService.providers.getAll(controller.signal),
      adminService.services.getAll(controller.signal),
    ])
      .then(([paymentsResult, bookingsResult, providersResult, servicesResult]) => {
        setPayments(paymentsResult);
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

  const bookingsById = useMemo(() => new Map(bookings.map((booking) => [booking.id, booking])), [bookings]);
  const providersById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);

  if (status === "loading") return <div className="loading-spinner" />;
  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo plaćanja.</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="empty-state">
        <p>Još uvek nema pokrenutih plaćanja na platformi.</p>
      </div>
    );
  }

  return (
    <ul className="service-manage-list">
      {payments.map((payment) => {
        const booking = bookingsById.get(payment.bookingId);
        const serviceName = booking ? servicesById.get(booking.serviceId)?.name : undefined;
        const providerName = booking ? providersById.get(booking.providerId)?.name : undefined;

        return (
          <li key={payment.id} className="card service-manage-row">
            <div className="service-manage-info">
              <p className="eyebrow">{serviceName ?? "Nepoznata usluga"}</p>
              <h3>
                {payment.amount} {payment.currency}
              </h3>
              <p className="service-manage-meta">{providerName ?? "Nepoznat partner"}</p>
            </div>
            <div className="service-manage-actions">
              <span
                className={`visibility-badge visibility-badge--${
                  payment.status === "Completed" ? "visible" : "hidden"
                }`}
              >
                {statusLabels[payment.status]}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
