import { PageHeader } from "../../components/common/PageHeader";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function HomePage() {
  useDocumentTitle("Početna");

  return (
    <section className="hero">
      <PageHeader
        eyebrow="Chronos"
        title="Rezerviši vreme za ono što ti je važno."
        description="Pronađi pružaoca, izaberi slobodan termin i upravljaj svojim rezervacijama sa jednog mesta."
      />
      <a className="button button--primary" href="/providers">
        Pronađi termin
      </a>
    </section>
  );
}
