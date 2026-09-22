import { useEffect, useMemo, useState } from "react";
import type { Booking } from "../../../models/booking";
import type { Notification } from "../../../models/notification";
import type { Provider } from "../../../models/provider";
import type { Service } from "../../../models/service";
import type { User } from "../../../models/user";
import { adminService } from "../../../services/adminService";
import { formatDateTime } from "../../../utils/date";

const typeLabels: Record<Notification["type"], string> = {
  BOOKING_CREATED: "Rezervacija kreirana",
  BOOKING_CANCELLED: "Rezervacija otkazana",
  BOOKING_PAYMENT_CONFIRMED: "Uplata potvrđena",
};

type StatusFilter = "all" | Notification["status"];

const statusFilterLabels: Record<StatusFilter, string> = {
  all: "Svi statusi",
  SENT: "Poslato",
  FAILED: "Neuspešno",
};

export function AdminNotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
      adminService.notifications.getAll(controller.signal),
      adminService.bookings.getAll(controller.signal),
      adminService.providers.getAll(controller.signal),
      adminService.services.getAll(controller.signal),
      adminService.users.getAll(controller.signal),
    ])
      .then(([notificationsResult, bookingsResult, providersResult, servicesResult, usersResult]) => {
        setNotifications(notificationsResult);
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
        <p>Trenutno ne možemo da učitamo obaveštenja.</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="empty-state">
        <p>Notification servis još nije obradio nijedan događaj.</p>
      </div>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleNotifications = notifications
    .filter((notification) => statusFilter === "all" || notification.status === statusFilter)
    .filter((notification) => {
      if (!query) return true;
      const booking = bookingsById.get(notification.bookingId);
      const customer = usersById.get(notification.customerId);
      const serviceName = booking ? servicesById.get(booking.serviceId)?.name : undefined;
      const providerName = booking ? providersById.get(booking.providerId)?.name : undefined;
      return [customer?.displayName, customer?.email, serviceName, providerName].some((value) =>
        (value ?? "").toLowerCase().includes(query),
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <p className="service-manage-meta" style={{ marginBottom: "0.75rem" }}>
        Svaka stavka je obaveštenje koje notification-servis nezavisno generiše kad booking-servis objavi događaj
        preko RabbitMQ-a (van transakcije zakazivanja). Kanal je uvek "EMAIL", ali slanje je za potrebe rada
        simulirano — obaveštenje se samo beleži u log, ne šalje se pravi mejl.
      </p>
      <div className="services-toolbar">
        <input
          type="search"
          className="services-search-input"
          placeholder="Pretraži po korisniku, usluzi ili partneru..."
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

      {visibleNotifications.length === 0 ? (
        <div className="empty-state">
          <p>Nijedno obaveštenje ne odgovara izabranim filterima.</p>
        </div>
      ) : (
        <ul className="service-manage-list">
          {visibleNotifications.map((notification) => {
            const booking = bookingsById.get(notification.bookingId);
            const customer = usersById.get(notification.customerId);
            const serviceName = booking ? servicesById.get(booking.serviceId)?.name : undefined;
            const providerName = booking ? providersById.get(booking.providerId)?.name : undefined;

            return (
              <li key={notification.id} className="card service-manage-row">
                <div className="service-manage-info">
                  <p className="eyebrow">{typeLabels[notification.type]}</p>
                  <h3>{notification.message}</h3>
                  <p className="service-manage-meta">
                    Za: {customer?.displayName ?? "Nepoznat korisnik"}
                    {customer?.email ? ` (${customer.email})` : ""}
                  </p>
                  {(serviceName || providerName) && (
                    <p className="service-manage-meta">
                      {serviceName ?? "Nepoznata usluga"} · {providerName ?? "Nepoznat partner"}
                    </p>
                  )}
                  <p className="service-manage-meta">
                    Kanal: {notification.channel} (simulirano) · {formatDateTime(notification.createdAt)}
                  </p>
                </div>
                <div className="service-manage-actions">
                  <span
                    className={`visibility-badge visibility-badge--${
                      notification.status === "SENT" ? "visible" : "hidden"
                    }`}
                  >
                    {notification.status === "SENT" ? "Poslato" : "Neuspešno"}
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
