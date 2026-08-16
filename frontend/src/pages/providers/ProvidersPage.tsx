import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { ProviderList } from "../../features/providers/components/ProviderList";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import type { ApiProblem } from "../../models/api";
import type { Provider } from "../../models/provider";
import { providerService } from "../../services/providerService";

export function ProvidersPage() {
  useDocumentTitle("Pružaoci usluga");

  const [providers, setProviders] = useState<Provider[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const controller = new AbortController();

    providerService
      .getAll(controller.signal)
      .then((result) => {
        setProviders(result);
        setStatus("ready");
      })
      .catch((error: ApiProblem) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Neuspešno učitavanje pružaoca usluga.", error);
        setStatus("error");
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Ponuda"
        title="Izaberi pružaoca usluge"
        description="Pretraži dostupne pružaoce usluga i pogledaj detalje pre zakazivanja."
      />

      {status === "loading" && <div className="loading-spinner" />}

      {status === "error" && (
        <div className="empty-state">
          <p>Trenutno ne možemo da učitamo pružaoce usluga. Pokušaj ponovo malo kasnije.</p>
        </div>
      )}

      {status === "ready" && providers.length === 0 && (
        <div className="empty-state">
          <p>Trenutno nema dostupnih pružaoca usluga.</p>
        </div>
      )}

      {status === "ready" && providers.length > 0 && <ProviderList providers={providers} />}
    </>
  );
}
