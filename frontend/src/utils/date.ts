const dateTimeFormatter = new Intl.DateTimeFormat("sr-Latn-RS", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}
