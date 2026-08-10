import { AppLayout } from "../../layouts/AppLayout";
import { AuthLayout } from "../../layouts/AuthLayout";
import { BookingsPage } from "../../pages/bookings/BookingsPage";
import { HomePage } from "../../pages/home/HomePage";
import { LoginPage } from "../../pages/login/LoginPage";
import { NotFoundPage } from "../../pages/not-found/NotFoundPage";
import { ProvidersPage } from "../../pages/providers/ProvidersPage";
import { routes } from "./routes";

export function AppRouter() {
  const path = window.location.pathname;

  if (path === routes.login) {
    return (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    );
  }

  const page = (() => {
    switch (path) {
      case routes.home:
        return <HomePage />;
      case routes.providers:
        return <ProvidersPage />;
      case routes.bookings:
        return <BookingsPage />;
      default:
        return <NotFoundPage />;
    }
  })();

  return <AppLayout>{page}</AppLayout>;
}
