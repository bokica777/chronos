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

type StatusFilter = "all" | Booking["status"];
type SortOption = "newest" | "oldest" | "price-desc" | "price-asc";

const statusFilterLabels: Record<StatusFilter, string> = {
  all: "Svi statusi",
  ...statusLabels,
};

const sortLabels: Record<SortOption, string> = {
  newest: "Najnovije prvo",
  oldest: "Najstarije prvo",
  "price-desc": "Cena (opadajuće)",
  "price-asc": "Cena (rastuće)",
};

export function AdminBookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

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

  const query = searchQuery.trim().toLowerCase();
  const visibleBookings = bookings
    .filter((booking) => statusFilter === "all" || booking.status === statusFilter)
    .filter((booking) => {
      if (!query) return true;
      const service = servicesById.get(booking.serviceId);
      const provider = providersById.get(booking.providerId);
      return (
        (service?.name ?? "").toLowerCase().includes(query) ||
        (provider?.name ?? "").toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case "price-desc":
          return b.price - a.price;
        case "price-asc":
          return a.price - b.price;
        default:
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      }
    });

  return (
    <>
      <div className="services-toolbar">
        <input
          type="search"
          className="services-search-input"
          placeholder="Pretraži po usluzi ili partneru..."
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
        <select
          className="services-sort-select"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {visibleBookings.length === 0 ? (
        <div className="empty-state">
          <p>Nijedna rezervacija ne odgovara izabranim filterima.</p>
        </div>
      ) : (
        <ul className="service-manage-list">
          {visibleBookings.map((booking) => (
            <li key={booking.id} className="card service-manage-row">
              <div className="service-manage-info">
                <p className="eyebrow">{statusLabels[booking.status]}</p>
                <h3>{servicesById.get(booking.serviceId)?.name ?? "Nepoznata usluga"}</h3>
                <p className="service-manage-meta">
                  {providersById.get(booking.providerId)?.name ?? "Nepoznat partner"}
                </p>
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
      )}
    </>
  );
}
