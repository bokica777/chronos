import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { BookingList } from "../../features/bookings/components/BookingList";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import type { Booking } from "../../models/booking";
import { bookingService } from "../../services/bookingService";
import { providerService } from "../../services/providerService";
import { serviceCatalogService } from "../../services/serviceCatalogService";
import { useAuth } from "../../store/useAuth";

export function BookingsPage() {
  useDocumentTitle("Moje rezervacije");

  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
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
        // Booking servis zna samo ID-jeve provajdera/usluge - imena dovlačimo
        // naknadno sa provider-service da bi lista bila čitljiva.
        const providerIds = [...new Set(result.map((booking) => booking.providerId))];
        const providerNames = new Map<string, string>();
        const providerServices = new Map<string, { id: string; name: string }[]>();

        await Promise.all(
          providerIds.map(async (providerId) => {
            const [provider, services] = await Promise.all([
              providerService.getById(providerId, controller.signal),
              serviceCatalogService.getByProvider(providerId, controller.signal),
            ]);
            providerNames.set(providerId, provider.name);
            providerServices.set(providerId, services);
          }),
        );

        const enriched = result.map((booking) => ({
          ...booking,
          providerName: providerNames.get(booking.providerId),
          serviceName: providerServices
            .get(booking.providerId)
            ?.find((service) => service.id === booking.serviceId)?.name,
        }));

        setBookings(enriched);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });

    return () => controller.abort();
  }, [user]);

  const handleCancel = async (id: string) => {
    const updated = await bookingService.cancel(id);
    setBookings((current) =>
      current.map((booking) => (booking.id === id ? { ...booking, ...updated } : booking)),
    );
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
      <BookingList bookings={bookings} onCancel={handleCancel} />
    </>
  );
}
