import { useEffect, useState } from "react";
import { routes } from "../../app/router/routes";
import { authService } from "../../services/authService";
import { bookingService } from "../../services/bookingService";
import { resolveImageUrl } from "../../utils/media";
import { useAuth } from "../../store/useAuth";

function UserAvatarIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

export function Navigation() {
  const { user, setUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeBookingCount, setActiveBookingCount] = useState<number | null>(null);

  // Broj aktivnih (ne otkazanih) rezervacija - samo za Klijenta, ostale uloge
  // nemaju rezervacije na svoje ime.
  useEffect(() => {
    if (!user || user.role !== "Client") {
      setActiveBookingCount(null);
      return;
    }

    const controller = new AbortController();
    bookingService
      .getMine(controller.signal)
      .then((bookings) => {
        const active = bookings.filter((booking) => booking.status !== "CANCELLED").length;
        setActiveBookingCount(active);
      })
      .catch(() => {
        if (!controller.signal.aborted) setActiveBookingCount(null);
      });
    return () => controller.abort();
  }, [user]);

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
      {user && (
        <a href={routes.profile} className="nav-user-chip" title="Moj profil">
          <span className="nav-user-avatar">
            {user.imageUrl ? <img src={resolveImageUrl(user.imageUrl)} alt="" /> : <UserAvatarIcon />}
          </span>
          <span className="nav-user-name">{user.displayName}</span>
          {activeBookingCount !== null && (
            <span className="nav-user-badge" title="Aktivne rezervacije">
              {activeBookingCount}
            </span>
          )}
        </a>
      )}
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
              {user.role === "Partner" && (
                <a href={routes.manageServices} onClick={() => setIsOpen(false)}>
                  Menadžer usluga
                </a>
              )}
              {user.role === "Client" && (
                <a href={routes.bookings} onClick={() => setIsOpen(false)}>
                  Moje rezervacije
                </a>
              )}
              {user.role === "Admin" && (
                <a href={routes.admin} onClick={() => setIsOpen(false)}>
                  Admin panel
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
