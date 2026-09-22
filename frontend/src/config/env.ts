const removeTrailingSlash = (value: string) => value.replace(/\/$/, "");

export const env = {
  apiBaseUrl: removeTrailingSlash(
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000",
  ),
  // Adresa frontenda koja se upisuje u QR kod usluge. Podrazumevano trenutna
  // adresa u browseru; za skeniranje telefonom postavi npr.
  // VITE_PUBLIC_APP_URL=http://192.168.1.10:5173 (localhost na telefonu ne radi).
  publicAppUrl: removeTrailingSlash(
    import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin,
  ),
} as const;
