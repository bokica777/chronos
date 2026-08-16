export const routes = {
  home: "/",
  providers: "/providers",
  providerDetail: (id: string) => `/providers/${id}`,
  services: "/services",
  serviceDetail: (id: string) => `/services/${id}`,
  manageServices: "/manage/services",
  profile: "/profile",
  bookings: "/bookings",
  login: "/login",
  register: "/register",
} as const;
