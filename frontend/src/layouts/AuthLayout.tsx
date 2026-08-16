import type { PropsWithChildren } from "react";
import { routes } from "../app/router/routes";
import { HourglassIcon } from "../components/common/HourglassIcon";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <a className="auth-brand" href={routes.home}>
          <HourglassIcon size={30} color="var(--color-primary)" />
          <span className="auth-brand-title">Chronos</span>
        </a>
        {children}
      </section>
      <a className="auth-back-link" href={routes.home}>
        Nazad na početnu
      </a>
    </main>
  );
}
