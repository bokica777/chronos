import { PageHeader } from "../../components/common/PageHeader";
import { BookingList } from "../../features/bookings/components/BookingList";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function BookingsPage() {
  useDocumentTitle("Moje rezervacije");

  return (
    <>
      <PageHeader
        eyebrow="Nalog"
        title="Moje rezervacije"
        description="Ovde će biti prikazane aktivne i prethodne rezervacije korisnika."
      />
      <BookingList bookings={[]} />
    </>
  );
}
