import { routes } from "../../app/router/routes";
import { useAuth } from "../../store/useAuth";

export function Navigation() {
  const { user } = useAuth();

  return (
    <nav aria-label="Glavna navigacija">
      <a href={routes.providers}>Pružaoci</a>
      <a href={routes.bookings}>Moje rezervacije</a>
      <a href={routes.login}>{user ? user.displayName : "Prijava"}</a>
    </nav>
  );
}
