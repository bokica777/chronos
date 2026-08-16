const dateTimeFormatter = new Intl.DateTimeFormat("sr-Latn-RS", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}

// Booking servis (Java) cuva LocalDateTime bez vremenske zone - "zidni" lokalni
// datum/vreme, isti format kao <input type="datetime-local"> ("YYYY-MM-DDTHH:mm").
// new Date("...") bez "Z" na kraju parsira string kao lokalno vreme u browseru,
// pa i ova funkcija mora da formatira nazad koristeci lokalne get* metode
// (ne toISOString, koji bi vratio UTC i pomerio sat za vremensku zonu).
export function toLocalDateTimeString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
