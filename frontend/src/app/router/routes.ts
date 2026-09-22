export const routes = {
  home: "/",
  providers: "/providers",
  providerDetail: (id: string) => `/providers/${id}`,
  services: "/services",
  serviceDetail: (id: string) => `/services/${id}`,
  manageServices: "/manage/services",
  admin: "/admin",
  profile: "/profile",
  bookings: "/bookings",
  login: "/login",
  register: "/register",
} as const;

// "?returnTo=/services/..." - kad gost (npr. posle skeniranja QR koda usluge)
// klikne "Rezervisi", salje se na prijavu i posle nje VRACA na istu uslugu,
// umesto na podrazumevanu stranicu svoje uloge.
export function loginWithReturn(returnTo: string): string {
  return `${routes.login}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function readReturnTo(): string | null {
  const value = new URLSearchParams(window.location.search).get("returnTo");
  // Samo relativne putanje unutar aplikacije (ne "//drugi-sajt.com" ili "https://...").
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

// Kuda se korisnik salje odmah posle uspesne prijave/registracije - Home
// stranica je za goste (marketing/pretraga), ne za nekog ko se vec ulogovao.
// Klijent se vraca na returnTo ako postoji (rezervacija preko QR koda).
export function postAuthRedirectPath(role: "Client" | "Partner" | "Admin", returnTo?: string | null): string {
  if (role === "Client" && returnTo) {
    return returnTo;
  }
  switch (role) {
    case "Client":
      return routes.bookings;
    case "Partner":
      return routes.manageServices;
    case "Admin":
      return routes.admin;
  }
}
