import { useEffect, useState } from "react";
import { HourglassIcon } from "../common/HourglassIcon";
import { Navigation } from "./Navigation";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  // Nav bar postaje providan cim se stranica pomeri malo nadole.
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`site-header ${isScrolled ? "is-scrolled" : ""}`.trim()}>
      <div className="site-header-inner">
        <a className="brand-icon" href="/" aria-label="Chronos - početna">
          <HourglassIcon size={34} color={isScrolled ? "#0b2c5c" : "white"} />
        </a>
        <a className="brand-title" href="/">
          Chronos
        </a>
        <Navigation />
      </div>
    </header>
  );
}
