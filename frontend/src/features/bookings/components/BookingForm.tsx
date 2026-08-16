import { useEffect, useMemo, useState } from "react";
import { routes } from "../../../app/router/routes";
import { Button } from "../../../components/common/Button";
import type { ApiProblem } from "../../../models/api";
import type { Booking } from "../../../models/booking";
import type { Service } from "../../../models/service";
import { bookingService } from "../../../services/bookingService";
import { useAuth } from "../../../store/useAuth";

type BookingFormProps = {
  service: Service;
  providerId: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
};

// Podrazumevano radno vreme ako partner nije popunio svoje u profilu.
const DEFAULT_START_MINUTES = 8 * 60;
const DEFAULT_END_MINUTES = 20 * 60;

function parseTimeToMinutes(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;
  return hours * 60 + minutes;
}

const weekdayLabels = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];

const monthFormatter = new Intl.DateTimeFormat("sr-Latn-RS", { month: "long", year: "numeric" });

function toDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function minutesToLabel(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getMonthGrid(monthDate: Date): (Date | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = ponedeljak

  const grid: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) grid.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) grid.push(new Date(year, month, day));
  return grid;
}

type Slot = { minutes: number; label: string; isTaken: boolean; isPast: boolean };

function computeSlots(
  dateKey: string,
  durationMinutes: number,
  bookings: Booking[],
  startMinutes: number,
  endMinutes: number,
): Slot[] {
  const [year, month, day] = dateKey.split("-").map(Number);
  const now = new Date();
  const isToday = toDateKey(now) === dateKey;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const dayBookings = bookings.filter((booking) => toDateKey(new Date(booking.startTime)) === dateKey);

  const slots: Slot[] = [];
  for (let minutes = startMinutes; minutes + durationMinutes <= endMinutes; minutes += durationMinutes) {
    const slotStart = new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, 0);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
    const isTaken = dayBookings.some((booking) => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      return slotStart < bookingEnd && bookingStart < slotEnd;
    });
    slots.push({ minutes, label: minutesToLabel(minutes), isTaken, isPast: isToday && minutes <= nowMinutes });
  }
  return slots;
}

// "Zakaži" dugme -> kalendar (mesecni prikaz, slobodni/zauzeti dani) -> grid
// termina za izabrani dan, u koracima jednakim trajanju usluge. Koristi se i
// na ProviderDetailPage (po usluzi u listi) i na ServiceDetailPage.
export function BookingForm({ service, providerId, workingHoursStart, workingHoursEnd }: BookingFormProps) {
  const { user } = useAuth();
  const startMinutes = parseTimeToMinutes(workingHoursStart, DEFAULT_START_MINUTES);
  const endMinutes = parseTimeToMinutes(workingHoursEnd, DEFAULT_END_MINUTES);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingBookings(true);
    bookingService
      .getByProvider(providerId, controller.signal)
      .then((result) => setBookings(result))
      .catch(() => {
        if (!controller.signal.aborted) setError("Ne mogu da učitam zauzete termine. Pokušaj ponovo.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingBookings(false);
      });
    return () => controller.abort();
  }, [providerId]);

  const monthGrid = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const canGoPrevMonth =
    currentMonth.getFullYear() > today.getFullYear() ||
    (currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() > today.getMonth());

  const slotsForSelectedDate = useMemo(
    () =>
      selectedDate
        ? computeSlots(selectedDate, service.durationMinutes, bookings, startMinutes, endMinutes)
        : [],
    [selectedDate, service.durationMinutes, bookings, startMinutes, endMinutes],
  );

  const clearSelection = () => {
    setSelectedDate(null);
    setSelectedMinutes(null);
    setError(null);
  };

  const selectDay = (date: Date) => {
    setSelectedDate(toDateKey(date));
    setSelectedMinutes(null);
  };

  const handleConfirm = async () => {
    if (!user) {
      window.location.href = routes.login;
      return;
    }
    if (!selectedDate || selectedMinutes === null) return;

    setIsSaving(true);
    setError(null);
    try {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const start = new Date(year, month - 1, day, Math.floor(selectedMinutes / 60), selectedMinutes % 60, 0);
      const end = new Date(start.getTime() + service.durationMinutes * 60000);
      const pad = (value: number) => String(value).padStart(2, "0");
      const toLocalString = (date: Date) =>
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

      await bookingService.create({
        providerId,
        serviceId: service.id,
        startTime: toLocalString(start),
        endTime: toLocalString(end),
        price: service.price,
        idempotencyKey: crypto.randomUUID(),
      });
      window.location.href = routes.bookings;
    } catch (err) {
      const problem = err as ApiProblem;
      setError(
        problem.status === 409
          ? "Taj termin se u međuvremenu zauzeo. Izaberi drugi."
          : "Zakazivanje nije uspelo. Proveri podatke i pokušaj ponovo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="booking-picker">
      {error && <p className="form-error">{error}</p>}

      <div className="booking-calendar">
        <div className="booking-calendar-header">
          <button
            type="button"
            className="booking-calendar-nav"
            disabled={!canGoPrevMonth}
            onClick={() => setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            ‹
          </button>
          <span className="booking-calendar-title">{monthFormatter.format(currentMonth)}</span>
          <button
            type="button"
            className="booking-calendar-nav"
            onClick={() => setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            ›
          </button>
        </div>

        <div className="booking-calendar-weekdays">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="booking-calendar-grid">
          {monthGrid.map((date, index) => {
            if (!date) return <span key={`blank-${index}`} />;

            const dateKey = toDateKey(date);
            const isPastDay = startOfDay(date) < today;
            const daySlots = isPastDay
              ? []
              : computeSlots(dateKey, service.durationMinutes, bookings, startMinutes, endMinutes);
            const hasFreeSlot = daySlots.some((slot) => !slot.isPast && !slot.isTaken);
            const isSelected = selectedDate === dateKey;

            let className = "booking-calendar-day";
            if (isPastDay) className += " is-past";
            else if (isSelected) className += " is-selected";
            else if (hasFreeSlot) className += " is-available";
            else className += " is-full";

            return (
              <button
                key={dateKey}
                type="button"
                className={className}
                disabled={isPastDay || !hasFreeSlot}
                onClick={() => selectDay(date)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="booking-calendar-legend">
          <span className="booking-legend-item">
            <span className="booking-legend-dot is-available" /> slobodno
          </span>
          <span className="booking-legend-item">
            <span className="booking-legend-dot is-full" /> zauzeto
          </span>
        </div>
      </div>

      {selectedDate && (
        <div className="booking-slots">
          <p className="booking-slots-label">Slobodni termini ({service.durationMinutes} min)</p>
          {isLoadingBookings ? (
            <p>Učitavanje termina...</p>
          ) : slotsForSelectedDate.every((slot) => slot.isTaken || slot.isPast) ? (
            <p>Nema slobodnih termina ovog dana.</p>
          ) : (
            <div className="booking-slot-grid">
              {slotsForSelectedDate.map((slot) => (
                <button
                  key={slot.minutes}
                  type="button"
                  className={`booking-slot${selectedMinutes === slot.minutes ? " is-selected" : ""}`}
                  disabled={slot.isTaken || slot.isPast}
                  onClick={() => setSelectedMinutes(slot.minutes)}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="booking-inline-actions">
        <Button type="button" disabled={selectedMinutes === null || isSaving} onClick={handleConfirm}>
          {isSaving ? "Zakazivanje..." : "Potvrdi termin"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!selectedDate && selectedMinutes === null}
          onClick={clearSelection}
        >
          Otkaži izbor
        </Button>
      </div>
    </div>
  );
}
