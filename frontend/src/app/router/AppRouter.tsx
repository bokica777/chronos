import { AppLayout } from "../../layouts/AppLayout";
import { AuthLayout } from "../../layouts/AuthLayout";
import { AdminPage } from "../../pages/admin/AdminPage";
import { BookingsPage } from "../../pages/bookings/BookingsPage";
import { HomePage } from "../../pages/home/HomePage";
import { LoginPage } from "../../pages/login/LoginPage";
import { ManageServicesPage } from "../../pages/manage-services/ManageServicesPage";
import { NotFoundPage } from "../../pages/not-found/NotFoundPage";
import { ProfilePage } from "../../pages/profile/ProfilePage";
import { ProviderDetailPage } from "../../pages/providers/ProviderDetailPage";
import { ProvidersPage } from "../../pages/providers/ProvidersPage";
import { RegisterPage } from "../../pages/register/RegisterPage";
import { ServiceDetailPage } from "../../pages/services/ServiceDetailPage";
import { ServicesPage } from "../../pages/services/ServicesPage";
import { postAuthRedirectPath, routes } from "./routes";
import { useAuth } from "../../store/useAuth";
import type { UserRole } from "../../models/user";

// Rute koje zahtevaju prijavu, i (za neke) tacno odredjenu ulogu. Bez ovoga,
// npr. "Moje rezervacije" je bila direktno dostupna i sa ustajalim/nevazecim
// tokenom (httpClient bi tek NAKON neuspesnog API poziva otkrio problem) ili
// bez ikakve prijave - stranica bi samo ostala u "ne moze da se ucita" stanju
// umesto da odmah vrati na login.
const protectedRoutes: Partial<Record<string, UserRole[]>> = {
  [routes.bookings]: ["Client"],
  [routes.manageServices]: ["Partner"],
  [routes.admin]: ["Admin"],
  [routes.profile]: ["Client", "Partner", "Admin"],
};

export function AppRouter() {
  const { user } = useAuth();
  const path = window.location.pathname;

  const providerDetailMatch = path.match(/^\/providers\/([^/]+)$/);
  const serviceDetailMatch = path.match(/^\/services\/([^/]+)$/);

  if (path === routes.login) {
    return (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    );
  }

  if (path === routes.register) {
    return (
      <AuthLayout>
        <RegisterPage />
      </AuthLayout>
    );
  }

  const allowedRoles = protectedRoutes[path];
  if (allowedRoles) {
    if (!user) {
      return (
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      );
    }
    if (!allowedRoles.includes(user.role)) {
      // Ulogovan, ali pogresna uloga za ovu rutu (npr. Client na /admin) -
      // vracamo ga na NJEGOVU podrazumevanu stranicu, ne na prazan 404.
      window.location.assign(postAuthRedirectPath(user.role));
      return null;
    }
  }

  const page = (() => {
    if (providerDetailMatch) {
      return <ProviderDetailPage providerId={providerDetailMatch[1]} />;
    }

    if (serviceDetailMatch) {
      return <ServiceDetailPage serviceId={serviceDetailMatch[1]} />;
    }

    switch (path) {
      case routes.home:
        return <HomePage />;
      case routes.providers:
        return <ProvidersPage />;
      case routes.services:
        return <ServicesPage />;
      case routes.bookings:
        return <BookingsPage />;
      case routes.manageServices:
        return <ManageServicesPage />;
      case routes.admin:
        return <AdminPage />;
      case routes.profile:
        return <ProfilePage />;
      default:
        return <NotFoundPage />;
    }
  })();

  return <AppLayout>{page}</AppLayout>;
}
