import { useEffect, useMemo, useState } from "react";
import type { Booking } from "../../../models/booking";
import type { Payment } from "../../../models/payment";
import type { Provider } from "../../../models/provider";
import type { Service } from "../../../models/service";
import type { User } from "../../../models/user";
import { adminService } from "../../../services/adminService";
import { formatDateTime } from "../../../utils/date";

const statusLabels: Record<Payment["status"], string> = {
  Pending: "U toku",
  Completed: "Plaćeno",
  Failed: "Neuspešno",
  Refunded: "Refundirano",
};

type StatusFilter = "all" | Payment["status"];

const statusFilterLabels: Record<StatusFilter, string> = {
  all: "Svi statusi",
  ...statusLabels,
};

export function AdminPaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      adminService.payments.getAll(controller.signal),
      adminService.bookings.getAll(controller.signal),
      adminService.providers.getAll(controller.signal),
      adminService.services.getAll(controller.signal),
      adminService.users.getAll(controller.signal),
    ])
      .then(([paymentsResult, bookingsResult, providersResult, servicesResult, usersResult]) => {
        setPayments(paymentsResult);
        setBookings(bookingsResult);
        setProviders(providersResult);
        setServices(servicesResult);
        setUsers(usersResult);
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
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

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

  const query = searchQuery.trim().toLowerCase();
  const visiblePayments = payments
    .filter((payment) => statusFilter === "all" || payment.status === statusFilter)
    .filter((payment) => {
      if (!query) return true;
      const booking = bookingsById.get(payment.bookingId);
      const serviceName = booking ? servicesById.get(booking.serviceId)?.name : undefined;
      const providerName = booking ? providersById.get(booking.providerId)?.name : undefined;
      const customer = booking ? usersById.get(booking.customerId) : undefined;
      return [serviceName, providerName, customer?.displayName, customer?.email].some((value) =>
        (value ?? "").toLowerCase().includes(query),
      );
    })
    .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime());

  return (
    <>
      <div className="services-toolbar">
        <input
          type="search"
          className="services-search-input"
          placeholder="Pretraži po usluzi, partneru ili korisniku..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <select
          className="services-sort-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        >
          {Object.entries(statusFilterLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {visiblePayments.length === 0 ? (
        <div className="empty-state">
          <p>Nijedno plaćanje ne odgovara izabranim filterima.</p>
        </div>
      ) : (
        <ul className="service-manage-list">
          {visiblePayments.map((payment) => {
            const booking = bookingsById.get(payment.bookingId);
            const serviceName = booking ? servicesById.get(booking.serviceId)?.name : undefined;
            const providerName = booking ? providersById.get(booking.providerId)?.name : undefined;
            const customer = booking ? usersById.get(booking.customerId) : undefined;

            return (
              <li key={payment.id} className="card service-manage-row">
                <div className="service-manage-info">
                  <p className="eyebrow">{serviceName ?? "Nepoznata usluga"}</p>
                  <h3>
                    {payment.amount} {payment.currency}
                  </h3>
                  <p className="service-manage-meta">
                    Od: {customer?.displayName ?? "Nepoznat korisnik"}
                    {customer?.email ? ` (${customer.email})` : ""}
                  </p>
                  <p className="service-manage-meta">Ka: {providerName ?? "Nepoznat partner"}</p>
                  <p className="service-manage-meta">
                    Način plaćanja: Stripe (test) · {formatDateTime(payment.createdAtUtc)}
                  </p>
                  {booking && (
                    <p className="service-manage-meta">Termin: {formatDateTime(booking.startTime)}</p>
                  )}
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
      )}
    </>
  );
}
