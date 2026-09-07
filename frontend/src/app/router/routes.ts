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

// Kuda se korisnik salje odmah posle uspesne prijave/registracije - Home
// stranica je za goste (marketing/pretraga), ne za nekog ko se vec ulogovao.
export function postAuthRedirectPath(role: "Client" | "Partner" | "Admin"): string {
  switch (role) {
    case "Client":
      return routes.bookings;
    case "Partner":
      return routes.manageServices;
    case "Admin":
      return routes.admin;
  }
}
