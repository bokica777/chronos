import type { PropsWithChildren } from "react";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-layout">
      <a className="brand" href="/">
        Chronos
      </a>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
