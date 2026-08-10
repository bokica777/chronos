import { Navigation } from "./Navigation";

export function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="/">
        Chronos
      </a>
      <Navigation />
    </header>
  );
}
