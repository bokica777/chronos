import { routes } from "../../app/router/routes";
import { CalendarPreview } from "../../components/common/CalendarPreview";
import { PageHeader } from "../../components/common/PageHeader";
import { CategoryGrid } from "../../features/categories/components/CategoryGrid";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function HomePage() {
  useDocumentTitle("Početna");

  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div>
            <PageHeader eyebrow="Chronos" title="Zakaži termin brzo i jednostavno." />
            <div className="hero-actions">
              <a className="button button--primary" href={routes.login}>
                Prijavi se
              </a>
              <a className="button button--secondary" href={routes.providers}>
                Nastavi kao gost
              </a>
            </div>
          </div>
          <CalendarPreview />
        </div>
      </section>
      <CategoryGrid />
    </>
  );
}
