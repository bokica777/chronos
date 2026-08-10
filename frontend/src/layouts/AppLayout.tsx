import type { PropsWithChildren } from "react";
import { Footer } from "../components/navigation/Footer";
import { Header } from "../components/navigation/Header";

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="app-layout">
      <Header />
      <main className="page-container">{children}</main>
      <Footer />
    </div>
  );
}
