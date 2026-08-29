import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { BookingList } from "../../features/bookings/components/BookingList";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import type { Booking, BookingStatus } from "../../models/booking";
import type { Payment } from "../../models/payment";
import type { Provider } from "../../models/provider";
import type { Service } from "../../models/service";
import { bookingService } from "../../services/bookingService";
import { paymentService } from "../../services/paymentService";
import { providerService } from "../../services/providerService";
import { serviceCatalogService } from "../../services/serviceCatalogService";
import { useAuth } from "../../store/useAuth";

type StatusFilter = "ALL" | BookingStatus;

const statusFilterLabels: Record<StatusFilter, string> = {
  ALL: "Svi statusi",
  PENDING: "Na čekanju",
  CONFIRMED: "Potvrđeno",
  CANCELLED: "Otkazano",
  COMPLETED: "Završeno",
};

type SortOption = "newest" | "upcoming" | "price-asc" | "price-desc";

const sortLabels: Record<SortOption, string> = {
  newest: "Najnovije prvo",
  upcoming: "Termin uskoro",
  "price-asc": "Cena - rastuće",
  "price-desc": "Cena - opadajuće",
};

export function BookingsPage() {
  useDocumentTitle("Moje rezervacije");

  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [services, setServices] = useState<Record<string, Service>>({});
  const [payments, setPayments] = useState<Record<string, Payment | null>>({});
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    if (!user) {
      setStatus("ready");
      return;
    }

    const controller = new AbortController();

    bookingService
      .getMine(controller.signal)
      .then(async (result) => {
        // Booking servis zna samo ID-jeve provajdera/usluge - pune podatke
        // dovlačimo naknadno sa provider-service, da bi kartica mogla da
        // prikaže sve detalje bez dodatnog klika.
        const providerIds = [...new Set(result.map((booking) => booking.providerId))];
        const providersById: Record<string, Provider> = {};
        const servicesById: Record<string, Service> = {};

        await Promise.all(
          providerIds.map(async (providerId) => {
            const [provider, providerServices] = await Promise.all([
              providerService.getById(providerId, controller.signal),
              serviceCatalogService.getByProvider(providerId, controller.signal),
            ]);
            providersById[providerId] = provider;
            providerServices.forEach((service) => {
              servicesById[service.id] = service;
            });
          }),
        );

        const enriched = result.map((booking) => ({
          ...booking,
          providerName: providersById[booking.providerId]?.name,
          serviceName: servicesById[booking.serviceId]?.name,
        }));

        setBookings(enriched);
        setProviders(providersById);
        setServices(servicesById);
        setStatus("ready");

        // Status placanja se dovlaci odvojeno i ne blokira prikaz liste - ako
        // payment-service ne odgovori, rezervacije se svejedno vide.
        const paymentEntries = await Promise.all(
          enriched
            .filter((booking) => booking.status !== "CANCELLED")
            .map(async (booking) => [booking.id, await paymentService.getByBooking(booking.id, controller.signal)] as const),
        ).catch(() => []);
        if (!controller.signal.aborted) {
          setPayments(Object.fromEntries(paymentEntries));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });

    return () => controller.abort();
  }, [user]);

  // Korisnik se vratio sa Stripe Checkout stranice (success_url/cancel_url).
  // Webhook je pouzdaniji izvor istine, ali ovde odmah potvrdjujemo da ne
  // cekamo na njega dok korisnik gleda ekran.
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment");
    const paymentId = params.get("paymentId");
    if (!paymentResult || !paymentId) return;

    // Uklanjamo query parametre odmah da se potvrda ne bi ponovila pri refresh-u.
    window.history.replaceState(null, "", window.location.pathname);

    if (paymentResult === "success") {
      paymentService.confirmStripe(paymentId).then((updated) => {
        setPayments((current) => ({ ...current, [updated.bookingId]: updated }));
      });
    }
  }, [user]);

  const handleCancel = async (id: string) => {
    const updated = await bookingService.cancel(id);
    setBookings((current) =>
      current.map((booking) => (booking.id === id ? { ...booking, ...updated } : booking)),
    );
  };

  // Pravi Stripe Checkout tok: prvo kreiramo Payment zapis (ili dobijemo
  // postojeći), pa ako još nije završen, redirektujemo korisnika na Stripe-om
  // hostovanu stranicu za plaćanje test karticom.
  const handlePay = async (bookingId: string) => {
    const booking = bookings.find((item) => item.id === bookingId);
    if (!booking) return;

    setPayingBookingId(bookingId);
    try {
      const created = await paymentService.create({
        bookingId,
        amount: booking.price,
        currency: "RSD",
      });

      if (created.status !== "Pending") {
        setPayments((current) => ({ ...current, [bookingId]: created }));
        return;
      }

      const checkout = await paymentService.startCheckout(created.id);
      window.location.href = checkout.checkoutUrl;
    } finally {
      setPayingBookingId(null);
    }
  };

  // Najnovija rezervacija (po vremenu kreiranja) se blago istice na kartici -
  // racuna se iz PUNE liste, ne iz filtrirane/sortirane, da oznaka ne "nestane"
  // kad korisnik filtrira ili pretrazuje.
  const newestBookingId = useMemo(
    () =>
      bookings.length
        ? bookings.reduce((newest, booking) =>
            new Date(booking.createdAt) > new Date(newest.createdAt) ? booking : newest,
          ).id
        : null,
    [bookings],
  );

  const visibleBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let result = bookings;

    if (statusFilter !== "ALL") {
      result = result.filter((booking) => booking.status === statusFilter);
    }

    if (query) {
      result = result.filter(
        (booking) =>
          (booking.serviceName?.toLowerCase().includes(query) ?? false) ||
          (booking.providerName?.toLowerCase().includes(query) ?? false),
      );
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "upcoming":
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [bookings, searchQuery, statusFilter, sortBy]);

  if (!user) {
    return (
      <>
        <PageHeader eyebrow="Nalog" title="Moje rezervacije" description="Prijavi se da vidiš svoje rezervacije." />
        <div className="empty-state">
          <p>Moraš biti prijavljen da bi video svoje rezervacije.</p>
        </div>
      </>
    );
  }

  if (status === "loading") {
    return <div className="loading-spinner" />;
  }

  if (status === "error") {
    return (
      <div className="empty-state">
        <p>Trenutno ne možemo da učitamo tvoje rezervacije. Pokušaj ponovo malo kasnije.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Nalog" title="Moje rezervacije" />

      {bookings.length > 0 && (
        <div className="services-toolbar">
          <input
            type="search"
            className="services-search-input"
            placeholder="Pretraži po usluzi ili pružaocu..."
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
      )}

      {bookings.length > 0 && visibleBookings.length === 0 ? (
        <div className="empty-state">
          <p>Nema rezervacija koje odgovaraju izabranim filterima.</p>
        </div>
      ) : (
        <BookingList
          bookings={visibleBookings}
          providers={providers}
          services={services}
          payments={payments}
          newestBookingId={newestBookingId}
          onCancel={handleCancel}
          onPay={handlePay}
          payingBookingId={payingBookingId}
        />
      )}
    </>
  );
}
