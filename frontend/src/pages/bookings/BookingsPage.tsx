import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { BookingList } from "../../features/bookings/components/BookingList";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import type { Booking } from "../../models/booking";
import type { Payment } from "../../models/payment";
import type { Provider } from "../../models/provider";
import type { Service } from "../../models/service";
import { bookingService } from "../../services/bookingService";
import { paymentService } from "../../services/paymentService";
import { providerService } from "../../services/providerService";
import { serviceCatalogService } from "../../services/serviceCatalogService";
import { useAuth } from "../../store/useAuth";

export function BookingsPage() {
  useDocumentTitle("Moje rezervacije");

  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [services, setServices] = useState<Record<string, Service>>({});
  const [payments, setPayments] = useState<Record<string, Payment | null>>({});
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

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
      <PageHeader
        eyebrow="Nalog"
        title="Moje rezervacije"
        description="Ovde su prikazane tvoje aktivne i prethodne rezervacije."
      />
      <BookingList
        bookings={bookings}
        providers={providers}
        services={services}
        payments={payments}
        onCancel={handleCancel}
        onPay={handlePay}
        payingBookingId={payingBookingId}
      />
    </>
  );
}
