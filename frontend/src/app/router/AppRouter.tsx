import { AppLayout } from "../../layouts/AppLayout";
import { AuthLayout } from "../../layouts/AuthLayout";
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
import { routes } from "./routes";

export function AppRouter() {
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
      case routes.profile:
        return <ProfilePage />;
      default:
        return <NotFoundPage />;
    }
  })();

  return <AppLayout>{page}</AppLayout>;
}
