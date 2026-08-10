import { PageHeader } from "../../components/common/PageHeader";
import type { Provider } from "../../models/provider";
import { ProviderList } from "../../features/providers/components/ProviderList";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const previewProviders: Provider[] = [
  {
    id: "preview-1",
    ownerId: "preview-owner",
    name: "Studio Aurora",
    description: "Početni prikaz dok ne povežemo Provider API.",
  },
];

export function ProvidersPage() {
  useDocumentTitle("Pružaoci usluga");

  return (
    <>
      <PageHeader
        eyebrow="Ponuda"
        title="Izaberi pružaoca usluge"
        description="Pretraživanje i filteri biće povezani sa Provider servisom."
      />
      <ProviderList providers={previewProviders} />
    </>
  );
}
