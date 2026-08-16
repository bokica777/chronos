import { useState } from "react";
import { routes } from "../../app/router/routes";
import { authService } from "../../services/authService";
import { useAuth } from "../../store/useAuth";

export function Navigation() {
  const { user, setUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem("chronos.token");
      setUser(null);
      window.location.assign(routes.home);
    }
  };

  return (
    <nav className="nav" aria-label="Glavna navigacija">
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={isOpen}
        aria-label="Otvori meni"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      {isOpen && (
        <div className="nav-menu">
          <a href={routes.services} onClick={() => setIsOpen(false)}>
            Usluge
          </a>
          {user ? (
            <>
              {user.role === "Partner" ? (
                <a href={routes.manageServices} onClick={() => setIsOpen(false)}>
                  Menadžer usluga
                </a>
              ) : (
                <a href={routes.bookings} onClick={() => setIsOpen(false)}>
                  Moje rezervacije
                </a>
              )}
              <a href={routes.profile} onClick={() => setIsOpen(false)}>
                Profil
              </a>
              <button type="button" className="nav-menu-action" onClick={handleLogout}>
                Odjava
              </button>
            </>
          ) : (
            <a href={routes.login} onClick={() => setIsOpen(false)}>
              Prijava
            </a>
          )}
        </div>
      )}
    </nav>
  );
}
